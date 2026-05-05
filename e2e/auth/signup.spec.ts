import { test, expect } from "@playwright/test";

test.describe("Page inscription — comportement public", () => {
  test("la page signup est accessible sans session", async ({ page }) => {
    await page.goto("/public/signup");
    await expect(page).toHaveURL(/\/public\/signup/);
  });

  test("le formulaire d'inscription contient les champs requis", async ({ page }) => {
    await page.goto("/public/signup");
    await expect(page.getByLabel(/Nom/i).first()).toBeVisible();
    await expect(page.getByLabel(/Email/i).first()).toBeVisible();
    await expect(page.getByLabel(/Mot de passe/i).first()).toBeVisible();
  });

  test("soumission avec email invalide affiche une erreur de validation", async ({ page }) => {
    await page.goto("/public/signup");
    const emailInput = page.getByLabel(/Email/i).first();
    await emailInput.fill("pasunemail");
    await emailInput.blur();
    await expect(page.getByText(/email invalide/i)).toBeVisible({ timeout: 5_000 });
  });

  test.skip(
    !process.env.TEST_ALLOW_SIGNUP,
    "TEST_ALLOW_SIGNUP non activé — évite la création de comptes réels"
  );
});
