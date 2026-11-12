import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chatRequests, installChatMock } from "./support/chat-mock";

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
