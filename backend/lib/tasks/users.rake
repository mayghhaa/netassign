namespace :users do
  desc "Create or update a user: bin/rails users:create EMAIL=... NAME=... PASSWORD=..."
  task create: :environment do
    email, name, password = ENV.values_at("EMAIL", "NAME", "PASSWORD")
    abort "EMAIL, NAME and PASSWORD are required" if [ email, name, password ].any?(&:blank?)

    user = User.find_or_initialize_by(email_address: email)
    user.update!(name: name, password: password)
    puts "Saved #{user.email_address}"
  end
end
