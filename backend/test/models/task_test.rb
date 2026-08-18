require "test_helper"

class TaskTest < ActiveSupport::TestCase
  # Regression guard: the task search query used to use Postgres' ILIKE,
  # which doesn't exist in MySQL. Switched to a plain LIKE, relying on
  # MySQL's default utf8mb4 collation (utf8mb4_0900_ai_ci — the "ci" is
  # case-insensitive) to keep the search case-insensitive. This confirms
  # that assumption actually holds against the real database.
  test "title search is case-insensitive" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    task = user.workspace.tasks.create!(title: "Ship the ROCKET launch")

    assert_includes user.workspace.tasks.where("tasks.title LIKE ?", "%rocket%"), task
    assert_includes user.workspace.tasks.where("tasks.title LIKE ?", "%ROCKET%"), task
  end
end
