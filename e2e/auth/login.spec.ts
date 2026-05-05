import { expect, test } from "@playwright/test";
import { loginAs, TEST_CREDS } from "../fixtures/auth.fixture";

test.describe("Page de connexion — comportement public", () => {
  test("redirige /public/login vers login si non connecté", async ({
    page,
  }) => {
    await page.goto("/public/login");
    await expect(page).toHaveURL(/\/public\/login/);
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test("les pages manager redirigent vers login sans session", async ({
    page,
  }) => {
    await page.goto("/manager/dashboard");
    await expect(page).toHaveURL(/\/public\/login/);
  });

  test("les pages admin redirigent vers login sans session", async ({
    page,
  }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/public\/login/);
  });

  test("les pages partenaire redirigent vers login sans session", async ({
    page,
  }) => {
    await page.goto("/partner");
    await expect(page).toHaveURL(/\/public\/login/);
  });

  test("mauvais mot de passe → message d'erreur visible", async ({ page }) => {
    await page.goto("/public/login");
    await page.locator('[data-testid="email-input"]').fill("wrong@example.com");
    await page.locator('[data-testid="password-input"]').fill("wrongpassword");
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/auth/") && r.request().method() === "POST",
        { timeout: 20_000 },
      ),
      page.locator('[data-testid="login-button"]').click(),
    ]);
    expect(response.status()).not.toBe(200);
    await expect(
      page.locator('[data-sonner-toast][data-type="error"]'),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Connexion gérant", () => {
  test.skip(!TEST_CREDS.gerant.email, "TEST_GERANT_EMAIL non configuré");

  test("login gérant → redirect /manager/dashboard", async ({ page }) => {
    await loginAs(page, TEST_CREDS.gerant.email, TEST_CREDS.gerant.password);
    await expect(page).toHaveURL(/\/manager\/dashboard/, { timeout: 15_000 });
  });
});

test.describe("Connexion partenaire", () => {
  test.skip(
    !TEST_CREDS.partenaire.email,
    "TEST_PARTENAIRE_EMAIL non configuré",
  );

  test("login partenaire → redirect /partner", async ({ page }) => {
    await loginAs(
      page,
      TEST_CREDS.partenaire.email,
      TEST_CREDS.partenaire.password,
    );
    await expect(page).toHaveURL(/\/partner/, { timeout: 15_000 });
  });
});

test.describe("Connexion superadmin", () => {
  test.skip(!TEST_CREDS.admin.email, "TEST_ADMIN_EMAIL non configuré");

  test("login admin → redirect /admin/dashboard", async ({ page }) => {
    await loginAs(page, TEST_CREDS.admin.email, TEST_CREDS.admin.password);
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15_000 });
  });
});
