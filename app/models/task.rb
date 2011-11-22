class Task < ActiveRecord::Base
  belongs_to :user, :project

  validates_presence_of :name
end
