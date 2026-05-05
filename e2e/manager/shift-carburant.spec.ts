import { expect, test } from "@playwright/test";
import { loginAs, TEST_CREDS } from "../fixtures/auth.fixture";

test.describe("Vente carburant — shifts", () => {
  test.skip(!TEST_CREDS.gerant.email, "TEST_GERANT_EMAIL non configuré");

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_CREDS.gerant.email, TEST_CREDS.gerant.password);
    await expect(page).toHaveURL(/\/manager\/dashboard/, { timeout: 15_000 });
  });

  test("page shift-carburant accessible", async ({ page }) => {
    await page.goto("/manager/traitements/shift-carburant");
    await expect(page).toHaveURL(/shift-carburant/);
    await expect(
      page.getByRole("heading", { name: /vente.*carburant/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test.skip("les onglets Shifts et Historique sont visibles", async ({
    page,
  }) => {
    await page.goto("/manager/traitements/shift-carburant");
    // Sélectionner une station d'abord pour afficher les onglets
    const stationSelect = page.getByText(/station\s*:/i);
    await stationSelect.click();
    await page.getByRole("option").first().click();
    await expect(page.getByRole("tab", { name: /shift/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("tab", { name: /historique/i })).toBeVisible();
  });

  test.skip(
    !process.env.TEST_ALLOW_MUTATIONS,
    "TEST_ALLOW_MUTATIONS non activé — évite les mutations de données réelles",
  );
});
