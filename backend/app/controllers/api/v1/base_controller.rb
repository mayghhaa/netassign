module Api
  module V1
    class BaseController < ApplicationController
      include PaperTrail::Rails::Controller

      DEFAULT_PER_PAGE = 50

      before_action :set_paper_trail_whodunnit

      rescue_from ActiveRecord::RecordNotFound do |e|
        render json: { error: "#{e.model || 'Record'} not found" }, status: :not_found
      end

      rescue_from ActionController::ParameterMissing do |e|
        render json: { error: e.message }, status: :bad_request
      end

      # Last line of defence if two requests race past model-level overlap validation.
      rescue_from ActiveRecord::ExclusionViolation do
        render json: { error: "Validation failed", errors: { cidr: [ "overlaps with an existing subnet" ] } },
               status: :unprocessable_content
      end

      rescue_from ActiveRecord::RecordNotUnique do
        render json: { error: "Validation failed", errors: { base: [ "record already exists" ] } },
               status: :unprocessable_content
      end

      private

      def user_for_paper_trail
        Current.user&.email_address || "api"
      end

      def render_errors(record)
        render json: { error: record.errors.full_messages.to_sentence, errors: record.errors.to_hash },
               status: :unprocessable_content
      end

      def page_param = [ params.fetch(:page, 1).to_i, 1 ].max
      def per_page_param(max: 200) = params.fetch(:per_page, DEFAULT_PER_PAGE).to_i.clamp(1, max)

      def pagination_meta(total, page, per_page)
        { page: page, per_page: per_page, total: total, total_pages: [ (total.to_f / per_page).ceil, 1 ].max }
      end
    end
  end
end
