class AddWorkspaceIdToTasks < ActiveRecord::Migration[7.2]
  def change
    add_reference :tasks, :workspace, null: true, foreign_key: true

    # Backfill from existing document → folder → workspace chain
    execute <<~SQL
      UPDATE tasks
      SET workspace_id = folders.workspace_id
      FROM documents
      JOIN folders ON folders.id = documents.folder_id
      WHERE documents.id = tasks.document_id
    SQL

    change_column_null :tasks, :workspace_id, false
  end
end
