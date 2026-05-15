import { expect, test } from "@playwright/test";
import { loginAs, TEST_CREDS } from "../fixtures/auth.fixture";

test.describe("Partner Dashboard — KPIs et Tableaux", () => {
  test.skip(
    !TEST_CREDS.partenaire.email,
    "TEST_PARTENAIRE_EMAIL non configuré",
  );

  test.beforeEach(async ({ page }) => {
    await loginAs(
      page,
      TEST_CREDS.partenaire.email,
      TEST_CREDS.partenaire.password,
    );
    await expect(page).toHaveURL(/\/partner\/dashboard/, { timeout: 15_000 });
  });

  test("page dashboard partenaire accessible", async ({ page }) => {
    await expect(page).toHaveURL(/partner\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /tableau de bord partenaire/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("KPIs cards visibles", async ({ page }) => {
    await expect(page.getByText(/achat carburant/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/vente carburant/i).first()).toBeVisible();
    await expect(page.getByText(/achat lubrifiants/i).first()).toBeVisible();
    await expect(page.getByText(/doléances ouvertes/i).first()).toBeVisible();
  });

  test("tableau niveau de stock visible", async ({ page }) => {
    await expect(page.getByText(/niveau de stock par station/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("tableau objectifs mensuel visible", async ({ page }) => {
    await expect(
      page.getByText(/réalisations vs objectifs.*mensuel/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("tableau objectifs annuel visible", async ({ page }) => {
    await expect(
      page.getByText(/réalisations vs objectifs.*annuel/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("tableau écarts station visible", async ({ page }) => {
    await expect(page.getByText(/écarts par station/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("statistiques doléances visible", async ({ page }) => {
    await expect(page.getByText(/statistiques doléances/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("filtre station visible", async ({ page }) => {
    await expect(page.getByText(/filtrer par station/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("date de mise à jour visible dans les tableaux", async ({ page }) => {
    await expect(page.getByText(/mis à jour:/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
