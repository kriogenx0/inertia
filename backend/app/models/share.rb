class Share < ApplicationRecord
  belongs_to :shareable, polymorphic: true
  belongs_to :created_by, class_name: "User"

  enum :permission, { view: 0, edit: 1 }

  before_create :generate_token

  validates :token, uniqueness: true

  private

  def generate_token
    self.token = SecureRandom.urlsafe_base64(16)
  end
end
