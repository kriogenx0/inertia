class CreateFolders < ActiveRecord::Migration[7.2]
  def change
    create_table :folders do |t|
      t.string :name, null: false
      t.references :workspace, null: false, foreign_key: true
      t.references :parent, foreign_key: { to_table: :folders }
      t.integer :position, default: 0
      t.timestamps
    end
  end
end
