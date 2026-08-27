class EpicBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :created_at, :updated_at
  field :tasks_count
  field :done_tasks_count
end
