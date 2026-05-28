class EventBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :description, :date, :event_type, :created_at, :updated_at

  view :with_tasks do
    association :tasks, blueprint: TaskBlueprint, view: :with_document
  end
end
