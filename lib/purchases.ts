import { prisma } from "./db";

export type PurchaseView = {
  id: string;
  sku: string;
  title: string | null;
  paidPrice: number;
  purchaseDate: string; // ISO
  watched: boolean;
  lastPrice: number | null;
  lastChecked: string | null;
  isWatchedNow: boolean;
  expiresAt: string; // ISO
  daysLeft: number;
};

function toView(p: any): PurchaseView {
  const now = new Date();

  const purchaseDate = new Date(p.purchaseDate);
  const expires = new Date(purchaseDate);
  expires.setDate(expires.getDate() + 30);

  const isWatchedNow = p.watched && expires >= now;
  const daysLeft = Math.max(
    0,
    Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return {
    id: p.id,
    sku: p.sku,
    title: p.title,
    paidPrice: p.paidPrice,
    purchaseDate: purchaseDate.toISOString(),
    watched: p.watched,
    lastPrice: p.lastPrice ?? null,
    lastChecked: p.lastChecked ? new Date(p.lastChecked).toISOString() : null,
    isWatchedNow,
    expiresAt: expires.toISOString(),
    daysLeft,
  };
}

export async function getPurchasesForUser(userId: string): Promise<PurchaseView[]> {
  const purchases = await prisma.purchase.findMany({
    where: { userId },
    orderBy: { purchaseDate: "desc" },
  });

  return purchases.map(toView);
}
