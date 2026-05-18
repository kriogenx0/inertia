class Task < ApplicationRecord
  belongs_to :document
  belongs_to :assignee, class_name: "User", optional: true

  enum :status, { todo: 0, in_progress: 1, in_review: 2, done: 3 }

  validates :title, presence: true
  validates :status, presence: true

  default_scope { order(:position) }
end
