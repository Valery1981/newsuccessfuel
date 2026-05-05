import { test, expect } from "@playwright/test";
import { loginAs, TEST_CREDS } from "../fixtures/auth.fixture";

test.describe("Rapports — accès et filtres", () => {
  test.skip(!TEST_CREDS.gerant.email, "TEST_GERANT_EMAIL non configuré");

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_CREDS.gerant.email, TEST_CREDS.gerant.password);
    await expect(page).toHaveURL(/\/manager\/dashboard/, { timeout: 15_000 });
  });

  test("page rapports principale accessible", async ({ page }) => {
    await page.goto("/manager/rapports");
    await expect(page).toHaveURL(/\/manager\/rapports/);
    await expect(page.getByRole("heading", { name: /rapport/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Grand Livre charge sans erreur", async ({ page }) => {
    await page.goto("/manager/rapports/grand-livre");
    await expect(page).toHaveURL(/grand-livre/);
    await expect(page.getByRole("heading", { name: /grand livre/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Balance charge sans erreur", async ({ page }) => {
    await page.goto("/manager/rapports/balance");
    await expect(page).toHaveURL(/balance/);
    await expect(page.getByRole("heading", { name: /balance/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Bilan shifts charge sans erreur", async ({ page }) => {
    await page.goto("/manager/rapports/bilan-shifts");
    await expect(page).toHaveURL(/bilan-shifts/);
    await expect(
      page.getByRole("heading", { name: /bilan.*shift/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("CA journalier charge sans erreur", async ({ page }) => {
    await page.goto("/manager/rapports/ca-journalier");
    await expect(page).toHaveURL(/ca-journalier/);
    await expect(
      page.getByRole("heading", { name: /ca journalier/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
