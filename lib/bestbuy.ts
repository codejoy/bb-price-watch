// lib/bestbuy.ts
const BESTBUY_API_KEY = process.env.BESTBUY_API_KEY;
console.log("BESTBUY_API_KEY loaded in Next:", BESTBUY_API_KEY ? `${BESTBUY_API_KEY.slice(0, 4)}...` : "undefined");

if (!BESTBUY_API_KEY) {
  console.warn(
    "BESTBUY_API_KEY is not set. Best Buy SKU lookup will not work until you add it to your .env.local"
  );
}

type BestBuyProduct = {
  sku: string;
  title: string;
  salePrice: number | null;
  regularPrice: number | null;
  url: string | null;
};

export async function fetchBestBuyProductBySku(
  sku: string
): Promise<BestBuyProduct | null> {
  if (!BESTBUY_API_KEY) {
    throw new Error("Missing BESTBUY_API_KEY env var");
  }

  const trimmedSku = String(sku).trim();

  // Simple SKU endpoint from Best Buy Products API
  const url = `https://api.bestbuy.com/v1/products/${encodeURIComponent(
    trimmedSku
  )}.json?apiKey=${BESTBUY_API_KEY}`;

  const res = await fetch(url);

  if (!res.ok) {
    // 404 / invalid SKU → treat as "not found"
    if (res.status === 404) {
      return null;
    }
    throw new Error(`Best Buy API error: ${res.status}`);
  }

  const data = await res.json();

  // Their schema uses fields like "name", "salePrice", "regularPrice", "url"
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
