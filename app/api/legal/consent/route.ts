import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, backendApiUrl } from "@/lib/server/auth-proxy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const token = cookies().get(ACCESS_COOKIE)?.value;
    const upstream = await fetch(`${backendApiUrl()}/legal/consent`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
      cache: "no-store",
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: "Unable to save your cookie preferences" }, { status: 503 });
  }
}
