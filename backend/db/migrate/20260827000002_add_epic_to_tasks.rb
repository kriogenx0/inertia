class AddEpicToTasks < ActiveRecord::Migration[7.2]
  def change
    add_reference :tasks, :epic, null: true, foreign_key: true
  end
end
