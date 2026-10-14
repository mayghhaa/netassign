# Idempotent demo data: bin/rails db:seed
PaperTrail.request.whodunnit = "seed"

unless Rails.env.production?
  User.find_or_create_by!(email_address: "admin@netassign.local") do |user|
    user.name = "Demo Admin"
    user.password = "netassign-demo"
  end
end

subnets = [
  { cidr: "10.0.0.0/24", name: "Core Servers", vlan_id: 10, environment: "production", description: "Primary datacenter server VLAN" },
  { cidr: "10.0.1.0/24", name: "Database Tier", vlan_id: 20, environment: "production", description: "PostgreSQL & Redis clusters" },
  { cidr: "10.10.0.0/23", name: "Staging Apps", vlan_id: 110, environment: "staging" },
  { cidr: "172.16.0.0/26", name: "Lab Hardware", vlan_id: 300, environment: "lab" },
  { cidr: "192.168.50.0/28", name: "DMZ Edge", vlan_id: 500, environment: "dmz", description: "Load balancers and bastion hosts" },
  { cidr: "2001:db8:100::/120", name: "IPv6 Pilot", vlan_id: 600, environment: "development" }
]

subnets.each do |attrs|
  subnet = Subnet.find_or_create_by!(cidr: attrs[:cidr]) { |s| s.assign_attributes(attrs) }
  next if subnet.ip_addresses.exists?

  allocator = IpAllocator.new(subnet)
  count = { 24 => 40, 23 => 120, 26 => 12, 28 => 9, 120 => 6 }.fetch(subnet.block.prefix, 5)
  count.times do |i|
    static = i.even?
    allocator.allocate(
      status: static ? "static" : "reserved",
      hostname: static ? "#{subnet.name.parameterize}-#{format('%02d', i + 1)}.corp.example" : nil,
      mac_address: static ? format("02:00:%02x:%02x:%02x:%02x", subnet.id % 256, i / 256, i % 256, rand(256)) : nil,
      notes: static ? nil : "Reserved for future expansion"
    )
  end
end

puts "Seeded #{Subnet.count} subnets and #{IpAddress.count} IP records."
