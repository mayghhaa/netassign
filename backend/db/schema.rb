# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_14_153300) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "btree_gist"
  enable_extension "pg_catalog.plpgsql"

  create_table "ip_addresses", force: :cascade do |t|
    t.string "address", null: false
    t.decimal "address_int", precision: 39, null: false
    t.bigint "subnet_id", null: false
    t.integer "status", default: 0, null: false
    t.string "hostname"
    t.string "mac_address"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["hostname"], name: "index_ip_addresses_on_hostname"
    t.index ["mac_address"], name: "index_ip_addresses_on_mac_address"
    t.index ["subnet_id", "address_int"], name: "index_ip_addresses_on_subnet_id_and_address_int", unique: true
    t.index ["subnet_id", "status"], name: "index_ip_addresses_on_subnet_id_and_status"
    t.index ["subnet_id"], name: "index_ip_addresses_on_subnet_id"
  end

  create_table "subnets", force: :cascade do |t|
    t.string "cidr", null: false
    t.string "name", null: false
    t.integer "vlan_id"
    t.string "environment", default: "development", null: false
    t.text "description"
    t.integer "ip_version", null: false
    t.decimal "range_start", precision: 39, null: false
    t.decimal "range_end", precision: 39, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["cidr"], name: "index_subnets_on_cidr", unique: true
    t.index ["environment"], name: "index_subnets_on_environment"
    t.check_constraint "range_start <= range_end", name: "subnets_range_order"
    t.check_constraint "vlan_id IS NULL OR vlan_id >= 1 AND vlan_id <= 4094", name: "subnets_vlan_id_range"
    t.exclusion_constraint "ip_version WITH =, numrange(range_start, range_end, '[]'::text) WITH &&", using: :gist, name: "subnets_no_overlap"
  end

  create_table "versions", force: :cascade do |t|
    t.string "item_type", null: false
    t.bigint "item_id", null: false
    t.string "event", null: false
    t.string "whodunnit"
    t.jsonb "object"
    t.jsonb "object_changes"
    t.datetime "created_at"
    t.index ["created_at"], name: "index_versions_on_created_at"
    t.index ["item_type", "item_id"], name: "index_versions_on_item_type_and_item_id"
  end

  add_foreign_key "ip_addresses", "subnets", on_delete: :cascade
end
