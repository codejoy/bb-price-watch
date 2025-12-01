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






<img width="1463" height="920" alt="bbpricewatch1" src="https://github.com/user-attachments/assets/cfb5ed4f-3368-4527-ac9f-c11f9e2d79fd" />
<img width="1152" height="648" alt="bbpricewatch2" src="https://github.com/user-attachments/assets/6a7e74e5-960f-46b1-b218-0071d2c44ce6" />
