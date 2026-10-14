require "rails_helper"

RSpec.describe "Api::V1::Sessions" do
  def json = response.parsed_body

  context "when signed out", :unauthenticated do
    let!(:user) { create_user }

    it "rejects API requests with 401" do
      get "/api/v1/subnets"
      expect(response).to have_http_status(:unauthorized)

      get "/api/v1/session"
      expect(response).to have_http_status(:unauthorized)
    end

    it "rejects a wrong password" do
      post "/api/v1/session", params: { email_address: user.email_address, password: "nope" }, as: :json
      expect(response).to have_http_status(:unauthorized)
      expect(response.cookies["session_id"]).to be_nil
    end

    it "signs in with an HttpOnly cookie and grants API access" do
      post "/api/v1/session", params: { email_address: "ENGINEER@example.com", password: AuthHelpers::TEST_PASSWORD }, as: :json

      expect(response).to have_http_status(:created)
      expect(json["data"]).to include("email_address" => "engineer@example.com", "name" => "Test Engineer")
      expect(response.headers["Set-Cookie"]).to match(/session_id=.*httponly/i)

      get "/api/v1/subnets"
      expect(response).to have_http_status(:ok)
    end
  end

  context "when signed in" do
    it "returns the current user" do
      get "/api/v1/session"
      expect(json["data"]["email_address"]).to eq("engineer@example.com")
    end

    it "signs out and revokes the session" do
      expect { delete "/api/v1/session" }.to change(Session, :count).by(-1)
      expect(response).to have_http_status(:no_content)

      get "/api/v1/subnets"
      expect(response).to have_http_status(:unauthorized)
    end

    it "records the signed-in user as the audit actor, ignoring X-Actor" do
      post "/api/v1/subnets", params: { subnet: { cidr: "10.9.0.0/24", name: "Audit", environment: "lab" } },
                              headers: { "X-Actor" => "spoofed" }, as: :json

      expect(PaperTrail::Version.last.whodunnit).to eq("engineer@example.com")
    end
  end
end
