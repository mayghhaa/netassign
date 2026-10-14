class IpAddressSerializer
  def initialize(ip_address)
    @ip = ip_address
  end

  def as_json(*)
    {
      id: @ip.id,
      address: @ip.address,
      subnet_id: @ip.subnet_id,
      status: @ip.status,
      hostname: @ip.hostname,
      mac_address: @ip.mac_address,
      notes: @ip.notes,
      persisted: @ip.persisted?,
      created_at: @ip.created_at,
      updated_at: @ip.updated_at
    }
  end
end
