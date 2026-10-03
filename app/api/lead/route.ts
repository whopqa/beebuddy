import { NextResponse } from "next/server";
import { forwardAuthRequest } from "@/lib/server/auth-proxy";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid data." }, { status: 400 });
  }

  const result = await forwardAuthRequest("/leads", body);
  return NextResponse.json(result.payload, { status: result.upstream?.status ?? 503 });
}
