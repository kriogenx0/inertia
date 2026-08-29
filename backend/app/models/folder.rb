class Folder < ApplicationRecord
  belongs_to :workspace
  belongs_to :parent, class_name: "Folder", optional: true
  has_many :children, class_name: "Folder", foreign_key: :parent_id, dependent: :destroy
  has_many :documents, dependent: :destroy
  has_many :tasks, dependent: :nullify
  has_many :events, dependent: :destroy
  has_many :epics, dependent: :nullify
  has_many :shares, as: :shareable, dependent: :destroy

  validates :name, presence: true

  scope :active, -> { where(archived_at: nil) }
  scope :archived, -> { where.not(archived_at: nil) }

  def archived?
    archived_at.present?
  end

  def archive!
    update!(archived_at: Time.current)
  end

  def unarchive!
    update!(archived_at: nil)
  end

  # Folders are recursive "projects/components" — a folder's view covers
  # itself plus everything nested under it, however deep. MySQL 8 can do
  # this with a recursive CTE, but a plain Ruby walk is simpler, avoids raw
  # SQL, and workspace folder trees are small enough that it's not worth
  # the complexity.
  def self_and_descendant_ids
    ids = [ id ]
    children.find_each { |child| ids.concat(child.self_and_descendant_ids) }
    ids
  end
end
