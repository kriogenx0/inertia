class CreateDocuments < ActiveRecord::Migration[7.2]
  def change
    create_table :documents do |t|
      t.string :title, null: false
      t.jsonb :content, default: {}
      t.integer :doc_type, default: 0, null: false
      t.references :folder, null: false, foreign_key: true
      t.references :created_by, null: false, foreign_key: { to_table: :users }
      t.datetime :content_updated_at
      t.timestamps
    end

    add_index :documents, :doc_type
  end
end
