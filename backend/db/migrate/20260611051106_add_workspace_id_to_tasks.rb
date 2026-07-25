class AddWorkspaceIdToTasks < ActiveRecord::Migration[7.2]
  def change
    add_reference :tasks, :workspace, null: true, foreign_key: true

    # Backfill from existing document → folder → workspace chain
    execute <<~SQL
      UPDATE tasks
      JOIN documents ON documents.id = tasks.document_id
      JOIN folders ON folders.id = documents.folder_id
      SET tasks.workspace_id = folders.workspace_id
    SQL

    change_column_null :tasks, :workspace_id, false
  end
end
