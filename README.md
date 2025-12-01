# Best Buy Price Watch

Track Best Buy purchases and get notified when prices drop within the return / price-match window.

## Features

- Add purchases with SKU, title, price, and purchase date  
- See active “watched” purchases that are still within the return/price-match period  
- Background price checks against Best Buy product pages  
- Stores purchase and price history in a local SQLite database via Prisma

## Tech Stack

- Next.js (App Router, TypeScript)
- React
- Prisma + SQLite (`prisma/dev.db`)
- Tailwind CSS (if you end up using it)

## Getting Started

```bash
# Install dependencies
npm install

# Set up your database
npx prisma migrate dev

# Start dev server
npm run dev
