class FolderBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :position, :pinned, :created_at, :updated_at

  field :parent_id
  field :archived_at
  field :archived?, name: :archived

  view :with_children do
    # Only active children — an archived subfolder (and everything nested
    # under it) disappears from the normal tree instead of showing up
    # inside an otherwise-active parent. The dedicated archived listing
    # (FoldersController#index with archived=1) queries archived folders
    # directly, so it doesn't go through this association at all.
    association :children, blueprint: FolderBlueprint, view: :with_children do |folder, _options|
      folder.children.active
    end
    association :documents, blueprint: DocumentBlueprint
  end
end
