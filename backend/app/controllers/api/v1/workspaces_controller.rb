module Api
  module V1
    class WorkspacesController < ApplicationController
      def show
        workspace = current_user.workspace
        workspace.folders.includes(children: { children: :documents }, documents: []).load
        render json: WorkspaceBlueprint.render(workspace, view: :with_folders)
      end

      def update
        if current_user.workspace.update(workspace_params)
          render json: WorkspaceBlueprint.render(current_user.workspace)
        else
          render json: { errors: current_user.workspace.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def workspace_params
        params.require(:workspace).permit(:name)
      end
    end
  end
end
