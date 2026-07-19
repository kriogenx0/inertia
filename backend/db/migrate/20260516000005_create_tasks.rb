class CreateTasks < ActiveRecord::Migration[7.2]
  def change
    create_table :tasks do |t|
      t.string :title, null: false
      t.text :description
      t.integer :status, default: 0, null: false
      t.date :due_date
      t.integer :position, default: 0
      t.references :document, null: false, foreign_key: true
      t.references :assignee, foreign_key: { to_table: :users }
      t.timestamps
    end

    add_index :tasks, :status
  end
end
