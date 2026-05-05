import { test, expect } from "@playwright/test";
import { loginAs, TEST_CREDS } from "../fixtures/auth.fixture";

test.describe("Achat carburant — BL / Factures", () => {
  test.skip(!TEST_CREDS.gerant.email, "TEST_GERANT_EMAIL non configuré");

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_CREDS.gerant.email, TEST_CREDS.gerant.password);
    await expect(page).toHaveURL(/\/manager\/dashboard/, { timeout: 15_000 });
  });

  test("page achat-carburant accessible", async ({ page }) => {
    await page.goto("/manager/traitement/achat-carburant");
    await expect(page).toHaveURL(/achat-carburant/);
    await expect(
      page.getByRole("heading", { name: /achat.*carburant/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("onglets BL/Factures et Nouvel achat visibles", async ({ page }) => {
    await page.goto("/manager/traitement/achat-carburant");
    await expect(
      page.getByRole("tab", { name: /BL|facture/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("tab", { name: /nouvel achat/i })
    ).toBeVisible();
  });

  test.skip(
    !process.env.TEST_ALLOW_MUTATIONS,
    "TEST_ALLOW_MUTATIONS non activé — évite les mutations de données réelles"
  );
});
