class EventTask < ApplicationRecord
  belongs_to :event
  belongs_to :task
end
