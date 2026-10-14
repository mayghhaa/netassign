module Api
  module V1
    class SessionsController < BaseController
      allow_unauthenticated_access only: :create
      rate_limit to: 10, within: 3.minutes, only: :create, with: lambda {
        render json: { error: "Too many sign-in attempts. Try again later." }, status: :too_many_requests
      }

      def show
        render json: { data: user_json(Current.user) }
      end

      def create
        user = User.authenticate_by(email_address: params[:email_address].to_s, password: params[:password].to_s)
        if user
          start_new_session_for(user)
          render json: { data: user_json(user) }, status: :created
        else
          render json: { error: "Invalid email address or password" }, status: :unauthorized
        end
      end

      def destroy
        terminate_session
        head :no_content
      end

      private

      def user_json(user) = { id: user.id, name: user.name, email_address: user.email_address }
    end
  end
end
