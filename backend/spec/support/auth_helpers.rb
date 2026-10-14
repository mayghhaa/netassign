module AuthHelpers
  TEST_PASSWORD = "password123".freeze

  def create_user(email: "engineer@example.com", name: "Test Engineer")
    User.create!(email_address: email, name: name, password: TEST_PASSWORD)
  end

  def sign_in(user = create_user)
    post "/api/v1/session", params: { email_address: user.email_address, password: TEST_PASSWORD }, as: :json
    user
  end
end

RSpec.configure do |config|
  config.include AuthHelpers, type: :request
  config.before(:each, type: :request) do |example|
    sign_in unless example.metadata[:unauthenticated]
  end
end
