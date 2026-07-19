class TaskBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :description, :status, :due_date, :position, :created_at, :updated_at

  field :document_id
  field :assignee_id

  view :with_document do
    association :document, blueprint: DocumentBlueprint do |task, _options|
      task.document
    end
  end
end
