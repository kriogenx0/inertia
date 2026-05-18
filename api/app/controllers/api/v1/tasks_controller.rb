module Api
  module V1
    class TasksController < ApplicationController
      before_action :set_document, only: [:index, :create]
      before_action :set_task, only: [:update, :destroy]

      def index
        if params[:document_id]
          tasks = @document.tasks
        else
          tasks = Task.joins(document: :folder)
            .where(folders: { workspace_id: current_user.workspace.id })
        end
        render json: TaskBlueprint.render(tasks, view: :with_document)
      end

      def create
        task = @document.tasks.build(task_params)
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

      def set_document
        @document = Document.joins(:folder)
          .where(folders: { workspace_id: current_user.workspace.id })
          .find(params[:document_id])
      end

      def set_task
        @task = Task.joins(document: :folder)
          .where(folders: { workspace_id: current_user.workspace.id })
          .find(params[:id])
      end

      def task_params
        params.require(:task).permit(:title, :description, :status, :due_date, :position, :assignee_id)
      end
    end
  end
end
