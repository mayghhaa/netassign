class AuditLogSerializer
  HIDDEN_FIELDS = %w[updated_at created_at range_start range_end address_int ip_version].freeze
  LABEL_FIELDS = { "Subnet" => "cidr", "IpAddress" => "address" }.freeze

  def initialize(version)
    @version = version
  end

  def as_json(*)
    {
      id: @version.id,
      item_type: @version.item_type,
      item_id: @version.item_id,
      event: @version.event,
      whodunnit: @version.whodunnit,
      label: label,
      subnet_id: subnet_id,
      changes: changes,
      created_at: @version.created_at
    }
  end

  private

  def raw_changes = @version.object_changes || {}
  def object = @version.object || {}

  def changes
    raw_changes.except(*HIDDEN_FIELDS)
  end

  def label
    field = LABEL_FIELDS[@version.item_type]
    raw_changes.dig(field, 1) || object[field] || raw_changes.dig(field, 0)
  end

  def subnet_id
    return @version.item_id if @version.item_type == "Subnet"

    raw_changes.dig("subnet_id", 1) || object["subnet_id"]
  end
end
