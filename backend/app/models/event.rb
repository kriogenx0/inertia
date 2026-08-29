class Event < ApplicationRecord
  belongs_to :workspace
  belongs_to :folder, optional: true
  has_many :event_tasks, dependent: :destroy
  has_many :tasks, through: :event_tasks

  enum :event_type, { deadline: 0, milestone: 1 }

  validates :title, presence: true
  validates :date, presence: true

  scope :upcoming, -> { where("date >= ?", Date.today).order(:date) }
  scope :past, -> { where("date < ?", Date.today).order(date: :desc) }
end
