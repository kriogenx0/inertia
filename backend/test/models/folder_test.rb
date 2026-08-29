require "test_helper"

class FolderTest < ActiveSupport::TestCase
  test "self_and_descendant_ids includes folders nested several levels deep" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    top = user.workspace.folders.create!(name: "Top")
    mid = user.workspace.folders.create!(name: "Mid", parent: top)
    leaf = user.workspace.folders.create!(name: "Leaf", parent: mid)
    unrelated = user.workspace.folders.create!(name: "Unrelated")

    ids = top.self_and_descendant_ids

    assert_includes ids, top.id
    assert_includes ids, mid.id
    assert_includes ids, leaf.id
    assert_not_includes ids, unrelated.id
    assert_equal [mid.id, leaf.id].sort, (mid.self_and_descendant_ids).sort
  end

  test "archive! and unarchive! toggle archived? and the active/archived scopes" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    folder = user.workspace.folders.create!(name: "Old project")

    assert_not folder.archived?
    assert_includes Folder.active, folder
    assert_not_includes Folder.archived, folder

    folder.archive!

    assert folder.archived?
    assert_not_includes Folder.active, folder
    assert_includes Folder.archived, folder

    folder.unarchive!
    assert_not folder.archived?
  end

  test "destroying a folder nullifies its tasks and epics instead of destroying them" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    folder = user.workspace.folders.create!(name: "Project")
    task = user.workspace.tasks.create!(title: "Direct task", folder: folder)
    epic = user.workspace.epics.create!(title: "Direct epic", folder: folder)

    folder.destroy

    assert_nil task.reload.folder_id
    assert_nil epic.reload.folder_id
  end
end
