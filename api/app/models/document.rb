class Document < ApplicationRecord
  belongs_to :folder
  belongs_to :created_by, class_name: "User"
  has_many :tasks, dependent: :destroy
  has_many :shares, as: :shareable, dependent: :destroy

  enum :doc_type, { document: 0, spreadsheet: 1 }

  validates :title, presence: true
  validates :doc_type, presence: true

  before_save :update_content_updated_at, if: :content_changed?

  private

  def update_content_updated_at
    self.content_updated_at = Time.current
  end
end
