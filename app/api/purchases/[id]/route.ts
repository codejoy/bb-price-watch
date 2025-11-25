import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPurchasesForUser } from "@/lib/purchases";

// PUT /api/purchases/:id  → edit a purchase
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { sku, title, paidPrice, purchaseDate, watched } = body;

  if (!purchaseDate || paidPrice == null) {
    return NextResponse.json(
      { error: "paidPrice and purchaseDate are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.purchase.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.purchase.update({
    where: { id },
    data: {
      sku: sku ?? existing.sku,
      title: title ?? existing.title,
      paidPrice: Number(paidPrice),
      purchaseDate: new Date(purchaseDate),
      watched: watched ?? existing.watched,
    },
  });

  const allViews = await getPurchasesForUser(userId);
  const updated = allViews.find((p) => p.id === id);

  return NextResponse.json({ purchase: updated }, { status: 200 });
}

// DELETE /api/purchases/:id  → delete a purchase
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.purchase.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.purchase.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
