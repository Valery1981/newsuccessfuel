import { test, expect } from "@playwright/test";
import { loginAs, TEST_CREDS } from "../fixtures/auth.fixture";

test.describe("Admin — Validation des stations", () => {
  test.skip(!TEST_CREDS.admin.email, "TEST_ADMIN_EMAIL non configuré");

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_CREDS.admin.email, TEST_CREDS.admin.password);
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15_000 });
  });

  test("page admin stations accessible", async ({ page }) => {
    await page.goto("/admin/stations");
    await expect(page).toHaveURL(/\/admin\/stations/);
    await expect(
      page.getByRole("heading", { name: /station/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("filtres statut et partenaire visibles", async ({ page }) => {
    await page.goto("/admin/stations");
    await expect(
      page.getByRole("combobox").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("dashboard admin affiche les KPIs globaux", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/station/i).first()).toBeVisible();
  });

  test("journal audit accessible avec export CSV", async ({ page }) => {
    await page.goto("/admin/audit-logs");
    await expect(page).toHaveURL(/audit-logs/);
    await expect(page.getByRole("button", { name: /exporter csv/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("page revenus admin accessible", async ({ page }) => {
    await page.goto("/admin/revenue");
    await expect(page).toHaveURL(/revenue/);
    await expect(
      page.getByRole("heading", { name: /revenu/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("page dépenses admin accessible", async ({ page }) => {
    await page.goto("/admin/expenses");
    await expect(page).toHaveURL(/expenses/);
    await expect(
      page.getByRole("heading", { name: /d[ée]pense/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test.skip(
    !process.env.TEST_ALLOW_MUTATIONS,
    "TEST_ALLOW_MUTATIONS non activé — évite les mutations de données réelles"
  );
});
