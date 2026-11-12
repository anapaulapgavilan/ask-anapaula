import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { mockedAuth } = vi.hoisted(() => ({
  mockedAuth: vi.fn<() => Promise<{ expires: string } | null>>(),
}));
vi.mock("../../src/auth", () => ({ auth: mockedAuth }));
import { POST } from "../../src/app/api/chat/route";

const request = (origin = "https://example.test") => new Request(`${origin}/api/chat`, {
  method: "POST",
  headers: { origin, "content-type": "application/json" },
  body: JSON.stringify({ language: "en", messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "Hello" }] }] }),
});

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

function configure() {
  vi.stubEnv("AUTH_MODE", "google");
  vi.stubEnv("AUTH_GOOGLE_ID", "id");
  vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
  vi.stubEnv("AUTH_SECRET", "x".repeat(32));
  vi.stubEnv("AUTH_URL", "https://example.test");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
}

describe("chat authentication gate", () => {
  it("fails closed on invalid mode and missing credentials", async () => {
    vi.stubEnv("AUTH_MODE", "invalid");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(request())).status).toBe(503);
    vi.stubEnv("AUTH_MODE", "google");
    expect((await POST(request())).status).toBe(503);
    expect(log).toHaveBeenCalledWith("AUTH_CONFIGURATION_UNAVAILABLE");
    expect(mockedAuth).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated calls before reaching chat", async () => {
    configure();
    mockedAuth.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("AUTH_REQUIRED");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("reports session errors without opening the chat", async () => {
    configure();
    mockedAuth.mockRejectedValue(new Error("private diagnostic"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private diagnostic");
    expect(log).toHaveBeenCalledWith("AUTH_SESSION_UNAVAILABLE");
  });

  it("allows a valid session through to the existing chat checks", async () => {
    configure();
    mockedAuth.mockResolvedValue({ expires: "2099-01-01T00:00:00Z" });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("CHAT_NOT_READY");
  });

  it("uses the configured auth origin for protected preview chat", async () => {
    configure();
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "deployment.example.test");
    mockedAuth.mockResolvedValue({ expires: "2099-01-01T00:00:00Z" });
    const permitted = await POST(request());
    expect((await permitted.json()).error.code).toBe("CHAT_NOT_READY");
    const rejected = await POST(request("https://deployment.example.test"));
    expect(rejected.status).toBe(403);
    expect((await rejected.json()).error.code).toBe("ORIGIN_NOT_ALLOWED");
  });
});
