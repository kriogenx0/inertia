class TasklistController < ApplicationController
  def index
    @tasks = Task.all
  end
end
