# Blueprinter serializes with the plain `JSON` gem, not Rails' ActiveSupport
# JSON encoder — so without this, any Time/DateTime field (created_at,
# updated_at, content_updated_at, ...) renders via Ruby's default #to_s
# ("2026-09-09 15:23:43 UTC") instead of ISO 8601. That string isn't valid
# ISO 8601, so a strict parser (date-fns' parseISO, for one) throws
# "Invalid time value" on it instead of silently misparsing — which is how
# this got caught. Force ISO 8601 globally so every blueprint's timestamp
# fields are actually parseable by the frontend.
#
# Plain Date fields (Task#due_date, Event#date) go through this same
# formatter (it applies to anything responding to #strftime, not just
# Time/DateTime) — but Date#iso8601 takes NO arguments, unlike
# Time#iso8601(fraction_digits), so passing 3 here raised "wrong number of
# arguments" on any non-nil due_date/date, 500ing the whole response. Only
# surfaced once a task actually had a due_date set (DateTimeFormatter
# short-circuits on nil), which is how this got caught despite the endpoint
# otherwise looking fine. Dropped the argument — no fractional seconds, but
# still fully valid ISO 8601 and correct for both Date and Time/DateTime.
Blueprinter.configure do |config|
  config.datetime_format = ->(datetime) { datetime.iso8601 }
end
