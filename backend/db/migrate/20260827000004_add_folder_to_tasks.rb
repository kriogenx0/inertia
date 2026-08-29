class AddFolderToTasks < ActiveRecord::Migration[7.2]
  def change
    # Optional and separate from document_id: a task reaches a folder either
    # through its document (task.document.folder) or directly when it has no
    # parent document at all. Folder-scoped views need to check both.
    add_reference :tasks, :folder, null: true, foreign_key: true
  end
end
