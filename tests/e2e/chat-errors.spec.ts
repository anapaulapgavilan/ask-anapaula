import { expect, test } from "@playwright/test";
import { chatRequests, installChatMock } from "./support/chat-mock";

test.beforeEach(async ({ page }) => {
  await installChatMock(page);
  await page.goto("/");
});

test("shows localized rate-limit retry and contact details without retrying", async ({ page }) => {
  await page.getByRole("button", { name: "Español" }).click();
  await page.evaluate(() => window.__setChatRateLimited(true));
  await page.getByRole("textbox", { name: "Tu pregunta" }).fill("¿Qué estudiaste?");
  await page.getByRole("button", { name: "Enviar pregunta" }).click();

  await expect(page.locator(".form-error")).toContainText("37 segundos");
  await expect(page.locator(".form-error").getByRole("link", { name: "Contactar a Ana Paula" }))
    .toHaveAttribute("href", "mailto:anapaulapgavilan@gmail.com");
  await expect(page.getByTestId("animated-avatar")).toHaveAttribute("data-state", "error");
  await expect.poll(async () => (await chatRequests(page)).length).toBe(1);
});

test("labels a partial streamed answer and ends the responding state", async ({ page }) => {
  await page.evaluate(() => window.__setChatPartialFailure(true));
  await page.getByRole("textbox", { name: "Your question" }).fill("What did you study?");
  await page.getByRole("button", { name: "Send question" }).click();

  await expect(page.getByText("This is a partial answer.")).toBeVisible();
  await expect(page.getByText("This answer may be incomplete.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("animated-avatar")).toHaveAttribute("data-state", "error");
  await expect.poll(async () => (await chatRequests(page)).length).toBe(1);
});

test("does not label the previous complete answer as incomplete after a rejected follow-up", async ({ page }) => {
  const input = page.getByRole("textbox", { name: "Your question" });
  await input.fill("What did you study?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByText("This is a mocked, approved-profile answer.")).toBeVisible();
  await expect(page.getByTestId("animated-avatar")).toHaveAttribute("data-state", "idle");

  await page.evaluate(() => window.__setChatRateLimited(true));
  await input.fill("What did you do at 42?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.locator(".form-error")).toContainText("37 seconds");
  await expect(page.getByText("This answer may be incomplete.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("This is a mocked, approved-profile answer.")).toBeVisible();
  await expect.poll(async () => (await chatRequests(page)).length).toBe(2);
});
