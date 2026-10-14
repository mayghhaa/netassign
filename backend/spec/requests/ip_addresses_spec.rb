require "rails_helper"

RSpec.describe "Api::V1::IpAddresses" do
  def json = response.parsed_body
  let!(:subnet) { Subnet.create!(cidr: "10.20.0.0/28", name: "Small", environment: "production") }

  before do
    subnet.ip_addresses.create!(address: "10.20.0.2", status: "static", hostname: "app1")
    subnet.ip_addresses.create!(address: "10.20.0.3", status: "reserved")
  end

  describe "GET /api/v1/subnets/:id/ip_addresses" do
    it "merges stored records with virtual available addresses" do
      get "/api/v1/subnets/#{subnet.id}/ip_addresses"

      expect(json["data"].size).to eq(14)
      expect(json["data"].first(3).map { |r| [ r["address"], r["status"] ] })
        .to eq([ [ "10.20.0.1", "available" ], [ "10.20.0.2", "static" ], [ "10.20.0.3", "reserved" ] ])
      expect(json["meta"]["counts"]).to eq("all" => 14, "available" => 12, "reserved" => 1, "static" => 1)
    end

    it "filters by status and paginates available addresses" do
      get "/api/v1/subnets/#{subnet.id}/ip_addresses", params: { status: "available", per_page: 2, page: 2 }
      expect(json["data"].map { |r| r["address"] }).to eq(%w[10.20.0.5 10.20.0.6])
      expect(json["meta"]).to include("total" => 12, "total_pages" => 6)

      get "/api/v1/subnets/#{subnet.id}/ip_addresses", params: { status: "static" }
      expect(json["data"].map { |r| r["hostname"] }).to eq([ "app1" ])
    end

    it "searches by hostname" do
      get "/api/v1/subnets/#{subnet.id}/ip_addresses", params: { q: "APP" }
      expect(json["data"].map { |r| r["address"] }).to eq([ "10.20.0.2" ])
    end
  end

  describe "POST /api/v1/subnets/:id/ip_addresses" do
    it "allocates a specific address" do
      post "/api/v1/subnets/#{subnet.id}/ip_addresses",
           params: { ip_address: { address: "10.20.0.9", status: "static", hostname: "db1", mac_address: "001122334455" } }, as: :json

      expect(response).to have_http_status(:created)
      expect(json["data"]).to include("address" => "10.20.0.9", "mac_address" => "00:11:22:33:44:55")
    end

    it "auto-assigns the next available address when none is given" do
      get "/api/v1/subnets/#{subnet.id}/ip_addresses/next_available"
      expect(json["data"]["address"]).to eq("10.20.0.1")

      post "/api/v1/subnets/#{subnet.id}/ip_addresses", params: { ip_address: { status: "reserved" } }, as: :json
      expect(json["data"]["address"]).to eq("10.20.0.1")
    end

    it "rejects conflicts and out-of-range addresses" do
      post "/api/v1/subnets/#{subnet.id}/ip_addresses", params: { ip_address: { address: "10.20.0.2" } }, as: :json
      expect(response).to have_http_status(:unprocessable_content)

      post "/api/v1/subnets/#{subnet.id}/ip_addresses", params: { ip_address: { address: "10.20.0.15" } }, as: :json
      expect(json["errors"]["address"].first).to include("broadcast")
    end
  end

  it "updates and releases an address with audit history" do
    ip = subnet.ip_addresses.find_by!(address: "10.20.0.3")

    patch "/api/v1/ip_addresses/#{ip.id}", params: { ip_address: { status: "static", hostname: "web9" } }, as: :json
    expect(json["data"]).to include("status" => "static", "hostname" => "web9")

    delete "/api/v1/ip_addresses/#{ip.id}"
    expect(response).to have_http_status(:no_content)

    get "/api/v1/audit_logs", params: { subnet_id: subnet.id, item_type: "IpAddress" }
    events = json["data"].select { |v| v["item_id"] == ip.id }.map { |v| v["event"] }
    expect(events).to eq(%w[destroy update create])
  end
end
