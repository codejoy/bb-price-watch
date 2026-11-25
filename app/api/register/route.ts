import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Public registration is currently disabled." },
    { status: 403 }
  );
}
