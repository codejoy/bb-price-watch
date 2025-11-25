import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPurchasesForUser } from "@/lib/purchases";
import { fetchBestBuyProductBySku } from "@/lib/bestbuy";

type PriceCheckResult = {
  id: string;
  sku: string;
  title: string | null;
  paidPrice: number;
  currentPrice: number | null;
  priceDrop: number; // paid - current (0 if no drop or no price)
};


function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(now.getDate() - 30);

  // Get watched purchases still inside the 30-day window
  const watchedPurchases = await prisma.purchase.findMany({
    where: {
      userId,
      watched: true,
      purchaseDate: {
        gte: cutoff,
      },
    },
  });

  if (watchedPurchases.length === 0) {
    const views = await getPurchasesForUser(userId);
    return NextResponse.json(
      { results: [] as PriceCheckResult[], purchases: views },
      { status: 200 },
    );
  }

  const results: PriceCheckResult[] = [];
  const nowISO = now.toISOString();

  for (const p of watchedPurchases) {
    try {
      // prevent Best Buy 403 from rate-limiting
      await sleep(750);
      const product = await fetchBestBuyProductBySku(p.sku);

      if (!product) {
        // still update lastChecked so we know we tried
        await prisma.purchase.update({
          where: { id: p.id },
          data: { lastChecked: now },
        });
        results.push({
          id: p.id,
          sku: p.sku,
          title: p.title,
          paidPrice: p.paidPrice,
          currentPrice: null,
          priceDrop: 0,
        });
        continue;
      }

      const currentPrice =
        product.salePrice ?? product.regularPrice ?? null;

      let priceDrop = 0;
      if (currentPrice != null && currentPrice < p.paidPrice) {
        priceDrop = p.paidPrice - currentPrice;
      }

      await prisma.purchase.update({
        where: { id: p.id },
        data: {
          lastPrice: currentPrice,
          lastChecked: now,
        },
      });

      results.push({
        id: p.id,
        sku: p.sku,
        title: p.title ?? product.title,
        paidPrice: p.paidPrice,
        currentPrice,
        priceDrop,
      });
    } catch (err) {
      console.error("Price check failed for SKU", p.sku, err);
      // just record a "no data" result
      await prisma.purchase.update({
        where: { id: p.id },
        data: { lastChecked: now },
      });
      results.push({
        id: p.id,
        sku: p.sku,
        title: p.title,
        paidPrice: p.paidPrice,
        currentPrice: null,
        priceDrop: 0,
      });
    }
  }

  // Re-load all purchases in view shape
  const updatedViews = await getPurchasesForUser(userId);

  return NextResponse.json(
    {
      checkedAt: nowISO,
      results,
      purchases: updatedViews,
    },
    { status: 200 },
  );
}
