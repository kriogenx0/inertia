class Folder < ApplicationRecord
  belongs_to :workspace
  belongs_to :parent, class_name: "Folder", optional: true
  has_many :children, class_name: "Folder", foreign_key: :parent_id, dependent: :destroy
  has_many :documents, dependent: :destroy
  has_many :shares, as: :shareable, dependent: :destroy

  validates :name, presence: true
end
