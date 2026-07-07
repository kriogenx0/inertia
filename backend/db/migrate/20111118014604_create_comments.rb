class CreateComments < ActiveRecord::Migration[4.2]
  def up
    create_table :comments do |t|
      t.column :description, :string
      t.timestamps
    end
  end
  def down
    drop_table :comments
  end
end
