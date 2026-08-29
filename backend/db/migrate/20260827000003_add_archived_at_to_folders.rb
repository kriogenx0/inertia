class AddArchivedAtToFolders < ActiveRecord::Migration[7.2]
  def change
    add_column :folders, :archived_at, :datetime
  end
end
