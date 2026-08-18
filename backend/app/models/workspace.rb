class Workspace < ApplicationRecord
  belongs_to :user
  has_many :folders, dependent: :destroy
  has_many :documents, through: :folders
  has_many :tasks, dependent: :destroy
  has_many :events, dependent: :destroy

  validates :name, presence: true
end
