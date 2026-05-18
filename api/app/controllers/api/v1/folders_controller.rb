module Api
  module V1
    class FoldersController < ApplicationController
      before_action :set_folder, only: [:show, :update, :destroy]

      def index
        folders = current_user.workspace.folders.where(parent_id: nil).order(:position, :name)
        render json: FolderBlueprint.render(folders, view: :with_children)
      end

      def show
        render json: FolderBlueprint.render(@folder, view: :with_children)
      end

      def create
        folder = current_user.workspace.folders.build(folder_params)
        if folder.save
          render json: FolderBlueprint.render(folder), status: :created
        else
          render json: { errors: folder.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @folder.update(folder_params)
          render json: FolderBlueprint.render(@folder)
        else
          render json: { errors: @folder.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @folder.destroy
        head :no_content
      end

      private

      def set_folder
        @folder = current_user.workspace.folders.find(params[:id])
      end

      def folder_params
        params.require(:folder).permit(:name, :parent_id, :position, :pinned)
      end
    end
  end
end
