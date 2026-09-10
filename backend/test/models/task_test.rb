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

  test "depth counts levels up to the top-level task" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    top = user.workspace.tasks.create!(title: "Epic-sized task")
    sub = user.workspace.tasks.create!(title: "Subtask", parent: top)
    subsub = user.workspace.tasks.create!(title: "Sub-subtask", parent: sub)

    assert_equal 0, top.depth
    assert_equal 1, sub.depth
    assert_equal 2, subsub.depth
  end

  test "destroying a task destroys its subtasks" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    top = user.workspace.tasks.create!(title: "Parent")
    sub = user.workspace.tasks.create!(title: "Child", parent: top)
    subsub = user.workspace.tasks.create!(title: "Grandchild", parent: sub)

    top.destroy

    assert_not Task.exists?(sub.id)
    assert_not Task.exists?(subsub.id)
  end

  test "a task cannot be its own parent" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    task = user.workspace.tasks.create!(title: "Self-referential")

    task.parent_id = task.id
    assert_not task.valid?
    assert_includes task.errors[:parent_id], "can't be the task itself"
  end

  test "a task cannot be reparented under its own descendant" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    top = user.workspace.tasks.create!(title: "Top")
    sub = user.workspace.tasks.create!(title: "Sub", parent: top)

    top.parent = sub
    assert_not top.valid?
    assert_includes top.errors[:parent_id], "can't be one of this task's own subtasks"
  end
end
