# Best Buy Price Watch

Track Best Buy purchases and get notified when prices drop within the return / price-match window.

<img width="1463" height="920" alt="bbpricewatch1" src="https://github.com/user-attachments/assets/cfb5ed4f-3368-4527-ac9f-c11f9e2d79fd" />

# 🛒 Best Buy Price Watch

Track your Best Buy purchases and automatically get notified when prices drop within the return / price-match window.

## Why I Built This

I originally hacked this together in just **a few hours**, right after buying parts for a new PC build and thinking:

> “I bet at least one of these parts will drop in price in the next 30 days…”

Sure enough — using this tool **saved me over $100** on that build.  
Also turns out the this was one of the few ways I co uld write such an app.   A) Bestbuy has the price match guarantee with themselves, other reltailers dont AFAIK...
B)  Bestbuy is one of the few companies that provides an actual API for checking the prices and such.  Kudos to them!

---

## ✨ Features

- Add Best Buy purchases with:
  - SKU
  - Title (auto-fetched if blank)
  - Paid price
  - Purchase date
- Automatically marks items as “watched” for 30 days
- Uses the **Best Buy Products API** to fetch real-time prices
- Tracks:
  - `lastChecked`
  - `lastPrice`
- Sends a clean email summary whenever a price drops:
  - Paid vs current price
  - Amount dropped
  - Days left to claim a price adjustment

---

