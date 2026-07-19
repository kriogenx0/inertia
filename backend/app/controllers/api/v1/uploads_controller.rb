class Api::V1::UploadsController < ApplicationController
  ALLOWED_TYPES = %w[image/jpeg image/png image/gif image/webp image/svg+xml
                     video/mp4 video/webm video/quicktime video/ogg].freeze
  MAX_SIZE = 100.megabytes

  def create
    file = params[:file]
    return render json: { error: 'No file provided' }, status: :unprocessable_entity unless file
    return render json: { error: 'File type not allowed' }, status: :unprocessable_entity unless ALLOWED_TYPES.include?(file.content_type)
    return render json: { error: 'File too large' }, status: :unprocessable_entity if file.size > MAX_SIZE

    blob = ActiveStorage::Blob.create_and_upload!(
      io: file.tempfile,
      filename: file.original_filename,
      content_type: file.content_type,
    )

    render json: { url: rails_blob_url(blob, host: request.base_url) }
  end
end
