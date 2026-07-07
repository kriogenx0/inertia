class CreateProjects < ActiveRecord::Migration[4.2]
  def up
    create_table :projects do |t|
      t.column :name, :string
      t.column :description, :string
    end
  end

  def down
    drop_table :projects
  end
end
