class CreateTasks < ActiveRecord::Migration[4.2]
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
