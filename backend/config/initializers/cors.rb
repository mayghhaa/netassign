# Allow the React SPA (Vite dev server by default) to call the API.
# Override with FRONTEND_ORIGINS="https://a.example.com,https://b.example.com".
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*ENV.fetch("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",").map(&:strip))

    resource "/api/*",
      headers: :any,
      methods: %i[get post put patch delete options head],
      credentials: true,
      max_age: 600
  end
end
