require "rails_helper"

RSpec.describe IpAddress do
  let(:subnet) { Subnet.create!(cidr: "192.168.10.0/24", name: "Office", environment: "production") }

  def build_ip(**attrs)
    subnet.ip_addresses.new({ address: "192.168.10.20", status: "reserved" }.merge(attrs))
  end

  it "normalizes hostname and MAC address" do
    ip = build_ip(status: "static", hostname: " Web-01.Corp ", mac_address: "AABB.CCDD.EEFF")
    ip.save!
    expect(ip.hostname).to eq("web-01.corp")
    expect(ip.mac_address).to eq("aa:bb:cc:dd:ee:ff")
  end

  it "rejects addresses outside the subnet" do
    ip = build_ip(address: "192.168.11.5")
    expect(ip).not_to be_valid
    expect(ip.errors[:address].first).to include("outside of 192.168.10.0/24")
  end

  it "rejects network and broadcast addresses" do
    expect(build_ip(address: "192.168.10.0").tap(&:valid?).errors[:address].first).to include("network address")
    expect(build_ip(address: "192.168.10.255").tap(&:valid?).errors[:address].first).to include("broadcast address")
  end

  it "rejects malformed input" do
    ip = build_ip(address: "192.168.10.999", mac_address: "zz:zz", hostname: "-bad-")
    expect(ip).not_to be_valid
    expect(ip.errors.attribute_names).to include(:address, :mac_address, :hostname)
  end

  it "requires a hostname for static assignments" do
    expect(build_ip(status: "static")).not_to be_valid
  end

  it "prevents duplicate addresses in the same subnet" do
    build_ip.save!
    expect(build_ip).not_to be_valid
  end

  it "rejects unknown statuses" do
    expect(build_ip(status: "bogus")).not_to be_valid
  end
end
