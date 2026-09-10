require "test_helper"

# Regression test for a real bug: Blueprinter's global datetime_format (see
# config/initializers/blueprinter.rb) applies to anything responding to
# #strftime, not just Time/DateTime — a plain Date field's #iso8601 takes no
# arguments, unlike Time#iso8601(fraction_digits), so passing one raised
# "wrong number of arguments" on any non-nil Task#due_date or Event#date.
# DateTimeFormatter short-circuits on nil, so this only ever fired for a
# task/event that actually had a date set — which is exactly why it slipped
# through until then.
class DateSerializationTest < ActiveSupport::TestCase
  test "a task with a non-nil due_date serializes without raising" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    task = user.workspace.tasks.create!(title: "Ship it", due_date: Date.new(2026, 12, 25))

    hash = TaskBlueprint.render_as_hash(task)

    assert_equal "2026-12-25", hash[:due_date]
  end

  test "an event with a non-nil date serializes without raising" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    event = user.workspace.events.create!(title: "Launch", date: Date.new(2026, 12, 25))

    hash = EventBlueprint.render_as_hash(event)

    assert_equal "2026-12-25", hash[:date]
  end
end
