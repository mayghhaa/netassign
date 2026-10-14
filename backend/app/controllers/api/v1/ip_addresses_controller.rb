module Api
  module V1
    class IpAddressesController < BaseController
      before_action :set_subnet, only: %i[index create next_available]
      before_action :set_ip_address, only: %i[show update destroy]

      def index
        listing = SubnetAddressListing.new(
          @subnet, status: params[:status], query: params[:q],
                   page: page_param, per_page: params.fetch(:per_page, 256)
        )
        result = listing.call
        render json: {
          data: result.entries.map { |ip| IpAddressSerializer.new(ip) },
          meta: pagination_meta(result.total, result.page, result.per_page).merge(counts: listing.counts)
        }
      end

      def next_available
        address = IpAllocator.new(@subnet).next_available
        if address
          render json: { data: { address: address } }
        else
          render json: { error: "#{@subnet.cidr} has no available addresses" }, status: :unprocessable_content
        end
      end

      def create
        ip = IpAllocator.new(@subnet).allocate(ip_address_params)
        if ip.errors.empty? && ip.persisted?
          render json: { data: IpAddressSerializer.new(ip) }, status: :created
        else
          render_errors(ip)
        end
      rescue IpAllocator::SubnetFull => e
        render json: { error: e.message, errors: { address: [ e.message ] } }, status: :unprocessable_content
      end

      def show
        render json: { data: IpAddressSerializer.new(@ip_address) }
      end

      def update
        if @ip_address.update(ip_address_params.except(:address))
          render json: { data: IpAddressSerializer.new(@ip_address) }
        else
          render_errors(@ip_address)
        end
      end

      # Releasing an address deletes its record; the address becomes available
      # again and the full history remains in the audit log.
      def destroy
        @ip_address.destroy!
        head :no_content
      end

      private

      def set_subnet
        @subnet = Subnet.find(params[:subnet_id])
      end

      def set_ip_address
        @ip_address = IpAddress.find(params[:id])
      end

      def ip_address_params
        params.require(:ip_address).permit(:address, :status, :hostname, :mac_address, :notes)
      end
    end
  end
end
