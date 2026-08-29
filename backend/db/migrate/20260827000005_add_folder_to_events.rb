class AddFolderToEvents < ActiveRecord::Migration[7.2]
  def change
    add_reference :events, :folder, null: true, foreign_key: true
  end
end
