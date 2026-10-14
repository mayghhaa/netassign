class Subnet < ApplicationRecord
  ENVIRONMENTS = %w[production staging development qa lab dmz].freeze

  # IPv6 boundaries exceed 64 bits; keep them as BigDecimal rather than Integer.
  attribute :range_start, :decimal
  attribute :range_end, :decimal

  has_paper_trail
  has_many :ip_addresses, dependent: :destroy

  normalizes :name, with: ->(value) { value.strip }
  normalizes :environment, with: ->(value) { value.to_s.strip.downcase }

  before_validation :apply_cidr_math

  validates :cidr, presence: true, cidr: true
  validates :name, presence: true, length: { maximum: 100 }
  validates :vlan_id, numericality: { only_integer: true, in: 1..4094 }, allow_nil: true
  validates :environment, inclusion: { in: ENVIRONMENTS, message: "must be one of: #{ENVIRONMENTS.join(', ')}" }
  validate :must_not_overlap_existing_subnets
  validate :must_contain_existing_allocations, on: :update, if: :cidr_changed?

  scope :overlapping, lambda { |block|
    where(ip_version: block.version)
      .where("range_start <= ? AND range_end >= ?", BigDecimal(block.last_int), BigDecimal(block.first_int))
  }

  def block
    @block = nil if @block && @block.to_s != cidr
    @block ||= CidrBlock.parse(cidr)
  end

  private

  def apply_cidr_math
    parsed = CidrBlock.parse(cidr)
    self.cidr = parsed.to_s
    self.ip_version = parsed.version
    self.range_start = parsed.first_int
    self.range_end = parsed.last_int
  rescue CidrBlock::InvalidCidr
    nil # reported by CidrValidator
  end

  def must_not_overlap_existing_subnets
    return if errors.include?(:cidr) || range_start.nil?

    conflicts = Subnet.overlapping(block).where.not(id: id).order(:range_start).limit(5)
    return if conflicts.empty?

    list = conflicts.map { |s| "#{s.cidr} (#{s.name})" }.join(", ")
    errors.add(:cidr, "overlaps with existing subnet#{'s' if conflicts.size > 1}: #{list}")
  end

  def must_contain_existing_allocations
    return if errors.include?(:cidr) || range_start.nil?

    stranded = ip_addresses.where.not(address_int: block.first_usable_int..block.last_usable_int)
    return unless stranded.exists?

    errors.add(:cidr, "cannot be changed: #{stranded.count} existing address record(s) fall outside the new block")
  end
end
