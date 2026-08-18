class UserBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :email, :created_at
end
