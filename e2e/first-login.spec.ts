import { test, expect } from "@playwright/test";

test.describe("/public/first-login", () => {
  test("sans session, l’app renvoie vers la page de connexion", async ({
    page,
  }) => {
    await page.goto("/public/first-login");
    await expect(page).toHaveURL(/\/public\/login/);
  });

  test("la page first-login contient le formulaire lorsque must_change (manuel / futur mock)", async ({
    page,
  }) => {
    test.skip(
      !process.env.E2E_FIRST_LOGIN_SESSION,
      "Définir E2E_FIRST_LOGIN_SESSION (storage state) pour un test connecté complet."
    );
    await page.goto("/public/first-login");
    await expect(
      page.getByRole("heading", { name: /Définir votre mot de passe/i })
    ).toBeVisible();
  });
});
