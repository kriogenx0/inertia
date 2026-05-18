class Workspace < ApplicationRecord
  belongs_to :user
  has_many :folders, dependent: :destroy
  has_many :documents, through: :folders

  validates :name, presence: true
end
