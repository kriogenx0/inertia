class CreateQuipImports < ActiveRecord::Migration[7.2]
  def change
    # The Quip API token itself is never stored here (or anywhere) — it's
    # only ever held in memory for the duration of the background job. This
    # table is just progress/status for the frontend to poll against.
    create_table :quip_imports do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :destination_folder, null: true, foreign_key: { to_table: :folders }
      t.integer :status, null: false, default: 0
      t.string :domain, null: false
      t.integer :folders_created, null: false, default: 0
      t.integer :documents_imported, null: false, default: 0
      t.integer :documents_failed, null: false, default: 0
      t.text :error_message
      t.datetime :started_at
      t.datetime :finished_at

      t.timestamps
    end
  end
end
