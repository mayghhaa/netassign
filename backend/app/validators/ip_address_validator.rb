require "ipaddr"

class IpAddressValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    return if value.blank?

    if value.to_s.include?("/")
      record.errors.add(attribute, "must be a single address, not a CIDR block")
    else
      IPAddr.new(value.to_s)
    end
  rescue IPAddr::Error
    record.errors.add(attribute, "is not a valid IPv4 or IPv6 address")
  end
end
