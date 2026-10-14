Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :subnets, only: %i[index show create update destroy] do
        resources :ip_addresses, only: %i[index show create update destroy], shallow: true do
          get :next_available, on: :collection
        end
      end
      resources :audit_logs, only: :index
      resource :session, only: %i[show create destroy]
    end
  end
end
