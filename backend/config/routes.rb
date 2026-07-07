Rails.application.routes.draw do
  resources :clients
  resources :tasks
  resources :users
  resources :comments

  root to: "tasklist#index"
end
