import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { getPurchasesForUser } from "@/lib/purchases";
import PurchasesClient from "./PurchasesClient";

export default async function PurchasesPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value ?? null;

  if (!userId) {
    redirect("/login");
  }

  const purchases = await getPurchasesForUser(userId);

  return <PurchasesClient initialPurchases={purchases} />;
}
