import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";

export function canonicalIp(ip: string): string {
  if (!isIP(ip)) throw new Error("Network attribution unavailable.");
  return ipaddr.process(ip).toString();
}

export function networkIds(ip: string, secret: string) {
  if (!/^(?:[a-fA-F0-9]{2}){32,}$/.test(secret)) throw new Error("Invalid network-identity configuration.");
  const canonical = canonicalIp(ip);
  const key = Buffer.from(secret, "hex");
  return {
    limitId: createHmac("sha256", key).update(`limit:v1:${canonical}`).digest("hex"),
    analyticsId: createHmac("sha256", key).update(`analytics:v1:${canonical}`).digest("hex"),
  };
}

export function trustedClientIp(request: Request): string {
  if (process.env.VERCEL !== "1") throw new Error("Network attribution unavailable.");
  const ip = request.headers.get("x-vercel-forwarded-for");
  if (!ip) throw new Error("Network attribution unavailable.");
  return canonicalIp(ip);
}
