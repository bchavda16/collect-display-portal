# collect&display — Distribution Portal

Private B2B wholesale ordering portal for **Collect and Display** retailers. Built with Next.js 14, Prisma, Supabase, and NextAuth.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| ORM | Prisma + PostgreSQL |
| Auth | NextAuth v5 (JWT, Credentials) |
| Storage | Supabase Storage |
| Email | Resend |
| State / Data | TanStack Query |
| Forms | React Hook Form + Zod |
| Deployment | Vercel + Supabase |

---

## Prerequisites

- Node.js 20+
- Docker (for local Postgres) — or a remote Postgres URL
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) account

---

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd collect-display-portal
npm install
```

### 2. Start the local database

```bash
docker compose up -d postgres
```

This starts a Postgres 16 instance on `localhost:5432`.

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables (see `.env.example` for the full list):

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `NEXTAUTH_SECRET` | Random 32+ character string (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | `http://localhost:3000` locally |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | `noreply@collectanddisplay.com` |

### 4. Set up Supabase Storage buckets

In your Supabase dashboard → Storage, create three **private** buckets:

- `product-images`
- `invoices`
- `imports`

Then set RLS policies:

```sql
-- Allow authenticated users to read their own retailer's invoices
-- (the app uses signed URLs via the service role key, so no public access needed)
-- Leave buckets as private — access is handled via supabaseAdmin in API routes.
```

### 5. Run database migrations

```bash
npx prisma migrate dev
```

This creates all tables and runs any pending migrations.

### 6. Seed sample data

```bash
npx prisma db seed
```

Creates:
- Admin account: `admin@collectanddisplay.com` / `Admin1234!`
- Demo retailer: `demo@galaxycollectibles.co.uk` / `Retailer1234!`
- 11 sample products across 4 brands (POP MART, Funko, Sonny Angel, SMISKI)
- 3 announcements

### 7. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (portal)/              # Retailer-facing pages
│   │   ├── dashboard/
│   │   ├── stock/
│   │   ├── orders/[id]/
│   │   ├── checkout/
│   │   ├── tracking/
│   │   └── account/
│   ├── admin/                 # Admin pages
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── retailers/
│   │   └── imports/
│   └── api/                   # API routes
│       ├── auth/
│       ├── products/
│       ├── orders/
│       ├── basket/
│       ├── retailers/
│       ├── brands/
│       ├── announcements/
│       ├── imports/
│       ├── account/
│       └── admin/stats/
├── components/
│   ├── ui/                    # Button, Input, Badge, Toaster
│   ├── portal/                # PortalSidebar, BasketDrawer, ProductCard
│   └── admin/                 # AdminSidebar
├── hooks/                     # useBasket, useDebounce
├── lib/                       # prisma, auth, email, supabase, utils, validations
├── middleware.ts              # Route protection
└── types/index.ts             # Shared TypeScript types
```

---

## Key Concepts

### Roles

| Role | Access |
|---|---|
| `ADMIN` | Full access to `/admin/*`. Can manage products, orders, retailers, and imports. |
| `RETAILER` | Access to `/portal/*` only. Scoped to their own orders and basket. |

### Pricing

All monetary values are stored in **pence** (integer) to avoid floating point issues. The `formatCurrencyFromPounds(pence)` utility handles display formatting.

### Order Numbers

Orders use the format `CAD-XXXX` (e.g. `CAD-0042`), generated via `generateOrderNumber()` in `src/lib/utils.ts`.

### Order Flow

```
Basket → Checkout (PO ref required)
  → POST /api/orders
    → Stock deducted (transaction)
    → Basket cleared
    → Confirmation email sent to retailer
    → Alert email sent to admin
  → Status: PLACED
    → CONFIRMED → PROCESSING → PICKED → PACKED
    → DISPATCHED (tracking number added)
    → OUT_FOR_DELIVERY → DELIVERED
```

### Bulk Import (CSV)

Upload product CSVs via Admin → Imports. The CSV must include these columns:

```
sku, name, brand, type, unit_cost, cdu_size, rrp, stock, description
```

The importer:
1. Validates each row
2. Shows a preview with error counts
3. On confirm: upserts brands and products, saves the file to Supabase

---

## Deployment (Vercel + Supabase)

### Database

Use the Supabase-provided Postgres connection string in `DATABASE_URL`. Use the **pooled** connection string for serverless:

```
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"
```

Add `directUrl = env("DIRECT_URL")` to `prisma/schema.prisma` under `datasource db` for migrations.

### Run migrations in production

```bash
npx prisma migrate deploy
```

### Vercel

1. Import the repo into Vercel
2. Set all environment variables in the Vercel dashboard (same as `.env.local`, minus `NEXTAUTH_URL` — Vercel sets this automatically via `VERCEL_URL`)
3. Set `NEXTAUTH_URL` to your production domain: `https://portal.collectanddisplay.com`
4. Deploy

### Custom domain

Point `portal.collectanddisplay.com` (or your preferred subdomain) to the Vercel deployment via CNAME.

---

## Email Templates

Emails are sent via [Resend](https://resend.com). Templates are defined in `src/lib/email.ts`:

| Function | Trigger |
|---|---|
| `sendOrderConfirmation` | New order placed by retailer |
| `sendAdminNewOrderAlert` | New order placed (to admin) |
| `sendStatusUpdate` | Admin updates order status |
| `sendInvoiceNotification` | Invoice uploaded to order |
| `sendWelcomeEmail` | New retailer account created |
| `sendPasswordReset` | Password reset requested |

---

## Useful Commands

```bash
# Dev server
npm run dev

# Build
npm run build

# Type check
npm run type-check

# Lint
npm run lint

# Prisma Studio (DB browser)
npx prisma studio

# Generate Prisma client after schema changes
npx prisma generate

# Create and apply a new migration
npx prisma migrate dev --name <migration-name>

# Push schema changes without migration (dev only)
npx prisma db push

# Reset the database and re-seed
npx prisma migrate reset
```

---

## Environment Variables Reference

See `.env.example` for the full list. The minimum required for local development:

```env
DATABASE_URL="postgresql://cad:cad_dev_password@localhost:5432/collect_display"
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon key>"
SUPABASE_SERVICE_ROLE_KEY="<service role key>"
RESEND_API_KEY="re_<your key>"
EMAIL_FROM="noreply@collectanddisplay.com"
VAT_RATE="0.20"
```

---

## Contact

Internal tool for **Collect and Display**. For access issues contact the admin team.
