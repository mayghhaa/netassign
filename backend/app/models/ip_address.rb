require "ipaddr"

class IpAddress < ApplicationRecord
  attribute :address_int, :decimal

  has_paper_trail
  belongs_to :subnet

  enum :status, { available: 0, reserved: 1, static: 2 }, validate: true

  ALLOCATED_STATUSES = %w[reserved static].freeze

  scope :allocated, -> { where(status: ALLOCATED_STATUSES) }

  normalizes :hostname, with: ->(value) { value.strip.downcase.presence }
  normalizes :mac_address, with: lambda { |value|
    raw = value.strip.downcase
    hex = raw.delete(":.-")
    hex.match?(/\A\h{12}\z/) ? hex.scan(/../).join(":") : raw.presence
  }

  before_validation :apply_address_math

  validates :address, presence: true, ip_address: true
  validates :address_int, uniqueness: { scope: :subnet_id, message: "is already tracked in this subnet" }, allow_nil: true
  validates :hostname, hostname: true, length: { maximum: 253 }
  validates :hostname, presence: { message: "is required for static assignments" }, if: :static?
  validates :mac_address, mac_address: true
  validate :must_be_usable_in_subnet

  def allocated?
    ALLOCATED_STATUSES.include?(status)
  end

  private

  def apply_address_math
    return if address.blank? || address.to_s.include?("/")

    ip = IPAddr.new(address.to_s.strip)
    self.address = ip.to_s
    self.address_int = ip.to_i
  rescue IPAddr::Error
    self.address_int = nil
  end

  def must_be_usable_in_subnet
    return if subnet.nil? || address_int.nil? || errors.include?(:address)

    block = subnet.block
    if !block.include?(address)
      errors.add(:address, "is outside of #{subnet.cidr}")
    elsif !block.usable?(address)
      kind = address_int == block.first_int ? "network" : "broadcast"
      errors.add(:address, "is the #{kind} address of #{subnet.cidr} and cannot be assigned")
    end
  end
end
