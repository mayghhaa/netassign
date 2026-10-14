class SubnetSerializer
  def initialize(subnet, allocated_counts: nil, detail: false)
    @subnet = subnet
    @counts = allocated_counts
    @detail = detail
  end

  def as_json(*)
    block = @subnet.block
    reserved = counts.fetch("reserved", 0)
    static = counts.fetch("static", 0)
    used = reserved + static
    total = block.usable_count

    data = {
      id: @subnet.id,
      cidr: @subnet.cidr,
      name: @subnet.name,
      vlan_id: @subnet.vlan_id,
      environment: @subnet.environment,
      description: @subnet.description,
      ip_version: @subnet.ip_version,
      utilization: {
        total: total,
        used: used,
        reserved: reserved,
        static: static,
        available: total - used,
        percent: total.zero? ? 0.0 : (used * 100.0 / total).round(2)
      },
      created_at: @subnet.created_at,
      updated_at: @subnet.updated_at
    }
    data[:network] = network_info(block) if @detail
    data
  end

  private

  def counts
    @counts ||= @subnet.ip_addresses.allocated.group(:status).count
  end

  def network_info(block)
    {
      network_address: block.network,
      prefix_length: block.prefix,
      netmask: block.netmask,
      broadcast_address: block.broadcast,
      first_usable: block.first_usable,
      last_usable: block.last_usable,
      total_addresses: block.size
    }
  end
end
