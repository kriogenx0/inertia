# Blueprinter serializes with the plain `JSON` gem, not Rails' ActiveSupport
# JSON encoder — so without this, any Time/DateTime field (created_at,
# updated_at, content_updated_at, ...) renders via Ruby's default #to_s
# ("2026-09-09 15:23:43 UTC") instead of ISO 8601. That string isn't valid
# ISO 8601, so a strict parser (date-fns' parseISO, for one) throws
# "Invalid time value" on it instead of silently misparsing — which is how
# this got caught. Force ISO 8601 globally so every blueprint's timestamp
# fields are actually parseable by the frontend. Plain Date fields (Task#due_date,
# Event#date) also respond to #iso8601 and are unaffected either way, since
# their default #to_s is already "YYYY-MM-DD".
Blueprinter.configure do |config|
  config.datetime_format = ->(datetime) { datetime.iso8601(3) }
end
