module Quip
  # Any Quip API error that isn't an auth rejection (see NotAuthorizedError).
  class ApiError < StandardError; end
end
