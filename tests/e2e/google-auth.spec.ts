import { encode } from "next-auth/jwt";
import { expect, test } from "@playwright/test";

test.skip(process.env.AUTH_MODE !== "google", "Run separately with a synthetic Google auth configuration.");

test("requires a valid and unexpired session for the page and chat", async ({ page, context }) => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for the synthetic session test");
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Continuar con Google/ })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your question" })).toHaveCount(0);
  expect((await page.request.post("/api/chat", { data: {} })).status()).toBe(401);
  const cookie = async (signedInAt: number) => {
    const name = "__Secure-authjs.session-token";
    const value = await encode({ token: { sub: "synthetic-user", signedInAt }, secret, salt: name, maxAge: 86400 });
    await context.addCookies([{ name, value, url: "https://127.0.0.1", secure: true, httpOnly: true, sameSite: "Lax" }]);
  };
  await cookie(Date.now() - 24 * 60 * 60 * 1000);
  await page.reload();
  await expect(page.getByRole("button", { name: /Continuar con Google/ })).toBeVisible();
  await cookie(Date.now());
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Your question" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Cerrar sesión/ })).toBeVisible();
  await page.route("https://example.test/**", (route) => route.fulfill({ contentType: "text/html", body: "Signed out" }));
  await Promise.all([
    page.waitForURL("https://example.test/"),
    page.getByRole("button", { name: /Cerrar sesión/ }).click(),
  ]);
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Continuar con Google/ })).toBeVisible();
});
