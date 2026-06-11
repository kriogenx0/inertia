module Api
  module V1
    class TasksController < ApplicationController
      before_action :set_task, only: [:update, :destroy]

      def index
        tasks = if params[:document_id]
          current_workspace.tasks.where(document_id: params[:document_id])
        else
          current_workspace.tasks
        end
        render json: TaskBlueprint.render(tasks, view: :with_document)
      end

      def create
        task = current_workspace.tasks.build(task_params)
        task.document_id = params[:document_id] if params[:document_id].present?
        if task.save
          render json: TaskBlueprint.render(task), status: :created
        else
          render json: { errors: task.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @task.update(task_params)
          render json: TaskBlueprint.render(@task)
        else
          render json: { errors: @task.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @task.destroy
        head :no_content
      end

      private

      def current_workspace
        current_user.workspace
      end

      def set_task
        @task = current_workspace.tasks.find(params[:id])
      end

      def task_params
        params.require(:task).permit(:title, :description, :status, :due_date, :position, :assignee_id)
      end
    end
  end
end
