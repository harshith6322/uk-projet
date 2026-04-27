# 🌿 Fresh Picks

WhatsApp group ordering, solved. A full-stack Next.js ordering platform for Srinu's fresh produce business.

---

## Features

| Feature | Details |
|---|---|
| 🛍️ Customer storefront | Browse products, add to cart, place order |
| 📧 Email confirmation | Customer gets order confirmation, admin gets alert |
| 📊 Admin dashboard | Stats, today's picking list, all orders |
| 📋 Order management | View, filter, mark collected / cancel |
| 📦 Stock management | +/- stock per product, hide products, low-stock warnings |
| 🔐 Admin auth | Password + Gmail OTP (two-factor) |
| 🗄️ SQLite | Zero-cost DB, persistent Docker volume |
| 🐳 Docker ready | Standalone Next.js build, Swarm-compatible |

---

## Quick Start (Local Dev)

```bash
# 1. Clone and install
cd fresh-picks
npm install

# 2. Copy and fill env
cp .env.example .env
# Edit .env with your values (see below)

# 3. Init DB + seed products
npx prisma db push
node prisma/seed.js

# 4. Run
npm run dev
```

Open http://localhost:3000 → customer shop  
Open http://localhost:3000/admin → admin login

---

## Environment Variables

```env
DATABASE_URL="file:./dev.db"          # SQLite path

ADMIN_EMAIL="srinu@gmail.com"         # Receives OTP + order alerts
ADMIN_PASSWORD="yourpassword"         # First login step

JWT_SECRET="run: openssl rand -base64 32"

# Gmail SMTP — use App Password (not your real password)
# Enable at: myaccount.google.com → Security → App passwords
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="srinu@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"      # 16-char Gmail App Password
SMTP_FROM="Fresh Picks <srinu@gmail.com>"

NEXT_PUBLIC_APP_NAME="Fresh Picks"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### Gmail App Password Setup
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Search "App passwords" → create one for "Mail"
4. Use the 16-char password as `SMTP_PASS`

---

## Docker Deploy (Your VPS)

```bash
# Build image
docker build -t fresh-picks:latest .

# Run with compose (simplest)
cp .env.example .env   # fill values
docker compose up -d

# App runs on :3000 — put Nginx in front
```

### Docker Swarm (your existing setup)

```bash
# Tag and push to your registry or retag locally
docker build -t fresh-picks:latest .

# Deploy stack (uses netv3 network)
docker stack deploy -c stack.yml fresh-picks

# Check
docker service ls
docker service logs fresh-picks_fresh-picks
```

**Stack uses your existing `netv3` network** — same as your other services.

---

## Nginx (SSL termination)

Copy `nginx.conf` to `/etc/nginx/sites-available/fresh-picks`:

```bash
# Replace yourdomain.com in nginx.conf first, then:
sudo ln -s /etc/nginx/sites-available/fresh-picks /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL with certbot
sudo certbot --nginx -d yourdomain.com
```

---

## Database Management

```bash
# View DB in browser UI
npm run db:studio

# Re-seed products (won't duplicate)
npm run db:seed

# Schema changes → migrate
npx prisma db push

# Backup SQLite (from host if using volume)
docker exec <container> cat /app/data/prod.db > backup-$(date +%Y%m%d).db
```

---

## Adding Products

**Option 1 — Edit seed file** (`prisma/seed.js`) and re-run `node prisma/seed.js`

**Option 2 — API** (authenticated):
```bash
curl -X POST https://yourdomain.com/api/admin/products \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=<token>" \
  -d '{"name":"Mangoes","emoji":"🥭","description":"Alphonso mangoes","price":3.50,"unit":"pack","stock":20,"maxPerOrder":5}'
```

**Option 3 — Prisma Studio** (`npm run db:studio`) — visual table editor

---

## Scaling

| Traffic | Recommendation |
|---|---|
| < 500 orders/day | SQLite + single Docker container, fine as-is |
| 500–5000/day | Switch `DATABASE_URL` to PostgreSQL (change `provider` in `schema.prisma`) |
| > 5000/day | Add Redis for sessions, CDN for static assets |

SQLite → PostgreSQL migration is a one-line schema change + data export:
```bash
# In schema.prisma, change:
# provider = "sqlite"  →  provider = "postgresql"
# Then: npx prisma migrate deploy
```

---

## Admin Flow

1. Go to `/admin`
2. Enter admin password
3. Check email for 6-digit OTP (valid 10 min)
4. Enter OTP → logged in for 24h

---

## Project Structure

```
fresh-picks/
├── app/
│   ├── order/page.tsx          # Customer storefront
│   ├── order-confirmation/     # Thank you page
│   ├── admin/
│   │   ├── page.tsx            # Dashboard (stats/orders/stock)
│   │   └── login/page.tsx      # Admin login
│   └── api/
│       ├── products/           # Public product list
│       ├── orders/             # Place order
│       ├── auth/               # Login, OTP, logout
│       └── admin/              # Protected admin APIs
├── lib/
│   ├── prisma.ts               # DB client
│   ├── email.ts                # Nodemailer (order confirm, OTP, alert)
│   └── auth.ts                 # JWT, bcrypt, OTP generation
├── prisma/
│   ├── schema.prisma           # DB schema
│   └── seed.js                 # Seed products
├── middleware.ts               # Admin route protection
├── Dockerfile                  # Standalone Next.js build
├── docker-compose.yml          # Local/dev deploy
├── stack.yml                   # Swarm production deploy
└── nginx.conf                  # Reverse proxy config
```
