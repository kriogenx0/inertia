module Api
  module V1
    class EventTasksController < ApplicationController
      before_action :set_event

      def create
        task = Task.joins(document: :folder)
          .where(folders: { workspace_id: current_user.workspace.id })
          .find(params[:task_id])
        @event.event_tasks.find_or_create_by!(task: task)
        render json: EventBlueprint.render(@event.reload, view: :with_tasks)
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Task not found' }, status: :not_found
      end

      def destroy
        @event.event_tasks.where(task_id: params[:id]).destroy_all
        head :no_content
      end

      private

      def set_event
        @event = current_user.workspace.events.find(params[:event_id])
      end
    end
  end
end
