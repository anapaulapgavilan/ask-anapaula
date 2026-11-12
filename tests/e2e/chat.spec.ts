import { expect, test } from "@playwright/test";
import { abortCount, chatRequests, installChatMock } from "./support/chat-mock";

test.beforeEach(async ({ page }, testInfo) => {
  const delay = testInfo.title.startsWith("prevents concurrent sends") ||
    testInfo.title.startsWith("changing language and theme")
    ? 2000
    : 180;
  await installChatMock(page, delay);
  await page.goto("/");
});

test("sends the strict SDK payload from a starter and streams safe text incrementally", async ({ page }) => {
  await page.getByRole("button", { name: "What is your professional background?" }).click();
  await expect.poll(async () => (await chatRequests(page)).length).toBe(1);
  const [payload] = await chatRequests(page);
  expect(Object.keys(payload as object).sort()).toEqual(["language", "messages"]);
  const body = payload as { language: string; messages: Array<{ id: string; role: string; parts: Array<{ type: string; text: string }> }> };
  expect(body.language).toBe("en");
  expect(body.messages).toHaveLength(1);
  expect(body.messages[0].role).toBe("user");
  expect(Object.keys(body.messages[0]).sort()).toEqual(["id", "parts", "role"]);
  expect(body.messages[0].parts).toEqual([{ type: "text", text: "What is your professional background?" }]);
  expect(await chatRequests(page)).toHaveLength(1);
  await expect(page.getByTestId("animated-avatar").getByRole("status")).toContainText("Thinking");
  await expect(page.getByText("This is a mocked, approved-profile answer.")).toBeVisible();
  await expect(page.getByText("Chat is not available yet.", { exact: false })).toHaveCount(0);
  await expect(page.getByTestId("animated-avatar").getByRole("status")).toContainText("Ready");
  await expect(page.getByText("This is an AI version of Ana Paula.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test("prevents concurrent sends, Stop preserves partial text, and does not retry", async ({ page }) => {
  const input = page.getByRole("textbox", { name: "Your question" });
  await input.fill("What did you study?");
  await input.press("Enter");
  await expect.poll(async () => (await chatRequests(page)).length).toBe(1);
  await expect(input).toBeFocused();
  await expect(page.getByRole("button", { name: "Stop response" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Send question" })).toHaveCount(0);
  await expect(page.getByText("This is a mocked, approved-profile answer.")).toBeVisible();
  await page.getByRole("button", { name: "Stop response" }).click();
  await expect(page.getByText("This is a mocked, approved-profile answer.")).toBeVisible();
  await expect(page.getByTestId("animated-avatar").getByRole("status")).toContainText("Ready");
  await expect.poll(() => abortCount(page)).toBeGreaterThan(0);
  expect(await chatRequests(page)).toHaveLength(1);
});

test("changing language and theme during a stream does not rewrite or restart it", async ({ page }) => {
  const input = page.getByRole("textbox", { name: "Your question" });
  await input.fill("What is your professional background?");
  await input.press("Enter");
  await expect.poll(async () => (await chatRequests(page)).length).toBe(1);
  await page.getByRole("button", { name: "Español" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByText("What is your professional background?")).toBeVisible();
  await expect(page.getByText("Esta es una versión de IA de Ana Paula.")).toBeVisible();
  await page.getByRole("button", { name: "Tema: Claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByText("This is a mocked, approved-profile answer.")).toBeVisible();
  await expect(page.getByTestId("animated-avatar")).toHaveAttribute("data-state", "idle");
  expect(await chatRequests(page)).toHaveLength(1);
});

test("copies only visible assistant text and announces clipboard failures", async ({ page }) => {
  await page.getByRole("textbox", { name: "Your question" }).fill("What is your professional background?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByText("This is a mocked, approved-profile answer.")).toBeVisible();
  await expect(page.getByTestId("animated-avatar")).toHaveAttribute("data-state", "idle");
  await page.getByRole("button", { name: "Copy answer" }).click();
  await expect(page.getByTestId("copy-feedback")).toContainText("Copied");
  await page.evaluate(() => window.__setCopyFailure(true));
  await page.getByRole("button", { name: "Copy answer" }).click();
  await expect(page.getByTestId("copy-feedback")).toContainText("Clipboard access was denied");
});

test("enforces Unicode input limits, history bounds, and a deliberate fresh conversation", async ({ page }) => {
  const input = page.getByRole("textbox", { name: "Your question" });
  await input.fill("😀".repeat(1001));
  await expect(page.locator(".form-error")).toContainText("1,000 characters");
  expect(await chatRequests(page)).toHaveLength(0);
  await input.fill("A short question?");
  for (let turn = 0; turn < 10; turn++) {
    await page.getByRole("button", { name: "Send question" }).click();
    await expect.poll(async () => (await chatRequests(page)).length).toBe(turn + 1);
    await expect(page.getByTestId("animated-avatar").getByRole("status")).toContainText("Ready");
    if (turn < 9) await input.fill("A short question?");
  }
  await expect(page.getByText("Start a new conversation to continue", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send question" })).toBeDisabled();
  expect(await chatRequests(page)).toHaveLength(10);
  await page.getByRole("button", { name: "Start a new conversation" }).click();
  await expect(input).toHaveValue("");
  await expect(page.getByText("This is a mocked, approved-profile answer.")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test("shows the endpoint setup error and performs no automatic retry", async ({ page }) => {
  await page.evaluate(() => window.__setChatFailure(true));
  await page.getByRole("textbox", { name: "Your question" }).fill("What can I ask?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.locator(".form-error")).toContainText("not available");
  expect(await chatRequests(page)).toHaveLength(1);
});
