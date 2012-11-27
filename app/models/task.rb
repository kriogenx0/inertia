class Task < ActiveRecord::Base
  belongs_to :user
  belongs_to :project
  #has_many :followers
  #has_many :task_department_followers

  #validates_presence_of :name
end
