require "test_helper"

module Quip
  class ImporterTest < ActiveSupport::TestCase
    # A hand-rolled stand-in for Quip::Client — no real HTTP calls, no
    # network in tests. Data shaped exactly like the real API responses
    # (see Quip::Client and quip-export's Models.swift for the reference
    # shape), keyed by folder/thread id.
    class FakeClient
      def initialize(user:, folders: {}, threads: {})
        @user = user
        @folders = folders
        @threads = threads
      end

      def current_user = @user
      def folder(id) = @folders.fetch(id)
      def thread(id) = @threads.fetch(id)
      def blob(thread_id:, blob_hash:) = "fake-image-bytes"
    end

    setup do
      @user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
      @quip_import = @user.workspace.quip_imports.create!(domain: "quip.com")
    end

    test "walks Desktop/Starred/Shared roots, creating a folder and document per thread" do
      fake = FakeClient.new(
        user: { "desktop_folder_id" => "desk", "starred_folder_id" => "star", "shared_folder_ids" => [] },
        folders: {
          "desk" => { "folder" => { "id" => "desk", "title" => "Desktop" },
                      "children" => [ { "thread_id" => "t1" } ] },
          "star" => { "folder" => { "id" => "star", "title" => "Starred" }, "children" => [] }
        },
        threads: {
          "t1" => { "thread" => { "id" => "t1", "title" => "Doc One", "type" => "document" },
                    "html" => "<p>Hello from Quip.</p>" }
        }
      )

      Importer.new(quip_import: @quip_import, client: fake).run!

      @quip_import.reload
      assert @quip_import.completed?
      assert_equal 2, @quip_import.folders_created
      assert_equal 1, @quip_import.documents_imported
      assert_equal 0, @quip_import.documents_failed

      desktop = @user.workspace.folders.find_by(name: "Desktop")
      doc = desktop.documents.find_by(title: "Doc One")
      assert doc.present?
      assert_equal "Hello from Quip.", doc.content["content"].second["content"].first["text"]
    end

    test "does not revisit a folder reachable from two different roots" do
      fake = FakeClient.new(
        user: { "desktop_folder_id" => "desk", "starred_folder_id" => "desk", "shared_folder_ids" => [] },
        folders: {
          "desk" => { "folder" => { "id" => "desk", "title" => "Desktop" }, "children" => [] }
        },
        threads: {}
      )

      Importer.new(quip_import: @quip_import, client: fake).run!

      @quip_import.reload
      assert_equal 1, @quip_import.folders_created
    end

    test "creates everything under the chosen destination folder" do
      destination = @user.workspace.folders.create!(name: "Quip Import")
      @quip_import.update!(destination_folder: destination)

      fake = FakeClient.new(
        user: { "desktop_folder_id" => "desk", "starred_folder_id" => nil, "shared_folder_ids" => nil },
        folders: { "desk" => { "folder" => { "id" => "desk", "title" => "Desktop" }, "children" => [] } },
        threads: {}
      )

      Importer.new(quip_import: @quip_import, client: fake).run!

      imported_folder = @user.workspace.folders.find_by(name: "Desktop")
      assert_equal destination.id, imported_folder.parent_id
    end

    test "a failed thread is counted without stopping the rest of the import" do
      fake = FakeClient.new(
        user: { "desktop_folder_id" => "desk", "starred_folder_id" => nil, "shared_folder_ids" => nil },
        folders: {
          "desk" => { "folder" => { "id" => "desk", "title" => "Desktop" },
                      "children" => [ { "thread_id" => "bad" }, { "thread_id" => "good" } ] }
        },
        threads: {
          "good" => { "thread" => { "id" => "good", "title" => "Fine", "type" => "document" }, "html" => "<p>OK</p>" }
          # "bad" deliberately missing from the fixture -> FakeClient#thread raises KeyError
        }
      )

      Importer.new(quip_import: @quip_import, client: fake).run!

      @quip_import.reload
      assert @quip_import.completed?
      assert_equal 1, @quip_import.documents_imported
      assert_equal 1, @quip_import.documents_failed
    end

    test "an unauthorized token fails the whole import with the error recorded" do
      fake_client_class = Class.new do
        def current_user = raise Quip::NotAuthorizedError, "bad token"
      end

      Importer.new(quip_import: @quip_import, client: fake_client_class.new).run!

      @quip_import.reload
      assert @quip_import.failed?
      assert_match(/bad token/, @quip_import.error_message)
    end
  end
end
