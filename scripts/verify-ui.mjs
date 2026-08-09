/**
 * Drives the company-side UI in a real browser.
 *
 * Exists because unit and integration tests cannot see a screen. Its first run
 * already caught two defects nothing else would have: post-signup redirecting to
 * a route deleted in the rewrite, and a duplicate company domain surfacing a raw
 * SQL error to the user.
 *
 * Usage:
 *   1. start a local Postgres and apply drizzle/0000_*.sql
 *   2. create a .env with DATABASE_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID,
 *      GOOGLE_CLIENT_SECRET (dummy values are fine locally)
 *   3. temporarily remove the "ai" binding from wrangler.jsonc — Workers AI
 *      cannot be emulated locally and forces a remote session
 *   4. pnpm dev
 *   5. node scripts/verify-ui.mjs
 *
 * Screenshots land in .verify-shots/ (gitignored).
 */

import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.VERIFY_SHOTS ?? ".verify-shots";
const CHROMIUM = process.env.VERIFY_CHROMIUM;

const stamp = Date.now();
const domain = `acme${stamp}.dev`;
const email = `founder@${domain}`;
const password = "correct-horse-battery";

mkdirSync(SHOTS, { recursive: true });

const log = (...args) => console.log("•", ...args);

const browser = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on("pageerror", (error) => console.log("  [pageerror]", error.message));

const shot = async (name) => {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  log(`screenshot: ${name}`);
};

const expect = (condition, message) => {
  if (!condition) {
    throw new Error(`Expectation failed: ${message}`);
  }
};

try {
  // Sign up.
  await page.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="John Doe"]', "Ann Founder");
  await page.fill('input[type="email"]', email);
  const passwords = page.locator('input[type="password"]');
  await passwords.nth(0).fill(password);
  await passwords.nth(1).fill(password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(6000);

  // Signup must land somewhere that exists — this is the regression that the
  // rewrite introduced and this script caught.
  expect(!page.url().includes("/dashboard"), "signup must not redirect to a deleted route");
  log("after signup:", page.url());

  await page.goto(`${BASE}/company`, { waitUntil: "networkidle" });
  await shot("01-companies-empty");

  // Create a company.
  await page.goto(`${BASE}/company/new`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="Acme AI"]', "Acme AI");
  await page.fill('input[placeholder="acme.dev"]', domain);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  const companyUrl = page.url();
  expect(/\/company\/[0-9a-f-]{36}$/.test(companyUrl), `expected a company URL, got ${companyUrl}`);
  const companyId = companyUrl.split("/company/")[1];
  await shot("02-onboarding-checklist");

  // Verify the domain, then accept the commitment.
  await page.locator('input[type="email"]').first().fill(`ann@${domain}`);
  await page.getByRole("button", { name: /verify/i }).click();
  await page.waitForTimeout(3000);

  await page.getByRole("button", { name: /accept and continue/i }).click();
  await page.waitForTimeout(3000);
  await shot("03-overview-live");

  expect(
    await page.getByText("No data yet").first().isVisible(),
    'an unmeasurable response rate must read "No data yet", never 0%',
  );

  // Create a draft, which opens the editor.
  await page.goto(`${BASE}/company/${companyId}/roles`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="Senior Backend Engineer"]', "Senior Backend Engineer");
  await page.getByRole("button", { name: /create draft/i }).click();
  await page.waitForTimeout(4000);
  expect(/\/roles\/[0-9a-f-]{36}$/.test(page.url()), `expected the editor, got ${page.url()}`);
  await shot("04-role-editor-incomplete");

  // A thin role must not be publishable — the checklist explains why.
  const checklist = await page.locator("body").innerText();
  expect(checklist.includes("Before this can go live"), "the publish checklist must be shown");
  expect(
    await page.getByRole("button", { name: /^publish$/i }).isDisabled(),
    "publish must stay disabled while the role is too thin to judge",
  );

  // Fill what matching and a reader actually need.
  await page.locator("textarea").first().fill(
    "You will own our ingestion pipeline end to end, working directly with the two founders. " +
      "Expect to shape the architecture, not just implement it, and to be the first person on call for it.",
  );
  await page.selectOption('select >> nth=0', "backend");
  await page.selectOption('select >> nth=1', "senior");
  await page.selectOption('select >> nth=2', "remote");
  await page.waitForTimeout(500);
  await shot("05-role-editor-ready");

  expect(
    !(await page.getByRole("button", { name: /^publish$/i }).isDisabled()),
    "publish must become available once the role is complete",
  );

  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.waitForTimeout(4000);
  await shot("06-role-published");

  // Unpublish must be offered, and must return the role to draft rather than archive.
  expect(
    await page.getByRole("button", { name: /unpublish/i }).isVisible(),
    "a live role must be pausable",
  );

  await page.goto(`${BASE}/company/${companyId}/roles`, { waitUntil: "networkidle" });
  await shot("07-roles-list");

  await page.goto(`${BASE}/company/${companyId}/applications`, { waitUntil: "networkidle" });
  await shot("08-inbox");

  await page.goto(`${BASE}/company/${companyId}/team`, { waitUntil: "networkidle" });
  await shot("09-team");

  // A duplicate domain must explain itself, not leak a SQL error.
  await page.goto(`${BASE}/company/new`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="Acme AI"]', "Acme AI Again");
  await page.fill('input[placeholder="acme.dev"]', domain);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await shot("10-duplicate-domain");

  const body = await page.locator("body").innerText();
  expect(!body.includes("Failed query"), "a duplicate domain must not surface raw SQL");
  expect(body.includes("already on the platform"), "a duplicate domain must explain itself");

  console.log(JSON.stringify({ ok: true, companyId, email }, null, 2));
} catch (error) {
  console.error("FAILED:", error.message);
  await shot("99-failure");
  process.exitCode = 1;
} finally {
  await browser.close();
}
