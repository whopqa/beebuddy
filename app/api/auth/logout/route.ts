import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/server/auth-proxy";

export async function POST() {
  const response = NextResponse.json({ success: true, data: { loggedOut: true } });
  clearAuthCookies(response);
  return response;
}
