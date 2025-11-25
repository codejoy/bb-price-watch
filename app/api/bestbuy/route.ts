// app/api/bestbuy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchBestBuyProductBySku } from "@/lib/bestbuy";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { sku } = body;

  if (!sku) {
    return NextResponse.json(
      { error: "Missing sku in request body" },
      { status: 400 }
    );
  }

  try {
    const product = await fetchBestBuyProductBySku(String(sku));

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
  } catch (err) {
    console.error("Best Buy lookup failed:", err);
    return NextResponse.json(
      { error: "Best Buy lookup failed" },
      { status: 500 }
    );
  }
}
