class CreateShares < ActiveRecord::Migration[7.2]
  def change
    create_table :shares do |t|
      t.string :token, null: false
      t.integer :permission, default: 0, null: false
      t.references :shareable, polymorphic: true, null: false
      t.references :created_by, null: false, foreign_key: { to_table: :users }
      t.timestamps
    end

    add_index :shares, :token, unique: true
  end
end
