require "rails_helper"

RSpec.describe Subnet do
  def build_subnet(cidr, **attrs)
    described_class.new({ cidr: cidr, name: "Net #{cidr}", environment: "production" }.merge(attrs))
  end

  it "normalizes the CIDR and stores integer boundaries" do
    subnet = build_subnet("10.1.2.3/24")
    subnet.save!
    expect(subnet.cidr).to eq("10.1.2.0/24")
    expect(subnet.range_start).to eq(IPAddr.new("10.1.2.0").to_i)
    expect(subnet.range_end).to eq(IPAddr.new("10.1.2.255").to_i)
  end

  it "rejects invalid CIDRs" do
    subnet = build_subnet("10.1.2.300/24")
    expect(subnet).not_to be_valid
    expect(subnet.errors[:cidr]).to be_present
  end

  it "validates VLAN range and environment" do
    subnet = build_subnet("10.0.0.0/24", vlan_id: 5000, environment: "mars")
    expect(subnet).not_to be_valid
    expect(subnet.errors.attribute_names).to include(:vlan_id, :environment)
  end

  describe "overlap detection" do
    before { build_subnet("10.0.0.0/16").save! }

    it "rejects a subnet nested inside an existing one" do
      subnet = build_subnet("10.0.5.0/24")
      expect(subnet).not_to be_valid
      expect(subnet.errors[:cidr].first).to include("overlaps with existing subnet: 10.0.0.0/16")
    end

    it "rejects a supernet that swallows an existing one" do
      expect(build_subnet("10.0.0.0/8")).not_to be_valid
    end

    it "rejects exact duplicates" do
      expect(build_subnet("10.0.0.0/16")).not_to be_valid
    end

    it "accepts adjacent blocks" do
      expect(build_subnet("10.1.0.0/16")).to be_valid
    end

    it "works for IPv6 blocks beyond 64 bits" do
      build_subnet("2001:db8::/48").save!
      expect(build_subnet("2001:db8:0:1::/64")).not_to be_valid
      expect(build_subnet("2001:db9::/48")).to be_valid
    end

    it "allows updating a subnet without colliding with itself" do
      subnet = described_class.find_by!(cidr: "10.0.0.0/16")
      expect(subnet.update(name: "Renamed")).to be(true)
    end

    it "is enforced by a database exclusion constraint" do
      subnet = build_subnet("10.0.1.0/24")
      subnet.valid?
      expect { subnet.save!(validate: false) }.to raise_error(ActiveRecord::ExclusionViolation)
    end
  end

  it "refuses to shrink the CIDR when allocations would be stranded" do
    subnet = build_subnet("10.2.0.0/24").tap(&:save!)
    subnet.ip_addresses.create!(address: "10.2.0.200", status: "reserved")
    expect(subnet.update(cidr: "10.2.0.0/25")).to be(false)
    expect(subnet.errors[:cidr].first).to include("fall outside")
  end

  it "records an audit trail" do
    subnet = build_subnet("10.3.0.0/24").tap(&:save!)
    subnet.update!(name: "Changed")
    subnet.destroy!
    expect(PaperTrail::Version.where(item_type: "Subnet", item_id: subnet.id).pluck(:event)).to eq(%w[create update destroy])
  end
end
