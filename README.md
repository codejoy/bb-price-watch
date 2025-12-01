# Best Buy Price Watch

Track Best Buy purchases and get notified when prices drop within the return / price-match window.

Browser window UI:
<img width="1463" height="920" alt="bbpricewatch1" src="https://github.com/user-attachments/assets/cfb5ed4f-3368-4527-ac9f-c11f9e2d79fd" />


Console debug/email script running:
<img width="1152" height="648" alt="bbpricewatch2" src="https://github.com/user-attachments/assets/b51b33ce-7ab6-4520-b56b-c51b91645613" />

Recieved email:
<img width="1046" height="314" alt="bbpricewatch3" src="https://github.com/user-attachments/assets/afb12570-5fb2-4436-a895-e0afe2c7250b" />

# 🛒 Best Buy Price Watch

Track your Best Buy purchases and automatically get notified when prices drop within the return / price-match window.

## Why I Built This

I originally hacked this together in a few hours, right after buying parts for a new PC build and thinking:

> “I bet at least one of these parts will drop in price in the next 30 days…”

Using this tool saved me 100$ on that build (some of it due to luck and timing of the finished tool being near black friday within my purchase window).
Also turns out the this was one of the few ways I could write such an app:

A) Bestbuy has the price match guarantee with themselves, other reltailers dont AFAIK...
B)  Bestbuy is one of the few companies that provides an actual API for checking the prices and such.  Kudos to them!

---

## ✨ Features

- Add Best Buy purchases with:
  - SKU
  - Title (auto-fetched if blank)
  - Paid price
  - Purchase date
- Automatically marks items as “watched” for 30 days
- Uses the Best Buy Products API to fetch real-time prices
- Tracks:
  - `lastChecked`
  - `lastPrice`
- Sends a clean email summary whenever a price drops:
  - Paid vs current price
  - Amount dropped
  - Days left to claim a price adjustment

---

