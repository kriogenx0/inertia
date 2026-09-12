class QuipImport < ApplicationRecord
  belongs_to :workspace
  belongs_to :destination_folder, class_name: "Folder", optional: true

  enum :status, { pending: 0, running: 1, completed: 2, failed: 3 }

  validates :domain, inclusion: { in: %w[quip.com quip-apple.com] }
end
