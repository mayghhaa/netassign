class CidrValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    CidrBlock.parse(value)
  rescue CidrBlock::InvalidCidr => e
    record.errors.add(attribute, e.message)
  end
end
