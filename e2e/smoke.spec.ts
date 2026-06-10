import { expect, test } from "@playwright/test";

// These run against the app booted with dummy Supabase env (no real backend),
// so they cover the public, unauthenticated surface: routing/auth-gating and
// that the login UI renders. Flows that require a real session (login,
// production entry) need a seeded Supabase project and are out of CI scope.

test("a protected page redirects an unauthenticated visitor to login", async ({
  page,
}) => {
  await page.goto("/entry");
  await expect(page).toHaveURL(/\/login/);
});

test("the redirect preserves the originally requested path", async ({
  page,
}) => {
  await page.goto("/insights");
  await expect(page).toHaveURL(/\/login\?next=%2Finsights/);
});

test("the login page renders the sign-in form", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: /sign in to we bonus tracker/i }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});
