class MakeTaskDocumentOptional < ActiveRecord::Migration[7.2]
  def change
    change_column_null :tasks, :document_id, true
  end
end
