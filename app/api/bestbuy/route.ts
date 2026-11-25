import { NextRequest, NextResponse } from "next/server";
import { fetchBestBuyProductBySku } from "@/lib/bestbuy";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = verifySessionToken(
    cookieStore.get(SESSION_COOKIE)?.value
  );

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const sku = String(body?.sku ?? "").trim();

  if (!/^\d{1,12}$/.test(sku)) {
    return NextResponse.json(
      { error: "Invalid SKU" },
      { status: 400 }
    );
  }

  try {
    const product = await fetchBestBuyProductBySku(sku);

    if (!product) {
      return NextResponse.json(
        { error: "No product found for that SKU" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        product: {
          sku: product.sku,
          title: product.title,
          salePrice: product.salePrice,
          regularPrice: product.regularPrice,
          url: product.url,
        },
      },
      { status: 200 }
    );
  } catch {
    console.error("Best Buy product lookup failed");

    return NextResponse.json(
      { error: "Best Buy lookup failed" },
      { status: 500 }
    );
  }
}
