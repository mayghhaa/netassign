module Api
  module V1
    class SubnetsController < BaseController
      before_action :set_subnet, only: %i[show update destroy]

      def index
        subnets = Subnet.order(:ip_version, :range_start)
        subnets = subnets.where(environment: params[:environment]) if params[:environment].present?
        if params[:q].present?
          like = "%#{Subnet.sanitize_sql_like(params[:q].strip)}%"
          subnets = subnets.where("name ILIKE :q OR cidr ILIKE :q OR description ILIKE :q OR CAST(vlan_id AS text) = :exact",
                                  q: like, exact: params[:q].strip)
        end

        counts = allocated_counts(subnets.map(&:id))
        render json: {
          data: subnets.map { |s| SubnetSerializer.new(s, allocated_counts: counts.fetch(s.id, {})) }
        }
      end

      def show
        render json: { data: SubnetSerializer.new(@subnet, detail: true) }
      end

      def create
        subnet = Subnet.new(subnet_params)
        if subnet.save
          render json: { data: SubnetSerializer.new(subnet, detail: true) }, status: :created
        else
          render_errors(subnet)
        end
      end

      def update
        if @subnet.update(subnet_params)
          render json: { data: SubnetSerializer.new(@subnet, detail: true) }
        else
          render_errors(@subnet)
        end
      end

      def destroy
        @subnet.destroy!
        head :no_content
      end

      private

      def set_subnet
        @subnet = Subnet.find(params[:id])
      end

      def subnet_params
        params.require(:subnet).permit(:cidr, :name, :vlan_id, :environment, :description)
      end

      def allocated_counts(ids)
        IpAddress.allocated.where(subnet_id: ids).group(:subnet_id, :status).count
                 .each_with_object(Hash.new { |h, k| h[k] = {} }) { |((sid, status), n), acc| acc[sid][status] = n }
      end
    end
  end
end
