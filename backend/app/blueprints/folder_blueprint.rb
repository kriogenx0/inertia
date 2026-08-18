class FolderBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :position, :pinned, :created_at, :updated_at

  field :parent_id

  view :with_children do
    association :children, blueprint: FolderBlueprint, view: :with_children
    association :documents, blueprint: DocumentBlueprint
  end
end
