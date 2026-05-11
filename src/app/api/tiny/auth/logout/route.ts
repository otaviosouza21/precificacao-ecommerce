import { getTokenStore } from "@/lib/tiny/token-store";
import { NextResponse } from "next/server";

export async function POST() {
  await getTokenStore().apagar();
  return new NextResponse(null, { status: 204 });
}
