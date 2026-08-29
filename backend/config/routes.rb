Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  devise_for :users,
    path: "api/v1/auth",
    path_names: { sign_in: "login", sign_out: "logout", registration: "signup" },
    controllers: {
      sessions: "api/v1/auth/sessions",
      registrations: "api/v1/auth/registrations"
    }

  namespace :api do
    namespace :v1 do
      resource :workspace, only: [ :show, :update ]

      resources :folders do
        resources :documents, shallow: true
        member { get :contents }
      end

      resources :documents, only: [] do
        resources :tasks, only: [ :index, :create ], shallow: true
      end

      resources :tasks, only: [ :index, :create, :update, :destroy ]

      resources :epics, only: [ :index, :create, :update, :destroy ]

      resources :uploads, only: [ :create ]

      resources :events do
        resources :event_tasks, only: [ :create, :destroy ]
      end

      resources :shares, only: [ :create, :show, :destroy ]
      get "shared/:token", to: "shares#access", as: :shared_access
    end
  end
end
