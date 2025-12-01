# Best Buy Price Watch

Track Best Buy purchases and get notified when prices drop within the return / price-match window.

<img width="1463" height="920" alt="bbpricewatch1" src="https://github.com/user-attachments/assets/cfb5ed4f-3368-4527-ac9f-c11f9e2d79fd" />
<img width="1152" height="648" alt="bbpricewatch2" src="https://github.com/user-attachments/assets/6a7e74e5-960f-46b1-b218-0071d2c44ce6" />

# 🛒 Best Buy Price Watch

Track your Best Buy purchases and automatically get notified when prices drop within the return / price-match window.

## Why I Built This

I originally hacked this together in just **a few hours**, right after buying parts for a new PC build and thinking:

> “I bet at least one of these parts will drop in price in the next 30 days…”

Sure enough — using this tool **saved me over $100** on that build.  
Future me is grateful. Present me is even happier. 😄

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

## 🖼️ Screenshots

Screenshots live in the `assets/` folder.  
Add yours and reference them like:

```markdown
![Main UI](assets/screenshot1.png)
![Price Check Output](assets/screenshot2.png)
