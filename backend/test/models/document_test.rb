require "test_helper"

class DocumentTest < ActiveSupport::TestCase
  # Regression guard: MySQL rejects a DB-level DEFAULT on JSON columns, so
  # the {} default (fine under Postgres' jsonb) was moved to the model as
  # an `attribute` default. Confirms new documents still start with {}
  # without anyone having to set content explicitly.
  test "content defaults to an empty hash" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    folder = user.workspace.folders.create!(name: "Docs")
    document = folder.documents.create!(title: "Untitled", created_by: user)

    assert_equal({}, document.content)
  end
end
