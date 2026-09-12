require "net/http"
require "json"

module Quip
  # Ruby port of quip-export's QuipClient.swift — same endpoints, same
  # rate-limit-aware retry (a 429, or a 503 whose body reads "Over Rate
  # Limit", both get a Retry-After-aware backoff instead of failing the
  # whole run), same auth-error detection. No response caching here (unlike
  # the Swift version) — a one-off import run doesn't re-fetch the same
  # path twice the way repeated interactive scans would.
  class Client
    MAX_RETRIES = 5

    def initialize(token:, domain: "quip.com")
      @token = token
      @base = URI("https://platform.#{domain}/1")
    end

    def current_user
      get("/users/current")
    end

    def folder(id)
      get("/folders/#{id}")
    end

    def thread(id)
      get("/threads/#{id}")
    end

    def blob(thread_id:, blob_hash:)
      get_raw("/threads/#{thread_id}/blob/#{blob_hash}")
    end

    private

    def get(path)
      JSON.parse(get_raw(path))
    end

    def get_raw(path)
      uri = URI.join(@base.to_s + "/", path.delete_prefix("/"))
      attempt = 0
      loop do
        res = request(uri)
        if rate_limited?(res) && attempt < MAX_RETRIES
          sleep(retry_delay(res, attempt))
          attempt += 1
          next
        end
        return res.body if res.is_a?(Net::HTTPSuccess)

        raise_for(res, path)
      end
    end

    def request(uri)
      req = Net::HTTP::Get.new(uri)
      req["Authorization"] = "Bearer #{@token}"
      Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(req) }
    end

    def rate_limited?(res)
      return true if res.code == "429"

      res.code == "503" && res.body.to_s.include?("Rate Limit")
    end

    def retry_delay(res, attempt)
      retry_after = res["Retry-After"]
      return retry_after.to_f if retry_after.present?

      [ 2**attempt, 30 ].min
    end

    def raise_for(res, path)
      body = res.body.to_s
      parsed = begin
        JSON.parse(body)
      rescue JSON::ParserError
        {}
      end

      not_authorized = res.code == "401" ||
        parsed["error"] == "not_authorized" ||
        (res.code == "403" && parsed["error_description"].to_s.start_with?("Not authorized"))

      raise NotAuthorizedError, "Not authorized for #{path}: #{body}" if not_authorized

      raise ApiError, "Quip API #{res.code} for #{path}: #{body}"
    end
  end
end
