module Api
  module V1
    class AuditLogsController < BaseController
      EVENTS = %w[create update destroy].freeze
      ITEM_TYPES = %w[Subnet IpAddress].freeze

      def index
        versions = PaperTrail::Version.order(created_at: :desc, id: :desc)
        versions = versions.where(item_type: params[:item_type]) if ITEM_TYPES.include?(params[:item_type])
        versions = versions.where(item_id: params[:item_id]) if params[:item_id].present?
        versions = versions.where(event: params[:event]) if EVENTS.include?(params[:event])
        versions = versions.where("whodunnit ILIKE ?", "%#{PaperTrail::Version.sanitize_sql_like(params[:actor])}%") if params[:actor].present?
        versions = for_subnet(versions, params[:subnet_id]) if params[:subnet_id].present?

        page = page_param
        per_page = per_page_param
        total = versions.count
        render json: {
          data: versions.offset((page - 1) * per_page).limit(per_page).map { |v| AuditLogSerializer.new(v) },
          meta: pagination_meta(total, page, per_page)
        }
      end

      private

      def for_subnet(scope, subnet_id)
        id = subnet_id.to_i
        scope.where(item_type: "Subnet", item_id: id).or(
          scope.where(item_type: "IpAddress")
               .where("(object->>'subnet_id')::bigint = :id OR (object_changes->'subnet_id'->>1)::bigint = :id", id: id)
        )
      end
    end
  end
end
