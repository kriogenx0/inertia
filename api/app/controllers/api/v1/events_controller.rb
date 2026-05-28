module Api
  module V1
    class EventsController < ApplicationController
      before_action :set_event, only: [:update, :destroy]

      def index
        events = current_user.workspace.events.includes(:tasks).order(:date)
        render json: EventBlueprint.render(events, view: :with_tasks)
      end

      def create
        event = current_user.workspace.events.build(event_params)
        if event.save
          render json: EventBlueprint.render(event, view: :with_tasks), status: :created
        else
          render json: { errors: event.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @event.update(event_params)
          render json: EventBlueprint.render(@event, view: :with_tasks)
        else
          render json: { errors: @event.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @event.destroy
        head :no_content
      end

      private

      def set_event
        @event = current_user.workspace.events.find(params[:id])
      end

      def event_params
        params.require(:event).permit(:title, :description, :date, :event_type)
      end
    end
  end
end
