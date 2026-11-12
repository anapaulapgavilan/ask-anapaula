import { describe, expect, it } from "vitest";
import { authMode, googleAuthConfigured, isSessionAgeValid, SESSION_MAX_AGE_SECONDS } from "../../src/lib/auth-policy";

describe("Google sign-in policy", () => {
  it("only enables sign-in explicitly and rejects invalid settings", () => {
    expect(authMode(undefined)).toBe("disabled");
    expect(authMode("disabled")).toBe("disabled");
    expect(authMode("google")).toBe("google");
    expect(() => authMode("true")).toThrow("AUTH_MODE_INVALID");
    expect(() => authMode(undefined, "production")).toThrow("AUTH_MODE_INVALID");
    expect(() => authMode("disabled", "production")).toThrow("AUTH_MODE_INVALID");
    expect(authMode("google", "production")).toBe("google");
  });

  it("requires complete credentials and a secret of at least 32 bytes", () => {
    const valid = { AUTH_GOOGLE_ID: "id", AUTH_GOOGLE_SECRET: "secret", AUTH_SECRET: "x".repeat(32), AUTH_URL: "https://example.test" };
    expect(googleAuthConfigured({ ...valid, AUTH_SECRET: "short" })).toBe(false);
    expect(googleAuthConfigured(valid)).toBe(true);
    expect(googleAuthConfigured({ ...valid, AUTH_GOOGLE_ID: " " })).toBe(false);
    expect(googleAuthConfigured({ ...valid, AUTH_URL: "https://example.test/path" })).toBe(false);
    expect(googleAuthConfigured({ ...valid, VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://other.test" })).toBe(false);
    expect(googleAuthConfigured({ ...valid, VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://example.test" })).toBe(true);
  });

  it("enforces an absolute 24-hour session limit", () => {
    const now = 1_800_000_000_000;
    expect(isSessionAgeValid(now - SESSION_MAX_AGE_SECONDS * 1000 + 1, now)).toBe(true);
    expect(isSessionAgeValid(now - SESSION_MAX_AGE_SECONDS * 1000, now)).toBe(false);
    expect(isSessionAgeValid(now + 1, now)).toBe(false);
    expect(isSessionAgeValid(undefined, now)).toBe(false);
  });
});
