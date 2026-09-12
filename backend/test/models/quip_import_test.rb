require "test_helper"

class QuipImportTest < ActiveSupport::TestCase
  test "domain must be one of the two supported Quip deployments" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")

    valid = user.workspace.quip_imports.new(domain: "quip.com")
    assert valid.valid?

    invalid = user.workspace.quip_imports.new(domain: "example.com")
    assert_not invalid.valid?
  end

  test "defaults to pending status" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    quip_import = user.workspace.quip_imports.create!(domain: "quip.com")

    assert quip_import.pending?
  end
end
