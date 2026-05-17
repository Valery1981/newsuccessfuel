import { test, expect } from "@playwright/test";
import { loginAs, TEST_CREDS } from "../fixtures/auth.fixture";

/**
 * Parcours Prix Carburant — APEX-04 + §6.5 rules.md.
 * Vérifie que la page créée est accessible et affiche le formulaire d'historisation.
 */

test.describe("Prix Carburant — historisation §6.5", () => {
  test.skip(!TEST_CREDS.gerant.email, "TEST_GERANT_EMAIL non configuré");

  test.beforeEach(async ({ page }) => {
    await loginAs(
      page,
      TEST_CREDS.gerant.email,
      TEST_CREDS.gerant.password,
    );
    await expect(page).toHaveURL(/\/manager\/dashboard/, { timeout: 15_000 });
  });

  test("page accessible au gérant", async ({ page }) => {
    await page.goto("/manager/parametres/prix-carburant");
    await expect(page).toHaveURL(/prix-carburant/);
    await expect(
      page.getByRole("heading", { name: /prix carburant/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("description rappelle l'historisation obligatoire", async ({ page }) => {
    await page.goto("/manager/parametres/prix-carburant");
    await expect(
      page.getByText(/historisation/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("sélecteur de station présent", async ({ page }) => {
    await page.goto("/manager/parametres/prix-carburant");
    await expect(
      page.getByText(/sélectionner une station/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("bouton ouvre la confirmation avant enregistrement", async ({
    page,
  }) => {
    await page.goto("/manager/parametres/prix-carburant");
    const stationTrigger = page.getByRole("combobox").first();
    await stationTrigger.click();
    const stationOption = page.getByRole("option").first();
    const hasStation = await stationOption.isVisible().catch(() => false);
    test.skip(!hasStation, "Aucune station disponible pour ce compte");

    await stationOption.click();
    await page.getByRole("combobox").nth(1).click();
    const typeOption = page.getByRole("option").first();
    await typeOption.click();

    await page.getByLabel(/prix de vente/i).fill("750");
    await page.getByLabel(/marge au litre/i).fill("50");
    await page
      .getByRole("button", { name: /enregistrer le nouveau prix/i })
      .click();

    await expect(
      page.getByRole("alertdialog", {
        name: /confirmer le nouveau prix carburant/i,
      }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/historis/i).first()).toBeVisible();
  });
});
