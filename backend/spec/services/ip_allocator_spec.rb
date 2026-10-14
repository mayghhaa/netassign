require "rails_helper"

RSpec.describe IpAllocator do
  let(:subnet) { Subnet.create!(cidr: "10.9.0.0/29", name: "Tiny", environment: "lab") }
  let(:allocator) { described_class.new(subnet) }

  it "hands out the lowest free usable address" do
    expect(allocator.next_available).to eq("10.9.0.1")
    allocator.allocate(address: "10.9.0.1")
    allocator.allocate(address: "10.9.0.3")
    expect(allocator.next_available).to eq("10.9.0.2")
    expect(allocator.allocate({}).address).to eq("10.9.0.2")
    expect(allocator.next_available).to eq("10.9.0.4")
  end

  it "re-uses records that are marked available" do
    record = subnet.ip_addresses.create!(address: "10.9.0.1", status: "available", notes: "spare")
    ip = allocator.allocate(status: "static", hostname: "db1")
    expect(ip.id).to eq(record.id)
    expect(ip.reload.status).to eq("static")
  end

  it "refuses to double-allocate" do
    allocator.allocate(address: "10.9.0.5")
    expect(allocator.allocate(address: "10.9.0.5").errors[:address].first).to include("already allocated")
  end

  it "raises when the subnet is exhausted" do
    6.times { allocator.allocate({}) }
    expect(allocator.next_available).to be_nil
    expect { allocator.allocate({}) }.to raise_error(IpAllocator::SubnetFull)
  end

  it "works with IPv6 subnets" do
    v6 = Subnet.create!(cidr: "2001:db8::/120", name: "v6", environment: "lab")
    expect(described_class.new(v6).allocate({}).address).to eq("2001:db8::")
  end
end
