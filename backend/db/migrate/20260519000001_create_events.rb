class CreateEvents < ActiveRecord::Migration[7.2]
  def change
    create_table :events do |t|
      t.string :title, null: false
      t.text :description
      t.date :date, null: false
      t.integer :event_type, default: 0, null: false
      t.references :workspace, null: false, foreign_key: true

      t.timestamps
    end

    add_index :events, [ :workspace_id, :date ]
  end
end
