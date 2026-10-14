// Client-side CIDR math (BigInt so IPv6 works) for instant form feedback.
// The Rails API remains the source of truth for validation.

function parseIPv4(str) {
  const parts = str.split('.')
  if (parts.length !== 4) return null
  let value = 0n
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null
    value = (value << 8n) + BigInt(part)
  }
  return value
}

function parseIPv6(str) {
  if (!/^[0-9a-f:]+$/i.test(str) || (str.match(/::/g) ?? []).length > 1) return null
  const [head, tail] = str.includes('::') ? str.split('::') : [str, null]
  const headParts = head ? head.split(':') : []
  const tailParts = tail ? tail.split(':') : []
  const missing = 8 - headParts.length - tailParts.length
  if (tail === null ? missing !== 0 : missing < 1) return null
  const groups = [...headParts, ...Array(tail === null ? 0 : missing).fill('0'), ...tailParts]
  let value = 0n
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null
    value = (value << 16n) + BigInt(parseInt(group, 16))
  }
  return value
}

function formatIPv4(value) {
  return [24n, 16n, 8n, 0n].map((shift) => ((value >> shift) & 255n).toString()).join('.')
}

function formatIPv6(value) {
  const groups = []
  for (let shift = 112n; shift >= 0n; shift -= 16n) groups.push(((value >> shift) & 0xffffn).toString(16))
  let best = { start: -1, len: 0 }
  for (let i = 0; i < 8; ) {
    if (groups[i] !== '0') { i++; continue }
    let j = i
    while (j < 8 && groups[j] === '0') j++
    if (j - i > best.len && j - i > 1) best = { start: i, len: j - i }
    i = j
  }
  if (best.start < 0) return groups.join(':')
  return `${groups.slice(0, best.start).join(':')}::${groups.slice(best.start + best.len).join(':')}`
}

export function describeCidr(input) {
  const value = input.trim()
  if (!value) return null
  const [address, prefixStr, extra] = value.split('/')
  if (extra !== undefined || prefixStr === undefined || !/^\d{1,3}$/.test(prefixStr)) {
    return { error: 'Use CIDR notation, e.g. 10.0.0.0/24' }
  }
  const v4 = parseIPv4(address)
  const v6 = v4 === null ? parseIPv6(address) : null
  if (v4 === null && v6 === null) return { error: 'Not a valid IPv4 or IPv6 address' }

  const bits = v4 !== null ? 32n : 128n
  const prefix = BigInt(prefixStr)
  if (prefix > bits) return { error: `Prefix must be between 0 and ${bits}` }

  const size = 1n << (bits - prefix)
  const network = ((v4 ?? v6) / size) * size
  const last = network + size - 1n
  const reservesEdges = v4 !== null && prefix <= 30n
  const fmt = v4 !== null ? formatIPv4 : formatIPv6

  return {
    version: v4 !== null ? 4 : 6,
    normalized: `${fmt(network)}/${prefix}`,
    hostBitsSet: network !== (v4 ?? v6),
    usable: reservesEdges ? size - 2n : size,
    firstUsable: fmt(reservesEdges ? network + 1n : network),
    lastUsable: fmt(reservesEdges ? last - 1n : last),
  }
}
