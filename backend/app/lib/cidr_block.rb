require "ipaddr"

# Value object wrapping Ruby's IPAddr with the network math NetAssign needs:
# boundaries as integers, usable host ranges, containment and overlap checks.
class CidrBlock
  class InvalidCidr < ArgumentError; end

  attr_reader :ipaddr

  def self.parse(value)
    raise InvalidCidr, "can't be blank" if value.to_s.strip.empty?

    str = value.to_s.strip
    raise InvalidCidr, "must include a prefix length (e.g. 10.0.0.0/24)" unless str.include?("/")

    address, prefix = str.split("/", 2)
    raise InvalidCidr, "has an invalid prefix length" unless prefix.match?(/\A\d{1,3}\z/)

    ip = IPAddr.new(address)
    max = ip.ipv4? ? 32 : 128
    raise InvalidCidr, "prefix length must be between 0 and #{max}" if prefix.to_i > max

    new(IPAddr.new("#{address}/#{prefix}"))
  rescue IPAddr::Error
    raise InvalidCidr, "is not a valid IPv4 or IPv6 CIDR block"
  end

  def initialize(ipaddr)
    @ipaddr = ipaddr
  end

  def to_s = "#{network}/#{prefix}"
  def network = ipaddr.to_s
  def prefix = ipaddr.prefix
  def ipv4? = ipaddr.ipv4?
  def version = ipv4? ? 4 : 6
  def family = ipaddr.family
  def max_prefix = ipv4? ? 32 : 128

  def first_int = ipaddr.to_i
  def last_int = first_int + size - 1
  def size = 2**(max_prefix - prefix)

  def netmask
    IPAddr.new((2**max_prefix - 1) ^ (size - 1), family).to_s
  end

  def broadcast
    ipv4? ? int_to_s(last_int) : nil
  end

  # IPv4 networks reserve the network and broadcast addresses, except for
  # /31 point-to-point links (RFC 3021) and /32 host routes.
  def reserves_edges?
    ipv4? && prefix <= 30
  end

  def first_usable_int = reserves_edges? ? first_int + 1 : first_int
  def last_usable_int = reserves_edges? ? last_int - 1 : last_int
  def usable_count = last_usable_int - first_usable_int + 1

  def first_usable = int_to_s(first_usable_int)
  def last_usable = int_to_s(last_usable_int)

  def include?(address)
    ip = address.is_a?(IPAddr) ? address : IPAddr.new(address.to_s)
    ip.family == family && ip.to_i.between?(first_int, last_int)
  rescue IPAddr::Error
    false
  end

  def usable?(address)
    ip = address.is_a?(IPAddr) ? address : IPAddr.new(address.to_s)
    ip.family == family && ip.to_i.between?(first_usable_int, last_usable_int)
  rescue IPAddr::Error
    false
  end

  # Two CIDR blocks intersect iff each one starts before the other ends.
  def overlaps?(other)
    version == other.version && first_int <= other.last_int && other.first_int <= last_int
  end

  def int_to_s(int)
    IPAddr.new(int, family).to_s
  end
end
