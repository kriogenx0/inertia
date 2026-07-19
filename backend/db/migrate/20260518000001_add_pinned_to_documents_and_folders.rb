class AddPinnedToDocumentsAndFolders < ActiveRecord::Migration[7.1]
  def change
    add_column :folders, :pinned, :boolean, default: false, null: false
    add_column :documents, :pinned, :boolean, default: false, null: false
  end
end
