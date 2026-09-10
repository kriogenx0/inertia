class AddParentToTasks < ActiveRecord::Migration[7.2]
  def change
    # Self-referential: a task can be a subtask of another task, to any
    # depth (top-level -> subtask -> sub-subtask -> ...) — see Task's
    # subtasks/ancestor_ids for how the depth is walked, and TasksPage.tsx
    # for the collapse-by-depth UI this enables.
    add_reference :tasks, :parent, null: true, foreign_key: { to_table: :tasks }
  end
end
