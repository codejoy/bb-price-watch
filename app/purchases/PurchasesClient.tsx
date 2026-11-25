"use client";

import * as React from "react";

type PurchaseView = {
  id: string;
  sku: string;
  title: string | null;
  paidPrice: number;
  purchaseDate: string;
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

export default function PurchasesClient({
  initialPurchases,
}: Props) {
  const [purchases, setPurchases] =
    React.useState<PurchaseView[]>(initialPurchases);

  // Add purchase form
  const [sku, setSku] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [paidPrice, setPaidPrice] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState("");
  const [watched, setWatched] = React.useState(true);

  // Error and loading states
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [checkingPrices, setCheckingPrices] = React.useState(false);
  const [checkingAll, setCheckingAll] = React.useState(false);

  // Price check results
  const [checkResults, setCheckResults] =
    React.useState<PriceCheckResult[] | null>(null);

  const [checkError, setCheckError] =
    React.useState<string | null>(null);

  const [lastCheckedAt, setLastCheckedAt] =
    React.useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] =
    React.useState<string | null>(null);

  const [editValues, setEditValues] =
    React.useState<Partial<PurchaseView>>({});

  // --------------------------------------------------
  // Formatting helpers
  // --------------------------------------------------

  function money(value: number) {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  }

  function differenceColor(value: number) {
    if (value < 0) return "text-green-600";
    if (value > 0) return "text-red-600";
    return "text-gray-600";
  }

  function signedMoney(value: number) {
    if (value > 0) return `+${money(value)}`;
    if (value < 0) return `-${money(Math.abs(value))}`;
    return money(0);
  }

  // --------------------------------------------------
  // Purchase summary calculations
  // --------------------------------------------------

  const comparablePurchases = purchases.filter(
    (p) => p.lastPrice != null
  );

  const totalPaidAll = purchases.reduce(
    (sum, p) => sum + p.paidPrice,
    0
  );

  const totalPaid = comparablePurchases.reduce(
    (sum, p) => sum + p.paidPrice,
    0
  );

  const totalCurrent = comparablePurchases.reduce(
    (sum, p) => sum + (p.lastPrice ?? 0),
    0
  );

  const totalDifference = totalCurrent - totalPaid;

  const totalPercentage =
    totalPaid > 0
      ? (totalDifference / totalPaid) * 100
      : 0;

  const activeWatchCount = purchases.filter(
    (p) => p.isWatchedNow
  ).length;

  // --------------------------------------------------
  // Reset form
  // --------------------------------------------------

  function resetForm() {
    setSku("");
    setTitle("");
    setPaidPrice("");
    setPurchaseDate("");
    setWatched(true);
  }

  // --------------------------------------------------
  // Add purchase
  // --------------------------------------------------

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!sku.trim() || !paidPrice || !purchaseDate) {
      setError("SKU, paid price, and purchase date are required.");
      return;
    }

    const price = Number(paidPrice);

    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid purchase price.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku: sku.trim(),
          title: title || null,
          paidPrice: price,
          purchaseDate,
          watched,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to add purchase.");
        return;
      }

      const data = (await res.json()) as {
        purchase: PurchaseView;
      };

      setPurchases((prev) => [data.purchase, ...prev]);
      resetForm();
    } catch (err) {
      console.error(err);
      setError("Something went wrong while adding purchase.");
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // SKU lookup
  // --------------------------------------------------

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku: sku.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        setError(
          data.error ??
            "Could not find product for that SKU from Best Buy."
        );

        return;
      }

      const data = await res.json();

      const product = data.product as {
        title: string;
        salePrice: number | null;
        regularPrice: number | null;
        url?: string | null;
      };

      if (!title) {
        setTitle(product.title);
      }

      if (!paidPrice) {
        const price =
          product.salePrice ??
          product.regularPrice ??
          null;

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

  // --------------------------------------------------
  // Check prices
  // --------------------------------------------------

  async function handleCheckPricesNow(checkAll = false) {
    setCheckError(null);
    setCheckingPrices(true);
    setCheckingAll(checkAll);
    setCheckResults(null);

    try {
      const endpoint = checkAll
        ? "/api/prices/check?all=true"
        : "/api/prices/check";

      const res = await fetch(endpoint, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        setCheckError(
          data.error ?? "Failed to check prices."
        );

        return;
      }

      const data = (await res.json()) as {
        checkedAt?: string;
        results: PriceCheckResult[];
        purchases: PurchaseView[];
      };

      setLastCheckedAt(
        data.checkedAt ?? new Date().toISOString()
      );

      setCheckResults(data.results);
      setPurchases(data.purchases);
    } catch (err) {
      console.error(err);

      setCheckError(
        "Something went wrong while checking prices."
      );
    } finally {
      setCheckingPrices(false);
      setCheckingAll(false);
    }
  }

  // --------------------------------------------------
  // Edit purchase
  // --------------------------------------------------

  function startEdit(p: PurchaseView) {
    setEditingId(p.id);

    setEditValues({
      ...p,
      purchaseDate: p.purchaseDate.slice(0, 10),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  async function handleEditSave(id: string) {
    if (
      !editValues.purchaseDate ||
      editValues.paidPrice == null ||
      !Number.isFinite(editValues.paidPrice) ||
      editValues.paidPrice < 0
    ) {
      alert("Purchase date and a valid paid price are required.");
      return;
    }

    if (!window.confirm("Save changes to this purchase?")) {
      return;
    }

    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
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

      const data = (await res.json()) as {
        purchase: PurchaseView;
      };

      setPurchases((prev) =>
        prev.map((p) =>
          p.id === id ? data.purchase : p
        )
      );

      cancelEdit();
    } catch (err) {
      console.error(err);

      alert("Something went wrong while updating purchase.");
    }
  }

  // --------------------------------------------------
  // Delete purchase
  // --------------------------------------------------

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        "Are you sure you want to delete this purchase?"
      )
    ) {
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

      setPurchases((prev) =>
        prev.filter((p) => p.id !== id)
      );
    } catch (err) {
      console.error(err);

      alert("Something went wrong while deleting purchase.");
    }
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">

      {/* PAGE HEADER */}

      <section>
        <h1 className="text-3xl font-bold mb-2">
          My Purchases
        </h1>

        <p className="text-sm text-gray-500 mb-4">
          Track Best Buy purchases, monitor price drops,
          and compare historical purchase prices.
          Automatic price monitoring expires after 30 days.
        </p>

        {/* PRICE CHECK BUTTONS */}

        <div className="flex flex-wrap items-center gap-3 mb-4">

          <button
            type="button"
            onClick={() => handleCheckPricesNow(false)}
            disabled={
              checkingPrices || activeWatchCount === 0
            }
            className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
          >
            {checkingPrices && !checkingAll
              ? "Checking watched prices..."
              : "Check watched prices"}
          </button>

          <button
            type="button"
            onClick={() => handleCheckPricesNow(true)}
            disabled={
              checkingPrices || purchases.length === 0
            }
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
          >
            {checkingPrices && checkingAll
              ? "Checking ALL prices..."
              : "Check ALL prices"}
          </button>

          {lastCheckedAt && (
            <span className="text-xs text-gray-500">
              Last checked:{" "}
              {new Date(lastCheckedAt).toLocaleString()}
            </span>
          )}

        </div>

        {checkingPrices && (
          <div className="border border-blue-200 bg-blue-50 text-blue-800 rounded-lg p-3 mb-4 text-sm">
            Retrieving current prices from Best Buy.
            This may take several seconds...
          </div>
        )}

        {checkError && (
          <div className="border border-red-300 bg-red-50 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {checkError}
          </div>
        )}

        {/* PURCHASE COLLECTION SUMMARY */}

        {purchases.length > 0 && (
          <div className="border rounded-lg bg-gray-50 p-5 mb-4 text-gray-900">

            <h2 className="font-bold text-lg mb-4">
              Purchase Overview
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

              <div>
                <div className="text-xs text-gray-500">
                  Total purchases
                </div>

                <div className="text-2xl font-bold">
                  {purchases.length}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">
                  Total spent
                </div>

                <div className="text-2xl font-bold">
                  {money(totalPaidAll)}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">
                  Actively watched
                </div>

                <div className="text-2xl font-bold text-purple-600">
                  {activeWatchCount}
                </div>
              </div>

            </div>

            {comparablePurchases.length > 0 && (
              <>
                <hr className="my-4 border-gray-200" />

                <h3 className="font-semibold mb-3">
                  Historical Price Comparison
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                  <div>
                    <div className="text-xs text-gray-500">
                      Originally paid
                    </div>

                    <div className="text-xl font-bold">
                      {money(totalPaid)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">
                      Latest checked prices
                    </div>

                    <div className="text-xl font-bold">
                      {money(totalCurrent)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">
                      Price difference
                    </div>

                    <div
                      className={`text-xl font-bold ${differenceColor(
                        totalDifference
                      )}`}
                    >
                      {signedMoney(totalDifference)}
                    </div>

                    <div
                      className={`text-sm ${differenceColor(
                        totalDifference
                      )}`}
                    >
                      {totalPercentage > 0 ? "+" : ""}
                      {totalPercentage.toFixed(1)}%
                    </div>
                  </div>

                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Comparing {comparablePurchases.length} of{" "}
                  {purchases.length} purchases with available
                  prices. Unavailable products are excluded
                  from both comparison totals. Prices may
                  have been checked at different times.
                </p>

              </>
            )}

          </div>
        )}

        {/* PRICE CHECK RESULTS */}

        {checkResults !== null && (
          <div className="border rounded-lg p-4 mb-4 text-sm">

            <h2 className="font-bold mb-2">
              Price Check Results
            </h2>

            {checkResults.length === 0 ? (
              <p className="text-gray-500">
                No eligible purchases to check.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-4 mb-3">

                  <span>
                    Checked:{" "}
                    <strong>{checkResults.length}</strong>
                  </span>

                  <span className="text-green-600">
                    Cheaper:{" "}
                    <strong>
                      {
                        checkResults.filter(
                          (r) =>
                            r.currentPrice != null &&
                            r.currentPrice < r.paidPrice
                        ).length
                      }
                    </strong>
                  </span>

                  <span className="text-red-600">
                    More expensive:{" "}
                    <strong>
                      {
                        checkResults.filter(
                          (r) =>
                            r.currentPrice != null &&
                            r.currentPrice > r.paidPrice
                        ).length
                      }
                    </strong>
                  </span>

                  <span className="text-gray-500">
                    Unavailable:{" "}
                    <strong>
                      {
                        checkResults.filter(
                          (r) => r.currentPrice == null
                        ).length
                      }
                    </strong>
                  </span>

                </div>

                <div className="space-y-2">

                  {checkResults.map((r) => {
                    const difference =
                      r.currentPrice != null
                        ? r.currentPrice - r.paidPrice
                        : null;

                    return (
                      <div
                        key={r.id}
                        className="border-t pt-2"
                      >
                        <div className="font-medium">
                          {r.title || `SKU ${r.sku}`}
                        </div>

                        {r.currentPrice != null &&
                        difference != null ? (
                          <div className="text-xs">
                            Paid {money(r.paidPrice)}
                            {" → "}
                            {money(r.currentPrice)}

                            <span
                              className={`ml-2 font-semibold ${differenceColor(
                                difference
                              )}`}
                            >
                              ({signedMoney(difference)})
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">
                            Current price unavailable
                          </div>
                        )}
                      </div>
                    );
                  })}

                </div>
              </>
            )}

          </div>
        )}

        {/* ADD PURCHASE FORM */}

        <form
          onSubmit={handleAdd}
          className="space-y-3 border rounded-lg p-4"
        >

          <h2 className="font-semibold text-lg">
            Add Purchase
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            <div>
              <label className="block text-sm font-medium mb-1">
                SKU *
              </label>

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
                  {lookupLoading ? "Looking..." : "Lookup"}
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-1">
                Enter your Best Buy SKU to retrieve the
                product title and price.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Paid Price (USD) *
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full border rounded px-2 py-1"
                value={paidPrice}
                onChange={(e) =>
                  setPaidPrice(e.target.value)
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Title
              </label>

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
                onChange={(e) =>
                  setPurchaseDate(e.target.value)
                }
              />
            </div>

          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={watched}
              onChange={(e) =>
                setWatched(e.target.checked)
              }
            />

            Watch this purchase for price drops
            (auto-off after 30 days)
          </label>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Purchase"}
            </button>
          </div>

        </form>

      </section>

      {/* PURCHASE LIST */}

      <section className="space-y-3">

        <h2 className="text-xl font-bold">
          Purchase History
        </h2>

        {purchases.length === 0 ? (
          <p className="text-sm text-gray-500">
            No purchases yet.
          </p>
        ) : (
          purchases.map((p) => {
            const isEditing = editingId === p.id;

            const difference =
              p.lastPrice != null
                ? p.lastPrice - p.paidPrice
                : null;

            const percentage =
              difference != null && p.paidPrice > 0
                ? (difference / p.paidPrice) * 100
                : null;

            return (
              <div
                key={p.id}
                className="border rounded-lg p-4"
              >

                {!isEditing ? (
                  <>

                    <div className="flex flex-col md:flex-row md:justify-between gap-3">

                      <div>
                        <div className="font-semibold">
                          {p.title || `SKU ${p.sku}`}
                        </div>

                        <div className="text-sm text-gray-500">
                          SKU: {p.sku}
                        </div>

                        <a
                          href={`https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(
                            p.sku
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 underline"
                        >
                          View on Best Buy
                        </a>
                      </div>

                      <div className="flex gap-2 items-start">

                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="px-3 py-1 text-sm border rounded"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="px-3 py-1 text-sm border rounded text-red-600 border-red-400"
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                    {/* INDIVIDUAL PRICE COMPARISON */}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">

                      <div>
                        <div className="text-xs text-gray-500">
                          Originally paid
                        </div>

                        <div className="text-xl font-bold">
                          {money(p.paidPrice)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">
                          Last checked price
                        </div>

                        {p.lastPrice != null ? (
                          <div className="text-xl font-bold">
                            {money(p.lastPrice)}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 mt-1">
                            {p.lastChecked
                              ? "Unavailable"
                              : "Not checked"}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">
                          Price difference
                        </div>

                        {difference != null ? (
                          <>
                            <div
                              className={`text-xl font-bold ${differenceColor(
                                difference
                              )}`}
                            >
                              {signedMoney(difference)}
                            </div>

                            {percentage != null && (
                              <div
                                className={`text-sm ${differenceColor(
                                  difference
                                )}`}
                              >
                                {percentage > 0 ? "+" : ""}
                                {percentage.toFixed(1)}%
                              </div>
                            )}

                            <div className="text-xs text-gray-500">
                              {difference < 0
                                ? "Cheaper than purchase price"
                                : difference > 0
                                ? "More expensive than purchase price"
                                : "Price unchanged"}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-500">
                            —
                          </div>
                        )}
                      </div>

                    </div>

                    <hr className="my-3 border-gray-200" />

                    <div className="text-xs text-gray-500 space-y-1">

                      <div>
                        Purchased:{" "}
                        {p.purchaseDate.slice(0, 10)}
                      </div>

                      {p.lastChecked && (
                        <div>
                          Last checked:{" "}
                          {new Date(
                            p.lastChecked
                          ).toLocaleString()}
                        </div>
                      )}

                      <div>
                        Watch status:{" "}

                        {p.isWatchedNow ? (
                          <span className="text-green-600 font-semibold">
                            Watching ({p.daysLeft} days remaining)
                          </span>
                        ) : (
                          <span>
                            Not watching (window expired or disabled)
                          </span>
                        )}
                      </div>

                    </div>

                  </>
                ) : (

                  /* EDIT MODE */

                  <div className="space-y-3">

                    <h3 className="font-semibold">
                      Edit Purchase
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

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
                          min="0"
                          step="0.01"
                          className="w-full border rounded px-2 py-1 text-sm"
                          value={
                            Number.isNaN(editValues.paidPrice)
                              ? ""
                              : editValues.paidPrice ??
                                p.paidPrice
                          }
                          onChange={(e) =>
                            setEditValues((vals) => ({
                              ...vals,
                              paidPrice: parseFloat(
                                e.target.value
                              ),
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
                          value={
                            editValues.title ??
                            p.title ??
                            ""
                          }
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
                            editValues.purchaseDate ??
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

                    <label className="inline-flex items-center gap-2 text-sm">

                      <input
                        type="checkbox"
                        checked={
                          editValues.watched ?? p.watched
                        }
                        onChange={(e) =>
                          setEditValues((vals) => ({
                            ...vals,
                            watched: e.target.checked,
                          }))
                        }
                      />

                      Watch this purchase
                      (auto-off after 30 days)

                    </label>

                    <div className="flex gap-2">

                      <button
                        type="button"
                        onClick={() => handleEditSave(p.id)}
                        className="bg-blue-600 text-white px-4 py-1 rounded text-sm"
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-4 py-1 text-sm border rounded"
                      >
                        Cancel
                      </button>

                    </div>

                  </div>
                )}

              </div>
            );
          })
        )}

      </section>

      <footer className="text-center text-xs text-gray-400 pt-4 pb-6">
        Best Buy Price Watch · v1.1
      </footer>

    </main>
  );
}