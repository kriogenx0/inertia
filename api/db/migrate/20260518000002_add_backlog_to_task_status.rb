class AddBacklogToTaskStatus < ActiveRecord::Migration[7.2]
  def up
    change_column_default :tasks, :status, from: 0, to: 4
  end

  def down
    change_column_default :tasks, :status, from: 4, to: 0
  end
end
