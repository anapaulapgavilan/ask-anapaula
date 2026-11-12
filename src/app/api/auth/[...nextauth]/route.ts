import { handlers } from "../../../../auth";
import { authMode, googleAuthConfigured } from "../../../../lib/auth-policy";
import type { NextRequest } from "next/server";

async function handle(request: NextRequest, method: "GET" | "POST") {
  try {
    if (authMode(process.env.AUTH_MODE, process.env.VERCEL_ENV) !== "google" || !googleAuthConfigured(process.env)) {
      console.error("AUTH_CONFIGURATION_UNAVAILABLE");
      return new Response("Sign-in unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  } catch {
    console.error("AUTH_MODE_INVALID");
    return new Response("Sign-in unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return handlers[method](request);
}

export function GET(request: NextRequest) { return handle(request, "GET"); }
export function POST(request: NextRequest) { return handle(request, "POST"); }
