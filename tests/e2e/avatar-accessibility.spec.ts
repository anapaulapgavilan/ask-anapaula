import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { installChatMock } from "./support/chat-mock";

for (const language of ["en", "es"] as const) {
  for (const width of [360, 1280]) {
    test(`approved avatar and profile are accessible in ${language} at ${width}px`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width, height: 900 });
      await installChatMock(page);
      await page.goto("/");
      if (language === "es") await page.getByRole("button", { name: "Español" }).click();
      await expect(page.getByRole("img", { name: /Ana Paula/i })).toBeVisible();
      const avatar = page.getByTestId("animated-avatar");
      await expect(avatar).toHaveAttribute("data-motion", "static");
      await expect(avatar).toHaveAttribute("data-state", "idle");
      expect(await avatar.locator("#ojos").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(axe.violations).toEqual([]);
      const themeButton = page.getByRole("button", { name: language === "en" ? "Theme: Light" : "Tema: Claro" });
      await themeButton.click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      const send = page.getByRole("button", { name: language === "en" ? "Send question" : "Enviar pregunta" });
      await expect(send).toBeDisabled();
      await expect(page.getByText(language === "en" ? "This is an AI version of Ana Paula." : "Esta es una versión de IA de Ana Paula.")).toBeVisible();
      await expect(page.getByRole("heading", { name: language === "en" ? "Selected experience" : "Experiencia seleccionada" })).toBeVisible();
      await expect(page.getByText(language === "en" ? "GitHub and LinkedIn profiles are linked below; no public CV or portrait photo is published. The approved avatar is an illustration, not a photograph." : "Los perfiles de GitHub y LinkedIn están enlazados abajo; aquí no se publica un CV ni una foto de retrato. El avatar aprobado es una ilustración, no una fotografía.")).toBeVisible();
      await expect(page.getByRole("link", { name: language === "en" ? "GitHub profile" : "Perfil de GitHub" })).toHaveAttribute("href", "https://github.com/anapaulapgavilan");
      await expect(page.getByRole("link", { name: language === "en" ? "LinkedIn profile" : "Perfil de LinkedIn" })).toHaveAttribute("href", "https://www.linkedin.com/in/ana-paula-perez-gavilan/");
      const projectLinks = [
        ["42-Transcendence", "https://github.com/anapaulapgavilan/42-Transcendence"],
        ["42-Cub3d", "https://github.com/anapaulapgavilan/42-Cub3d"],
        ["42-Minishell", "https://github.com/anapaulapgavilan/42-Minishell"],
        ["42-WebServ", "https://github.com/anapaulapgavilan/42-WebServ"],
      ];
      for (const [label, url] of projectLinks) {
        const projectLink = page.getByRole("link", {
          name: `${language === "en" ? "View on GitHub" : "Ver en GitHub"}: ${label}`,
        });
        await expect(projectLink).toHaveAttribute("href", url);
        await expect(projectLink).toHaveAttribute("target", "_blank");
      }
      await expect(page.getByText(language === "en" ? "Selected GitHub projects" : "Proyectos seleccionados de GitHub")).toBeVisible();
    });
  }
}

test("places the avatar and chat above the profile introduction", async ({ page }) => {
  await installChatMock(page);
  await page.goto("/");

  const avatar = page.getByTestId("animated-avatar");
  await expect(avatar).toBeVisible();
  const topContentIsInOrder = await page.evaluate(() => {
    const topAvatar = document.querySelector(".top-avatar");
    const chat = document.querySelector(".chat-section");
    const introduction = document.querySelector(".hero");
    return Boolean(
      topAvatar &&
      chat &&
      introduction &&
      (topAvatar.compareDocumentPosition(chat) & Node.DOCUMENT_POSITION_FOLLOWING) &&
      (chat.compareDocumentPosition(introduction) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
  });

  expect(topContentIsInOrder).toBe(true);
});

test("motion pause is keyboard accessible and never overrides reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const avatar = page.getByTestId("animated-avatar");
  await expect(avatar).toHaveAttribute("data-motion", "enabled");
  const pause = page.getByRole("button", { name: "Pause animation" });
  await pause.focus();
  await page.keyboard.press("Enter");
  await expect(avatar).toHaveAttribute("data-motion", "static");
  await expect(page.getByRole("button", { name: "Resume animation" })).toHaveAttribute("aria-pressed", "true");
  expect(await avatar.locator("#ojos").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(avatar).toHaveAttribute("data-motion", "static");
  await page.getByRole("button", { name: "Resume animation" }).click();
  await expect(avatar).toHaveAttribute("data-motion", "static");
});

test("the waving arm stays connected after its animation finishes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const avatar = page.getByTestId("animated-avatar");
  await expect(avatar).toHaveAttribute("data-motion", "enabled");
  const arm = avatar.locator("#brazo-izq");
  await arm.evaluate(async (element) => {
    const forearm = element.querySelector("#antebrazo-izq");
    if (!forearm) throw new Error("Missing waving forearm");
    await Promise.all([...element.getAnimations(), ...forearm.getAnimations()].map((animation) => animation.finished));
  });
  const jointDistance = await arm.evaluate((element) => {
    const forearm = element.querySelector<SVGGraphicsElement>("#antebrazo-izq");
    const armMatrix = (element as SVGGraphicsElement).getScreenCTM();
    const forearmMatrix = forearm?.getScreenCTM();
    if (!armMatrix || !forearmMatrix) throw new Error("Missing arm transformation");
    const elbow = new DOMPoint(128, 398);
    const upperJoint = elbow.matrixTransform(armMatrix);
    const lowerJoint = elbow.matrixTransform(forearmMatrix);
    return Math.hypot(upperJoint.x - lowerJoint.x, upperJoint.y - lowerJoint.y);
  });
  expect(jointDistance).toBeLessThan(1);
});

test("shows request-driven expressions and stops them when motion is paused", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await installChatMock(page, 2000);
  await page.goto("/");
  const avatar = page.getByTestId("animated-avatar");
  await expect(avatar).toHaveAttribute("data-motion", "enabled");
  expect(await avatar.locator("#antebrazo-izq").evaluate((element) => getComputedStyle(element).animationName)).toBe("layered-wave-hand");
  await page.getByRole("textbox", { name: "Your question" }).fill("What did you study?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(avatar).toHaveAttribute("data-state", "thinking");
  await expect(avatar.locator("#boca-pensativa")).toBeVisible();
  await expect(avatar).toHaveAttribute("data-state", "responding");
  await expect(avatar.locator("#boca-sonrisa")).toBeVisible();
  await page.getByRole("button", { name: "Pause animation" }).click();
  await expect(avatar).toHaveAttribute("data-motion", "static");
  await expect(avatar.locator("#boca-neutral")).toBeVisible();
});

test("missing illustration shows an accessible fallback without overflow", async ({ page }) => {
  let requests = 0;
  await page.route("**/avatar/ana-paula-animated.svg", async (route) => {
    requests++;
    await route.abort();
  });
  await page.goto("/");
  await expect.poll(() => requests).toBeGreaterThan(0);
  await expect(page.locator(".avatar-error")).toContainText("Illustration unavailable");
  await expect(page.getByRole("textbox", { name: "Your question" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send question" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("rejects an unsafe illustration instead of inserting it", async ({ page }) => {
  await page.route("**/avatar/ana-paula-animated.svg", (route) => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  }));
  await page.goto("/");
  await expect(page.locator(".avatar-error")).toContainText("Illustration unavailable");
  await expect(page.locator(".avatar-artwork svg")).toHaveCount(0);
});
