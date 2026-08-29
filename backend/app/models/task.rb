class Task < ApplicationRecord
  belongs_to :workspace
  belongs_to :document, optional: true
  belongs_to :assignee, class_name: "User", optional: true
  belongs_to :epic, optional: true
  # Separate from document_id: lets a task scope to a folder even when it
  # has no parent document at all ("just a task", not tied to a doc).
  belongs_to :folder, optional: true

  enum :status, { todo: 0, in_progress: 1, in_review: 2, done: 3, backlog: 4 }

  validates :title, presence: true
  validates :status, presence: true

  default_scope { order(:position) }
end
