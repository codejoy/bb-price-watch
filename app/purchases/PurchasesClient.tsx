"use client";

import * as React from "react";

type PurchaseView = {
  id: string;
  sku: string;
  title: string | null;
  paidPrice: number;
  purchaseDate: string; // ISO string
  watched: boolean;
  lastPrice: number | null;
  lastChecked: string | null;
  isWatchedNow: boolean;
  expiresAt: string;
  daysLeft: number;
};

type Props = {
  initialPurchases: PurchaseView[];
};

type PriceCheckResult = {
  id: string;
  sku: string;
  title: string | null;
  paidPrice: number;
  currentPrice: number | null;
  priceDrop: number;
};

export default function PurchasesClient({ initialPurchases }: Props) {
  const [purchases, setPurchases] = React.useState<PurchaseView[]>(initialPurchases);
  const [sku, setSku] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [paidPrice, setPaidPrice] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState("");
  const [watched, setWatched] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [checkingPrices, setCheckingPrices] = React.useState(false);
  const [checkResults, setCheckResults] = React.useState<PriceCheckResult[] | null>(null);
  const [checkError, setCheckError] = React.useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValues, setEditValues] = React.useState<Partial<PurchaseView>>({});

  function resetForm() {
    setSku("");
    setTitle("");
    setPaidPrice("");
    setPurchaseDate("");
    setWatched(true);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!sku || !paidPrice || !purchaseDate) {
      setError("SKU, paid price, and purchase date are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          title: title || null,
          paidPrice: parseFloat(paidPrice),
          purchaseDate,
          watched,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to add purchase.");
        setSaving(false);
        return;
      }

      const data = (await res.json()) as { purchase: PurchaseView };
      setPurchases((prev) => [data.purchase, ...prev]);
      resetForm();
      setSaving(false);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while adding purchase.");
      setSaving(false);
    }
  }

  function startEdit(p: PurchaseView) {
    setEditingId(p.id);
    setEditValues({
      ...p,
      purchaseDate: p.purchaseDate.slice(0, 10), // yyyy-mm-dd
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  async function handleLookupSku() {
  setError(null);

  if (!sku.trim()) {
    setError("Enter a SKU before using lookup.");
    return;
  }

  setLookupLoading(true);
  try {
    const res = await fetch("/api/bestbuy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error ?? "Could not find product for that SKU from Best Buy."
      );
      setLookupLoading(false);
      return;
    }

    const data = await res.json();
    const product = data.product as {
      title: string;
      salePrice: number | null;
      regularPrice: number | null;
      url?: string | null;
    };

    // Only overwrite title if you haven't typed one yet
    if (!title) {
      setTitle(product.title);
    }

    // Only overwrite price if you haven't filled it yet
    if (!paidPrice) {
      const price =
        product.salePrice ?? product.regularPrice ?? null;
      if (price != null) {
        setPaidPrice(String(price));
      }
    }
  } catch (err) {
    console.error(err);
    setError("Error looking up SKU from Best Buy.");
  } finally {
    setLookupLoading(false);
  }
}

async function handleCheckPricesNow() {
  setCheckError(null);
  setCheckingPrices(true);
  setCheckResults(null);

  try {
    const res = await fetch("/api/prices/check", {
      method: "POST",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCheckError(data.error ?? "Failed to check prices.");
      setCheckingPrices(false);
      return;
    }

    const data = await res.json() as {
      checkedAt: string;
      results: PriceCheckResult[];
      purchases: PurchaseView[];
    };

    console.log("Price check results:", data);

    setLastCheckedAt(data.checkedAt);
    setCheckResults(data.results);
    setPurchases(data.purchases);
  } catch (err) {
    console.error(err);
    setCheckError("Something went wrong while checking prices.");
  } finally {
    setCheckingPrices(false);
  }
}

  async function handleEditSave(id: string) {
    if (!editValues.purchaseDate || editValues.paidPrice == null) {
      alert("Purchase date and paid price are required.");
      return;
    }

    if (!window.confirm("Save changes to this purchase?")) {
      return;
    }

    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: editValues.sku,
          title: editValues.title,
          paidPrice: editValues.paidPrice,
          purchaseDate: editValues.purchaseDate,
          watched: editValues.watched,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to update purchase.");
        return;
      }

      const data = (await res.json()) as { purchase: PurchaseView };
      setPurchases((prev) => prev.map((p) => (p.id === id ? data.purchase : p)));
      setEditingId(null);
      setEditValues({});
    } catch (err) {
      console.error(err);
      alert("Something went wrong while updating purchase.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this purchase?")) {
      return;
    }

    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to delete purchase.");
        return;
      }

      setPurchases((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      alert("Something went wrong while deleting purchase.");
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <section>
        <h1 className="text-2xl font-bold mb-2">My Purchases</h1>
        <p className="text-sm text-gray-500 mb-4">
          Add Best Buy purchases you want to track. Items are automatically
          considered &quot;watched&quot; for 30 days from the purchase date.
        </p>
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={handleCheckPricesNow}
                disabled={checkingPrices || purchases.length === 0}
                className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
              >
                {checkingPrices ? "Checking prices…" : "Check prices now"}
              </button>
              {lastCheckedAt && (
                <span className="text-xs text-gray-500">
                  Last checked: {new Date(lastCheckedAt).toLocaleString()}
                </span>
              )}
            </div>
            {checkError && (
              <p className="text-xs text-red-600 mb-2">{checkError}</p>
            )}
           {checkResults && checkResults.length > 0 && (
          <div className="mb-4 border border-green-300 bg-green-50 rounded-lg p-4 text-sm text-green-800 shadow-sm">
            {(() => {
              const drops = checkResults.filter((r) => r.priceDrop > 0);

              if (drops.length === 0) {
                return (
                  <p className="text-gray-700">
                    No price drops found on watched items.
                  </p>
                );
              }

              return (
                <div className="space-y-2">
                  <p className="font-bold">
                    ✔ Found {drops.length} item{drops.length > 1 ? "s" : ""} with a price drop:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    {drops.map((r) => (
                      <li key={r.id}>
                        <span className="font-semibold">
                          {r.title || `SKU ${r.sku}`}
                        </span>{" "}
                        – you paid ${r.paidPrice.toFixed(2)}
                        {r.currentPrice != null && (
                          <>
                            , current price ${r.currentPrice.toFixed(2)} (
                            <span className="font-bold">
                              ↓ ${r.priceDrop.toFixed(2)}
                            </span>
                            )
                          </>
                        )}
                        {r.currentPrice == null && (
                          <> – current price unavailable</>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
        )}


        <form onSubmit={handleAdd} className="space-y-3 border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
           <div>
              <label className="block text-sm font-medium mb-1">SKU *</label>
              <div className="flex gap-2">
                <input
                  className="w-full border rounded px-2 py-1"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleLookupSku}
                  disabled={lookupLoading}
                  className="whitespace-nowrap border rounded px-3 py-1 text-sm disabled:opacity-50"
                >
                  {lookupLoading ? "Looking…" : "Lookup"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter your Best Buy SKU and click Lookup to auto-fill title and price.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Paid Price (USD) *
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full border rounded px-2 py-1"
                value={paidPrice}
                onChange={(e) => setPaidPrice(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional friendly name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                className="w-full border rounded px-2 py-1"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={watched}
              onChange={(e) => setWatched(e.target.checked)}
            />
            Watch this purchase for price drops (auto-off after 30 days)   
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-2 ml-4 bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Purchase"}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        {purchases.length === 0 ? (
          <p className="text-sm text-gray-500">No purchases yet.</p>
        ) : (
          purchases.map((p) => {
            const isEditing = editingId === p.id;
            return (
              <div
                key={p.id}
                className="border rounded-lg p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
              >
                {!isEditing ? (
                  <>
                    <div>
                      <div className="font-semibold">
                        {p.title || `SKU ${p.sku}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        SKU: {p.sku}
                      </div>

                      <div className="text-xs">
                        <a
                          href={`https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(
                            p.sku
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          View on Best Buy
                        </a>
                      </div>
                      <div className="text-sm">
                        Paid: ${p.paidPrice.toFixed(2)}
                      </div>
                      <div className="text-sm">
                        Purchase date:{" "}
                        {new Date(p.purchaseDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm">
                        Watch status:{" "}
                        {p.isWatchedNow ? (
                          <span className="text-green-700 font-semibold">
                            Watching ({p.daysLeft} days remaining)
                          </span>
                        ) : (
                          <span className="text-gray-500">
                            Not watching (window expired or disabled)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 md:mt-0">
                      <button
                        type="button"
                        className="px-3 py-1 text-sm border rounded"
                        onClick={() => startEdit(p)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 text-sm border rounded text-red-600 border-red-400"
                        onClick={() => handleDelete(p.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 w-full md:w-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium mb-1">
                            SKU
                          </label>
                          <input
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={editValues.sku ?? p.sku}
                            onChange={(e) =>
                              setEditValues((vals) => ({
                                ...vals,
                                sku: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">
                            Paid Price
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={
                              editValues.paidPrice ?? p.paidPrice ?? ""
                            }
                            onChange={(e) =>
                              setEditValues((vals) => ({
                                ...vals,
                                paidPrice: parseFloat(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">
                            Title
                          </label>
                          <input
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={editValues.title ?? p.title ?? ""}
                            onChange={(e) =>
                              setEditValues((vals) => ({
                                ...vals,
                                title: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">
                            Purchase Date
                          </label>
                          <input
                            type="date"
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={
                              (editValues.purchaseDate as string) ??
                              p.purchaseDate.slice(0, 10)
                            }
                            onChange={(e) =>
                              setEditValues((vals) => ({
                                ...vals,
                                purchaseDate: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={
                            editValues.watched ?? p.watched ?? true
                          }
                          onChange={(e) =>
                            setEditValues((vals) => ({
                              ...vals,
                              watched: e.target.checked,
                            }))
                          }
                        />
                        Watch this purchase (auto-off after 30 days)
                      </label>
                    </div>
                    <div className="flex gap-2 mt-2 md:mt-0">
                      <button
                        type="button"
                        className="px-3 py-1 text-sm border rounded"
                        onClick={() => handleEditSave(p.id)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 text-sm border rounded"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
