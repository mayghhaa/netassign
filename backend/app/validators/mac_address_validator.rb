class MacAddressValidator < ActiveModel::EachValidator
  FORMAT = /\A(\h{2}:){5}\h{2}\z/

  def validate_each(record, attribute, value)
    return if value.blank? || value.to_s.match?(FORMAT)

    record.errors.add(attribute, "must be a valid MAC address (e.g. 00:1a:2b:3c:4d:5e)")
  end
end
