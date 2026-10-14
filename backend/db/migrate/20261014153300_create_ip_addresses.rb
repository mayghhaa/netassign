class CreateIpAddresses < ActiveRecord::Migration[8.1]
  def change
    create_table :ip_addresses do |t|
      t.string     :address, null: false
      t.decimal    :address_int, precision: 39, scale: 0, null: false
      t.references :subnet, null: false, foreign_key: { on_delete: :cascade }
      t.integer    :status, null: false, default: 0
      t.string     :hostname
      t.string     :mac_address
      t.text       :notes

      t.timestamps
    end

    add_index :ip_addresses, %i[subnet_id address_int], unique: true
    add_index :ip_addresses, %i[subnet_id status]
    add_index :ip_addresses, :hostname
    add_index :ip_addresses, :mac_address
  end
end
