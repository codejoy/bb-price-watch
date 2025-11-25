import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPurchasesForUser } from "@/lib/purchases";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { sku, title, paidPrice, purchaseDate, watched } = body;

  if (!sku || !paidPrice || !purchaseDate) {
    return NextResponse.json(
      { error: "sku, paidPrice, and purchaseDate are required" },
      { status: 400 },
    );
  }

  const purchase = await prisma.purchase.create({
    data: {
      userId,
      sku: String(sku),
      title: title ?? null,
      paidPrice: Number(paidPrice),
      purchaseDate: new Date(purchaseDate),
      watched: watched ?? true,
    },
  });

  // Re-use helper to build view form
  const [view] = await getPurchasesForUser(userId);
  // But that returns latest-first; just recompute for this one in real app if needed.
  // For now, find the one we just created:
  const allViews = await getPurchasesForUser(userId);
  const thisView = allViews.find((p) => p.id === purchase.id);

  return NextResponse.json({ purchase: thisView }, { status: 201 });
}
