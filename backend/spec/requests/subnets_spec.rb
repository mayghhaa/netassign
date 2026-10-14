require "rails_helper"

RSpec.describe "Api::V1::Subnets" do
  def json = response.parsed_body

  describe "GET /api/v1/subnets" do
    it "lists subnets with utilization" do
      subnet = Subnet.create!(cidr: "10.0.0.0/30", name: "P2P", environment: "production")
      subnet.ip_addresses.create!(address: "10.0.0.1", status: "reserved")

      get "/api/v1/subnets"

      expect(response).to have_http_status(:ok)
      expect(json["data"].first["utilization"]).to include("total" => 2, "used" => 1, "available" => 1, "percent" => 50.0)
    end

    it "filters by environment and search" do
      Subnet.create!(cidr: "10.0.0.0/24", name: "Prod", environment: "production")
      Subnet.create!(cidr: "10.1.0.0/24", name: "Lab", environment: "lab", vlan_id: 42)

      get "/api/v1/subnets", params: { environment: "lab" }
      expect(json["data"].map { |s| s["name"] }).to eq([ "Lab" ])

      get "/api/v1/subnets", params: { q: "42" }
      expect(json["data"].map { |s| s["name"] }).to eq([ "Lab" ])
    end
  end

  describe "POST /api/v1/subnets" do
    let(:params) { { subnet: { cidr: "172.16.0.0/22", name: "Users", vlan_id: 30, environment: "staging" } } }

    it "creates a subnet and returns network details" do
      post "/api/v1/subnets", params: params, as: :json

      expect(response).to have_http_status(:created)
      expect(json["data"]["network"]).to include("netmask" => "255.255.252.0", "broadcast_address" => "172.16.3.255")
    end

    it "returns 422 with field errors on overlap" do
      Subnet.create!(cidr: "172.16.0.0/16", name: "Big", environment: "production")
      post "/api/v1/subnets", params: params, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"]["cidr"].first).to include("overlaps")
    end

    it "records the actor from the X-Actor header" do
      post "/api/v1/subnets", params: params, as: :json, headers: { "X-Actor" => "megha" }
      expect(PaperTrail::Version.last.whodunnit).to eq("megha")
    end
  end

  it "updates and deletes subnets" do
    subnet = Subnet.create!(cidr: "10.5.0.0/24", name: "Old", environment: "qa")

    patch "/api/v1/subnets/#{subnet.id}", params: { subnet: { name: "New" } }, as: :json
    expect(json["data"]["name"]).to eq("New")

    delete "/api/v1/subnets/#{subnet.id}"
    expect(response).to have_http_status(:no_content)
    expect(Subnet.exists?(subnet.id)).to be(false)
  end

  it "returns 404 for unknown subnets" do
    get "/api/v1/subnets/999999"
    expect(response).to have_http_status(:not_found)
  end
end
