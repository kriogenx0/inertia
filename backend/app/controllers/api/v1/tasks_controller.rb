module Api
  module V1
    class TasksController < ApplicationController
      before_action :set_task, only: [:update, :destroy]

      def index
        tasks = current_workspace.tasks.includes(:document)
        tasks = tasks.where(document_id: params[:document_id]) if params[:document_id]
        tasks = tasks.where(status: params[:status]) if params[:status]
        tasks = tasks.where(epic_id: params[:epic_id]) if params[:epic_id]
        tasks = tasks.joins(:document).where(documents: { folder_id: params[:folder_id] }) if params[:folder_id]
        tasks = tasks.where("tasks.title LIKE ?", "%#{params[:q]}%") if params[:q]
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
        params.require(:task).permit(:title, :description, :status, :due_date, :position, :assignee_id, :epic_id)
      end
    end
  end
end
