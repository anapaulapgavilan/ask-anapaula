import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chatRequests, installChatMock } from "./support/chat-mock";

test("shares production metadata without enabling search indexing", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://ask-anapaula.vercel.app");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Sign in with Google/);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", "https://ask-anapaula.vercel.app");
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", "Ask Ana Paula professional profile");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

for (const width of [360, 1280]) {
  test(`setup remains honest and accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await installChatMock(page);
    await page.goto("/");
    await page.evaluate(() => window.__setChatFailure(true));
    await expect(page.getByRole("heading", { name: "Ask Ana Paula", exact: true })).toBeVisible();
    await expect(page.getByText("Chat is not available yet.", { exact: false })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Your question" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send question" })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.getByRole("textbox", { name: "Your question" }).fill("What can I ask?");
    await page.getByRole("button", { name: "Send question" }).click();
    await expect(page.locator(".form-error")).toContainText("Chat is not available yet.");
    expect(await chatRequests(page)).toHaveLength(1);
  });
}
