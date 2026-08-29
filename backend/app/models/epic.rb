class Epic < ApplicationRecord
  belongs_to :workspace
  belongs_to :folder, optional: true
  has_many :tasks, dependent: :nullify

  validates :title, presence: true

  # EpicsController#index preloads these via a grouped join (see there) so
  # listing epics doesn't run one COUNT query per epic. Falls back to a
  # real query so the model still works standalone (e.g. right after
  # create, or in tests) where that select never ran.
  def tasks_count
    attributes["tasks_count"]&.to_i || tasks.count
  end

  def done_tasks_count
    attributes["done_tasks_count"]&.to_i || tasks.where(status: :done).count
  end
end
