class QuipImportBlueprint < Blueprinter::Base
  identifier :id
  fields :status, :domain, :folders_created, :documents_imported, :documents_failed,
    :error_message, :started_at, :finished_at, :created_at
  field :destination_folder_id
end
