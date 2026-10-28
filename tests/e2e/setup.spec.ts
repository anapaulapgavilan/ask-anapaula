import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [360, 1280]) {
  test(`setup remains honest and accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Ask Ana Paula", exact: true })).toBeVisible();
    await expect(page.getByText("Chat is not available yet.")).toBeVisible();
    await expect(page.getByText("El chat todavia no esta disponible.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Chat coming soon" })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });
}
