module Api
  module V1
    class SharesController < ApplicationController
      skip_before_action :authenticate_user!, only: [:access]
      before_action :set_share, only: [:show, :destroy]

      def create
        shareable = find_shareable
        share = shareable.shares.build(share_params.merge(created_by: current_user))
        if share.save
          render json: ShareBlueprint.render(share), status: :created
        else
          render json: { errors: share.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def show
        render json: ShareBlueprint.render(@share)
      end

      def access
        share = Share.find_by!(token: params[:token])
        render json: ShareBlueprint.render(share, view: :with_resource)
      end

      def destroy
        @share.destroy
        head :no_content
      end

      private

      def set_share
        @share = Share.joins("JOIN folders ON (shares.shareable_type = 'Folder' AND shares.shareable_id = folders.id) OR (shares.shareable_type = 'Document')")
          .where("(shares.shareable_type = 'Folder' AND folders.workspace_id = ?) OR (shares.shareable_type = 'Document')", current_user.workspace.id)
          .find(params[:id])
      end

      def find_shareable
        if params[:folder_id]
          current_user.workspace.folders.find(params[:folder_id])
        else
          Document.joins(:folder).where(folders: { workspace_id: current_user.workspace.id }).find(params[:document_id])
        end
      end

      def share_params
        params.require(:share).permit(:permission, :folder_id, :document_id)
      end
    end
  end
end
