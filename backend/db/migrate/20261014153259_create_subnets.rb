class CreateSubnets < ActiveRecord::Migration[8.1]
  def change
    enable_extension "btree_gist"

    create_table :subnets do |t|
      t.string  :cidr, null: false
      t.string  :name, null: false
      t.integer :vlan_id
      t.string  :environment, null: false, default: "development"
      t.text    :description
      t.integer :ip_version, null: false
      t.decimal :range_start, precision: 39, scale: 0, null: false
      t.decimal :range_end,   precision: 39, scale: 0, null: false

      t.timestamps
    end

    add_index :subnets, :cidr, unique: true
    add_index :subnets, :environment
    add_check_constraint :subnets, "vlan_id IS NULL OR (vlan_id BETWEEN 1 AND 4094)", name: "subnets_vlan_id_range"
    add_check_constraint :subnets, "range_start <= range_end", name: "subnets_range_order"

    # Database-level guarantee that no two subnets of the same IP family intersect.
    add_exclusion_constraint :subnets,
      "ip_version WITH =, numrange(range_start, range_end, '[]') WITH &&",
      using: :gist, name: "subnets_no_overlap"
  end
end
