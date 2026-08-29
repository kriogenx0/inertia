class AddFolderAndDatesToEpics < ActiveRecord::Migration[7.2]
  def change
    add_reference :epics, :folder, null: true, foreign_key: true
    add_column :epics, :start_date, :date
    add_column :epics, :target_date, :date
  end
end
