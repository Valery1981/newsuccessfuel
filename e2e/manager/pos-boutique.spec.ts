import { expect, test } from "@playwright/test";
import { loginAs, TEST_CREDS } from "../fixtures/auth.fixture";

test.describe("POS Boutique — interface de vente", () => {
  test.skip(!TEST_CREDS.gerant.email, "TEST_GERANT_EMAIL non configuré");

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_CREDS.gerant.email, TEST_CREDS.gerant.password);
    await expect(page).toHaveURL(/\/manager\/dashboard/, { timeout: 15_000 });
  });

  test("page pos-boutique accessible", async ({ page }) => {
    await page.goto("/manager/traitements/pos-boutique");
    await expect(page).toHaveURL(/pos-boutique/);
    await expect(
      page.getByRole("heading", {
        name: /vente.*boutique|boutique|point de vente/i,
      }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test.skip("recherche article visible dans le POS", async ({ page }) => {
    await page.goto("/manager/traitements/pos-boutique");
    // Ouvrir un shift d'abord pour afficher la recherche
    const stationSelect = page.getByLabel(/station/i).first();
    await stationSelect.click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: /ouvrir.*shift/i }).click();
    await expect(
      page
        .locator(
          '[data-testid="pos-search"], [placeholder*="article" i], [placeholder*="recherch" i]',
        )
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test.skip(
    !process.env.TEST_ALLOW_MUTATIONS,
    "TEST_ALLOW_MUTATIONS non activé — évite les mutations de données réelles",
  );
});
