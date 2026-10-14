class HostnameValidator < ActiveModel::EachValidator
  LABEL = /\A(?!-)[a-z0-9-]{1,63}(?<!-)\z/i

  def validate_each(record, attribute, value)
    return if value.blank?

    valid = value.length <= 253 && value.split(".", -1).all? { |label| label.match?(LABEL) }
    record.errors.add(attribute, "must be a valid RFC 1123 hostname") unless valid
  end
end
