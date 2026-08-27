class CreateEpics < ActiveRecord::Migration[7.2]
  def change
    create_table :epics do |t|
      t.string :title, null: false
      t.references :workspace, null: false, foreign_key: true

      t.timestamps
    end
  end
end
