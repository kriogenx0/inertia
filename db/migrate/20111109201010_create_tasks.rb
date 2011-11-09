class CreateTasks < ActiveRecord::Migration
  def change
    create_table :tasks do |t|
      t.string :name
      t.string :description
      t.string :eta
      t.integer :parent
      t.integer :status

      t.timestamps
    end
  end
end
