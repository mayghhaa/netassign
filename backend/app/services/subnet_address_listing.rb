# Pages through every usable address in a subnet, merging persisted IpAddress
# records with "virtual" available addresses that have no row in the database.
class SubnetAddressListing
  FILTERS = %w[all available reserved static].freeze
  MAX_PER_PAGE = 512

  Result = Struct.new(:entries, :total, :page, :per_page, keyword_init: true)

  def initialize(subnet, status: "all", query: nil, page: 1, per_page: 256)
    @subnet = subnet
    @block = subnet.block
    @status = FILTERS.include?(status.to_s) ? status.to_s : "all"
    @query = query.to_s.strip.downcase.presence
    @page = [ page.to_i, 1 ].max
    @per_page = per_page.to_i.clamp(1, MAX_PER_PAGE)
  end

  def call
    return search if @query
    return records_page(@subnet.ip_addresses.where(status: @status)) if %w[reserved static].include?(@status)
    return available_page if @status == "available"

    all_page
  end

  def counts
    tallies = @subnet.ip_addresses.allocated.group(:status).count
    reserved = tallies.fetch("reserved", 0)
    static = tallies.fetch("static", 0)
    {
      all: @block.usable_count,
      available: @block.usable_count - reserved - static,
      reserved: reserved,
      static: static
    }
  end

  private

  def offset = (@page - 1) * @per_page

  def records_page(scope)
    Result.new(
      entries: scope.order(:address_int).offset(offset).limit(@per_page).to_a,
      total: scope.count, page: @page, per_page: @per_page
    )
  end

  def search
    like = "%#{IpAddress.sanitize_sql_like(@query)}%"
    scope = @subnet.ip_addresses
      .where("address ILIKE :q OR hostname ILIKE :q OR mac_address ILIKE :q OR notes ILIKE :q", q: like)
    scope = scope.where(status: @status) unless @status == "all"
    result = records_page(scope)

    # Allow looking up a specific free address by typing it in full.
    if @page == 1 && %w[all available].include?(@status) && @block.usable?(@query) &&
       result.entries.none? { |r| r.address == @query } && !@subnet.ip_addresses.allocated.exists?(address: @query)
      result.entries.unshift(virtual(IPAddr.new(@query).to_i))
      result.total += 1
    end
    result
  end

  def all_page
    first = @block.first_usable_int + offset
    last = [ first + @per_page - 1, @block.last_usable_int ].min
    ints = first <= last ? (first..last) : []
    existing = @subnet.ip_addresses.where(address_int: first..last).index_by { |r| r.address_int.to_i }
    Result.new(
      entries: ints.map { |i| existing[i] || virtual(i) },
      total: @block.usable_count, page: @page, per_page: @per_page
    )
  end

  def available_page
    taken = @subnet.ip_addresses.allocated.order(:address_int).pluck(:address_int).map(&:to_i)
    total = @block.usable_count - taken.size
    ints = []
    candidate = nth_free(offset, taken)
    idx = taken.bsearch_index { |t| t >= candidate } || taken.size
    while ints.size < @per_page && candidate <= @block.last_usable_int
      if idx < taken.size && taken[idx] == candidate
        idx += 1
      else
        ints << candidate
      end
      candidate += 1
    end

    available_rows = @subnet.ip_addresses.available.where(address_int: ints).index_by { |r| r.address_int.to_i }
    Result.new(
      entries: ints.map { |i| available_rows[i] || virtual(i) },
      total: total, page: @page, per_page: @per_page
    )
  end

  # Integer of the n-th (0-based) free address, given sorted allocated ints.
  def nth_free(n, taken)
    candidate = @block.first_usable_int + n
    taken.each do |t|
      break if t > candidate
      candidate += 1
    end
    candidate
  end

  def virtual(int)
    IpAddress.new(subnet: @subnet, address: @block.int_to_s(int), address_int: int, status: "available")
  end
end
