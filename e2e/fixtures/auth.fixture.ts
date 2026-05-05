import { type Page } from "@playwright/test";

export async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/public/login");
  await page.locator('[data-testid="email-input"]').fill(email);
  await page.locator('[data-testid="password-input"]').fill(password);
  await page.locator('[data-testid="login-button"]').click();
}

export const TEST_CREDS = {
  gerant: {
    email: process.env.TEST_GERANT_EMAIL ?? "",
    password: process.env.TEST_GERANT_PASSWORD ?? "",
  },
  partenaire: {
    email: process.env.TEST_PARTENAIRE_EMAIL ?? "",
    password: process.env.TEST_PARTENAIRE_PASSWORD ?? "",
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? "",
    password: process.env.TEST_ADMIN_PASSWORD ?? "",
  },
};
