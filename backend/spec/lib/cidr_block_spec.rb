require "rails_helper"

RSpec.describe CidrBlock do
  describe ".parse" do
    it "normalizes host bits to the network address" do
      expect(described_class.parse("10.0.0.77/24").to_s).to eq("10.0.0.0/24")
    end

    it "supports IPv6" do
      block = described_class.parse("2001:db8::/64")
      expect(block.version).to eq(6)
      expect(block.size).to eq(2**64)
    end

    it "rejects input without a prefix" do
      expect { described_class.parse("10.0.0.0") }.to raise_error(CidrBlock::InvalidCidr, /prefix/)
    end

    it "rejects prefixes beyond the family limit" do
      expect { described_class.parse("10.0.0.0/33") }.to raise_error(CidrBlock::InvalidCidr, /between 0 and 32/)
    end

    it "rejects garbage" do
      expect { described_class.parse("not-a-network/24") }.to raise_error(CidrBlock::InvalidCidr)
      expect { described_class.parse("") }.to raise_error(CidrBlock::InvalidCidr)
    end
  end

  describe "host math" do
    it "excludes network and broadcast addresses for normal IPv4 blocks" do
      block = described_class.parse("192.168.1.0/24")
      expect([ block.first_usable, block.last_usable, block.usable_count ]).to eq([ "192.168.1.1", "192.168.1.254", 254 ])
      expect(block.broadcast).to eq("192.168.1.255")
      expect(block.netmask).to eq("255.255.255.0")
    end

    it "treats /31 and /32 as fully usable" do
      expect(described_class.parse("10.0.0.0/31").usable_count).to eq(2)
      expect(described_class.parse("10.0.0.1/32").usable_count).to eq(1)
    end

    it "checks containment and usability" do
      block = described_class.parse("10.0.0.0/30")
      expect(block.include?("10.0.0.3")).to be(true)
      expect(block.usable?("10.0.0.3")).to be(false)
      expect(block.usable?("10.0.0.2")).to be(true)
      expect(block.include?("10.0.0.4")).to be(false)
      expect(block.include?("::1")).to be(false)
    end
  end

  describe "#overlaps?" do
    let(:base) { described_class.parse("10.0.0.0/16") }

    it "detects containment in either direction" do
      expect(base.overlaps?(described_class.parse("10.0.42.0/24"))).to be(true)
      expect(described_class.parse("10.0.42.0/24").overlaps?(base)).to be(true)
      expect(base.overlaps?(described_class.parse("10.0.0.0/8"))).to be(true)
    end

    it "allows adjacent blocks" do
      expect(base.overlaps?(described_class.parse("10.1.0.0/16"))).to be(false)
    end

    it "never matches across IP families" do
      expect(base.overlaps?(described_class.parse("::/0"))).to be(false)
    end
  end
end
