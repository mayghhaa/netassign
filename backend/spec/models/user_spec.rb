require "rails_helper"

RSpec.describe User do
  def build_user(**attrs) = described_class.new({ email_address: "a@example.com", name: "Ann", password: "password123" }.merge(attrs))

  it "normalizes email addresses" do
    expect(build_user(email_address: "  Ann@Example.COM ").email_address).to eq("ann@example.com")
  end

  it "requires a valid email, a name and an 8+ character password" do
    expect(build_user(email_address: "not-an-email")).not_to be_valid
    expect(build_user(name: " ")).not_to be_valid
    expect(build_user(password: "short")).not_to be_valid
    expect(build_user).to be_valid
  end

  it "treats email addresses as case-insensitively unique" do
    build_user.save!
    expect(build_user(email_address: "A@EXAMPLE.com")).not_to be_valid
  end
end
