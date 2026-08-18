class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  has_one :workspace, dependent: :destroy
  after_create :create_default_workspace

  validates :name, presence: true

  private

  def create_default_workspace
    create_workspace!(name: "#{name}'s Workspace")
  end
end
