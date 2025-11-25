import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";


const WINDOW_DAYS = 30; // later you can change this to 60, or pull from env

// ------------------ Prisma setup ------------------

const prisma = new PrismaClient();

// ------------------ Best Buy helper (inline) ------------------

const BESTBUY_API_KEY = process.env.BESTBUY_API_KEY;

if (!BESTBUY_API_KEY) {
  console.warn(
    "BESTBUY_API_KEY is not set. Best Buy lookup will not work until you add it to .env.local"
  );
}

type BestBuyProduct = {
  sku: string;
  title: string;
  salePrice: number | null;
  regularPrice: number | null;
  url: string | null;
};

async function fetchBestBuyProductBySku(
  sku: string
): Promise<BestBuyProduct | null> {
  if (!BESTBUY_API_KEY) {
    console.error("Missing BESTBUY_API_KEY env var");
    return null;
  }

  const trimmedSku = String(sku).trim();

  const url = `https://api.bestbuy.com/v1/products/${encodeURIComponent(
    trimmedSku
  )}.json?apiKey=${BESTBUY_API_KEY}`;

  console.log("Best Buy fetch URL (cron):", url);

  const res = await fetch(url);

  if (!res.ok) {
    if (res.status === 404) {
      console.warn("Best Buy API 404 for SKU", trimmedSku);
      return null;
    }

    // Treat 403 / other codes as "no data" but log them
    console.warn(
      "Best Buy API non-OK for SKU",
      trimmedSku,
      "status",
      res.status
    );
    return null;
  }

  const data = await res.json();

  const title = data.name ?? null;
  const salePrice =
    typeof data.salePrice === "number" ? data.salePrice : null;
  const regularPrice =
    typeof data.regularPrice === "number" ? data.regularPrice : null;
  const productUrl = typeof data.url === "string" ? data.url : null;

  return {
    sku: trimmedSku,
    title: title ?? `SKU ${trimmedSku}`,
    salePrice,
    regularPrice,
    url: productUrl,
  };
}

// ------------------ Price check + email logic ------------------

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type DropInfo = {
  sku: string;
  title: string | null;
  paidPrice: number;
  currentPrice: number;
  priceDrop: number;
  daysLeft: number;        // 👈 add this

};

async function checkPricesForUser(
  userId: string,
  userEmail: string
): Promise<DropInfo[]> {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(now.getDate() - 30);

  const watchedPurchases = await prisma.purchase.findMany({
    where: {
      userId,
      watched: true,
      purchaseDate: {
        gte: cutoff,
      },
    },
  });

  const drops: DropInfo[] = [];

  for (const p of watchedPurchases) {
    console.log(
      `[${new Date().toISOString()}] About to sleep 2000ms before SKU`,
      p.sku
    );
    await sleep(750); // <--- this is the important one
    console.log(
      `[${new Date().toISOString()}] Waking up, now fetching SKU`,
      p.sku
    );

    try {
      const product = await fetchBestBuyProductBySku(p.sku);

      if (!product) {
        await prisma.purchase.update({
          where: { id: p.id },
          data: { lastChecked: now },
        });
        continue;
      }

      const currentPrice =
        product.salePrice ?? product.regularPrice ?? null;

      await prisma.purchase.update({
        where: { id: p.id },
        data: {
          lastPrice: currentPrice,
          lastChecked: now,
        },
      });

      if (currentPrice != null && currentPrice < p.paidPrice) {
        const msDiff = now.getTime() - p.purchaseDate.getTime();
        const daysSincePurchase = Math.floor(msDiff / (1000 * 60 * 60 * 24));
         const daysLeft = Math.max(WINDOW_DAYS - daysSincePurchase, 0);
        drops.push({
          sku: p.sku,
          title: p.title ?? product.title,
          paidPrice: p.paidPrice,
          currentPrice,
          priceDrop: p.paidPrice - currentPrice,
          daysLeft,
        });
      }
    } catch (err) {
      console.error("Error checking SKU", p.sku, "for user", userEmail, err);
      await prisma.purchase.update({
        where: { id: p.id },
        data: { lastChecked: now },
      });
    }
  }

  return drops;
}

async function sendEmail(drops: DropInfo[], checkedAt: Date) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const recipient = process.env.ALERT_RECIPIENT ?? gmailUser;

  if (!gmailUser || !gmailPass) {
    console.error("GMAIL_USER or GMAIL_APP_PASSWORD not set in env.");
    return;
  }

  if (!recipient) {
    console.error("No ALERT_RECIPIENT or GMAIL_USER set for email delivery.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const totalSaved = drops.reduce((sum, d) => sum + d.priceDrop, 0);

   const lines = drops
     .map((d) => {
       const daysText =
         d.daysLeft > 0
          ? `${d.daysLeft} day${d.daysLeft === 1 ? "" : "s"} left to claim`
          : "window likely expired";
      return `${d.title || `SKU ${d.sku}`}: paid $${d.paidPrice.toFixed(
        2,
      )}, current $${d.currentPrice.toFixed(
        2,
      )} (↓ $${d.priceDrop.toFixed(2)}), ${daysText}`;
    })
    .join("\n");
  const htmlLines = drops
  .map((d) => {
    const daysText =
      d.daysLeft > 0
        ? `${d.daysLeft} day${d.daysLeft === 1 ? "" : "s"} left to claim`
        : "window likely expired";
    return `<li>
      <strong>${d.title || `SKU ${d.sku}`}</strong>:
      paid $${d.paidPrice.toFixed(2)},
      current $${d.currentPrice.toFixed(2)}
      (<strong>↓ $${d.priceDrop.toFixed(2)}</strong>) –
      <em>${daysText}</em>
    </li>`;
  })
  .join("");

  const subject = `Best Buy Price Watch: ${drops.length} item${
    drops.length > 1 ? "s" : ""
  } dropped (total ↓ $${totalSaved.toFixed(2)})`;

  const text = `Price check at ${checkedAt.toLocaleString()} found ${
    drops.length
  } item(s) with drops:\n\n${lines}`;

  const html = `
    <p>Price check at ${checkedAt.toLocaleString()} found ${
      drops.length
    } item(s) with drops:</p>
    <ul>
      ${htmlLines}
    </ul>
    <p><strong>Total potential savings:</strong> $${totalSaved.toFixed(2)}</p>
  `;

  await transporter.sendMail({
    from: gmailUser,
    to: recipient,
    subject,
    text,
    html,
  });

  console.log(`Sent email to ${recipient} for ${drops.length} drops.`);
}

async function main() {
  const now = new Date();
  console.log("Running scheduled price check at", now.toISOString());

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  // Get all users who have at least one watched purchase in last 30 days
  const usersWithWatched = await prisma.user.findMany({
    where: {
      purchases: {
        some: {
          watched: true,
          purchaseDate: {
            gte: cutoff,
          },
        },
      },
    },
  });

  if (usersWithWatched.length === 0) {
    console.log("No users with active watched purchases. Nothing to do.");
    return;
  }

  for (const user of usersWithWatched) {
    if (!user.email) continue;
    console.log("Checking prices for user:", user.email);

    const drops = await checkPricesForUser(user.id, user.email);

    if (drops.length > 0) {
      console.log(
        `User ${user.email} has ${drops.length} item(s) with price drops.`,
      );
      await sendEmail(drops, now);
    } else {
      console.log(`No price drops for user ${user.email}.`);
    }
  }
}

main()
  .catch((err) => {
    console.error("Error in scheduled price check:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
