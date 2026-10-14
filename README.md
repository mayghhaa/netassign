# NetAssign

IP Address Management (IPAM) portal: a **Rails 8 API** (`backend/`) and a **React + Vite + Tailwind SPA** (`frontend/`).

## Features

**Backend (`backend/`)**
- PostgreSQL schema: `subnets` (`cidr`, `name`, `vlan_id`, `environment`, …) and `ip_addresses` (`address`, `subnet_id`, `status` enum `available|reserved|static`, `hostname`, `mac_address`, `notes`).
- IP math built on Ruby's `IPAddr` (`app/lib/cidr_block.rb`): CIDR parsing/normalization, netmask, broadcast, usable host range (RFC 3021 `/31` and `/32` handled), and IPv6 support.
- Custom validators (`app/validators/`): `cidr`, `ip_address`, `mac_address`, `hostname`.
- **Overlap detection**: each subnet stores its integer start/end boundaries. The model rejects any range intersection (`start_a <= end_b AND start_b <= end_a`), and a PostgreSQL `EXCLUDE USING gist` constraint enforces the same rule at the database level to cover race conditions.
- Allocation (`app/services/ip_allocator.rb`): assign a specific address or the next free one. Allocations are serialized per subnet with a row lock.
- Address listing (`app/services/subnet_address_listing.rb`): pages through every usable address in a block and merges stored records with virtual "available" addresses, so free addresses don't need their own rows.
- Audit trail via `paper_trail` (jsonb `object` / `object_changes`). Each version records the actor from the `X-Actor` request header.
- `rack-cors` configured for the Vite dev server (`FRONTEND_ORIGINS` overrides the defaults).

**Frontend (`frontend/`)**
- Routes: Dashboard (`/`), Subnet Detail (`/subnets/:id`), Audit Logs (`/audit`).
- Custom hooks: `useSubnets`, `useSubnetDetails` (re-fetches when filters change and polls every 15s so the table stays current), `useAllocateIp`, `useAuditLogs`, `useActor`.
- Dashboard: utilization progress bars, summary stats, search and environment filters, and a create-subnet modal with a live CIDR preview.
- Subnet Detail: network info, a status filter with counts (All / Available / Reserved / Static), search by IP, hostname or MAC, and a paginated address table.
- Allocation modal: static or reserved assignment, hostname, MAC and notes, plus a "Next available" lookup. Field-level validation runs both client-side and server-side.

## API (`/api/v1`)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/subnets?environment=&q=` | List subnets with utilization |
| POST | `/subnets` | Create (`{ subnet: { cidr, name, vlan_id, environment, description } }`) |
| GET/PATCH/DELETE | `/subnets/:id` | Show (includes network details) / update / delete |
| GET | `/subnets/:id/ip_addresses?status=&q=&page=&per_page=` | Paginated address table (all usable addresses) |
| GET | `/subnets/:id/ip_addresses/next_available` | Lowest free usable address |
| POST | `/subnets/:id/ip_addresses` | Allocate (`address` optional → next available) |
| GET/PATCH/DELETE | `/ip_addresses/:id` | Show / update / release |
| GET | `/audit_logs?item_type=&event=&actor=&subnet_id=&page=` | PaperTrail history |

Validation errors return `422` with the shape `{ "error": "...", "errors": { "field": ["message"] } }`.

## Local development

Requirements: Ruby 3.3, Node 22, and PostgreSQL 14+ with the `btree_gist` extension (included in the standard contrib package).

```bash
# API → http://localhost:3000
cd backend
bundle install
bin/rails db:prepare      # creates, migrates, and seeds demo data
bin/rails server

# SPA → http://localhost:5173 (proxies /api to :3000)
cd frontend
npm install
npm run dev
```

Set `API_PROXY_TARGET` to change the dev proxy target, or `VITE_API_URL` to call the API directly (CORS).

## Tests & linting

```bash
cd backend && bundle exec rspec && bin/rubocop
cd frontend && npm run lint && npm run build
```
