import { expect, test } from "@playwright/test";

import { loginAs, TEST_CREDS } from "../fixtures/auth.fixture";

/**
 * APEX-12-suite / APEX-12-final : tests E2E des dialogs de comptabilisation avec EcriturePreview.
 *
 * Couverture :
 *  - Page achat-carburant accessible
 *  - Page operations contient le dialog Virement Interne
 *  - Page initialisation montre le dialog A Nouveau
 *  - 6 dialogs externes avec EcriturePreview (Phase 8)
 *
 * Note : ces tests vérifient le rendu UI sans seed DB. Pour tester un parcours
 * complet (création achat → comptabilisation → vérification équilibre forcé),
 * un seed DB dédié serait nécessaire (APEX futur).
 */

test.describe("Dialogs comptabilisation — APEX-16-final / APEX-12-suite", () => {
  test.skip(!TEST_CREDS.gerant.email, "TEST_GERANT_EMAIL non configuré");

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_CREDS.gerant.email, TEST_CREDS.gerant.password);
    await expect(page).toHaveURL(/\/manager\/dashboard/, { timeout: 15_000 });
  });

  test("page achat-carburant se charge avec onglet liste", async ({ page }) => {
    await page.goto("/manager/traitements/achat-carburant");
    await expect(
      page.getByRole("heading", { name: /achat.*carburant/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("page achat-boutique se charge", async ({ page }) => {
    await page.goto("/manager/traitements/achat-boutique");
    await expect(page).toHaveURL(/achat-boutique/);
  });

  test("page opérations virement-interne se charge", async ({ page }) => {
    await page.goto("/manager/traitements/operations/virement-interne");
    await expect(page).toHaveURL(/virement-interne/);
    // Le dialog de virement devrait être ouvert via initialDialog
    await expect(
      page.getByRole("dialog").filter({ hasText: /virement/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("page initialisation accessible (validation A Nouveau)", async ({
    page,
  }) => {
    await page.goto("/manager/initialisation");
    await expect(
      page.getByRole("heading", { name: /initialisation/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  // APEX-12-final: tests pour les 6 dialogs avec EcriturePreview (Phase 8)

  test("dialog encaissement-creances se charge", async ({ page }) => {
    await page.goto("/manager/traitements/operations/encaissement-creances");
    await expect(page).toHaveURL(/encaissement-creances/);
    await expect(
      page.getByRole("dialog").filter({ hasText: /encaissement/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("dialog reglement-dettes se charge", async ({ page }) => {
    await page.goto("/manager/traitements/operations/reglement-dettes");
    await expect(page).toHaveURL(/reglement-dettes/);
    await expect(
      page.getByRole("dialog").filter({ hasText: /règlement/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("dialog charges-courantes se charge", async ({ page }) => {
    await page.goto("/manager/traitements/operations/charges-courantes");
    await expect(page).toHaveURL(/charges-courantes/);
    await expect(
      page.getByRole("dialog").filter({ hasText: /charges/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("dialog salaires se charge", async ({ page }) => {
    await page.goto("/manager/traitements/operations/salaires");
    await expect(page).toHaveURL(/salaires/);
    await expect(
      page.getByRole("dialog").filter({ hasText: /salaires/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("dialog operations-gerant se charge", async ({ page }) => {
    await page.goto("/manager/traitements/operations/operations-gerant");
    await expect(page).toHaveURL(/operations-gerant/);
    await expect(
      page.getByRole("dialog").filter({ hasText: /opérations.*gérant/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("dialog immobilisations se charge", async ({ page }) => {
    await page.goto("/manager/traitements/operations/immobilisations");
    await expect(page).toHaveURL(/immobilisations/);
    await expect(
      page.getByRole("dialog").filter({ hasText: /immobilisations/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
