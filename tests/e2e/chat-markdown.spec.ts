import { expect, test } from "@playwright/test";
import { installChatMock } from "./support/chat-mock";

test("renders streamed assistant Markdown safely and preserves the copied answer", async ({ page }) => {
  const chunks = [
    "Here are my public projects:\n\n- **Trans",
    "cendence:** a Pong app. https://github.com/anapaulapgavilan/42-Transcendence\n- **Cub3d:** a maze.\n\n",
    '<script>window.markdownExecuted = true</script>\n\n![tracking](https://example.com/tracking.png) [unsafe](javascript:alert(1))',
  ];
  await installChatMock(page, 600, chunks);
  const imageRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("tracking.png")) imageRequests.push(request.url());
  });
  await page.goto("/");
  await page.getByRole("textbox", { name: "Your question" }).fill("Show **my projects**");
  await page.getByRole("button", { name: "Send question" }).click();

  const assistant = page.locator(".message-assistant");
  await expect(assistant).toContainText("**Trans");
  await expect(assistant.locator("strong")).toHaveCount(0);
  await expect(assistant.locator("strong").first()).toHaveText("Transcendence:");
  await expect(assistant.locator("li")).toHaveCount(2);
  await expect(assistant.locator("a", { hasText: "https://github.com/anapaulapgavilan/42-Transcendence" }))
    .toHaveAttribute("href", "https://github.com/anapaulapgavilan/42-Transcendence");
  await expect(page.getByTestId("animated-avatar")).toHaveAttribute("data-state", "idle");
  await expect(assistant.locator("script, img")).toHaveCount(0);
  await expect(assistant.locator("a", { hasText: "unsafe" })).not.toHaveAttribute("href", /javascript:/i);
  expect(imageRequests).toEqual([]);
  expect(await page.evaluate(() => "markdownExecuted" in window)).toBe(false);
  await expect(page.locator(".message-user")).toHaveText("Show **my projects**");
  await page.getByRole("button", { name: "Copy answer" }).click();
  expect(await page.evaluate(() => window.__copiedText)).toBe(chunks.join(""));
});
