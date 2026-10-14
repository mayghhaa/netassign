# Allocates addresses inside a subnet. Allocation is serialized per subnet with
# a row lock so concurrent "next available" requests never hand out the same IP.
class IpAllocator
  class SubnetFull < StandardError; end

  PERMITTED = %i[address status hostname mac_address notes].freeze

  def initialize(subnet)
    @subnet = subnet
  end

  def allocate(attrs)
    attrs = attrs.to_h.symbolize_keys.slice(*PERMITTED)
    attrs[:status] = attrs[:status].presence || "reserved"

    @subnet.with_lock do
      address = attrs[:address].presence || next_available or raise SubnetFull, "#{@subnet.cidr} has no available addresses"
      record = existing_record_for(address) || @subnet.ip_addresses.build
      if record.persisted? && record.allocated?
        record.errors.add(:address, "#{record.address} is already allocated (#{record.status})")
        return record
      end

      record.assign_attributes(attrs.merge(address: address))
      record.save
      record
    end
  end

  # Lowest usable address that has no reserved/static record.
  def next_available
    block = @subnet.block
    taken = @subnet.ip_addresses.allocated
    sql = <<~SQL.squish
      SELECT candidate FROM (
        SELECT CAST(:first AS numeric) AS candidate
        UNION
        SELECT address_int + 1 FROM (#{taken.select(:address_int).to_sql}) t
      ) c
      WHERE candidate BETWEEN :first AND :last
        AND NOT EXISTS (#{taken.where('ip_addresses.address_int = c.candidate').select('1').to_sql})
      ORDER BY candidate
      LIMIT 1
    SQL
    value = IpAddress.connection.select_value(
      IpAddress.sanitize_sql([ sql, { first: BigDecimal(block.first_usable_int), last: BigDecimal(block.last_usable_int) } ])
    )
    value && block.int_to_s(value.to_i)
  end

  private

  def existing_record_for(address)
    int = IPAddr.new(address.to_s).to_i
    @subnet.ip_addresses.find_by(address_int: int)
  rescue IPAddr::Error
    nil
  end
end
