/**
 * Drives the whole loop in a real browser: a company publishes a role, a
 * candidate applies, the company replies, and the promise is recorded as kept.
 *
 * This is the first check that exercises an application a person actually
 * submitted rather than a row a fixture inserted, so it is the one that proves
 * the SLA machinery works in the product and not only in the services.
 *
 * Setup is the same as scripts/verify-ui.mjs. Run with:
 *   node scripts/verify-loop.mjs
 */

import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.VERIFY_SHOTS ?? ".verify-shots";
const CHROMIUM = process.env.VERIFY_CHROMIUM;

const stamp = Date.now();
const domain = `loop${stamp}.dev`;
const password = "correct-horse-battery";

mkdirSync(SHOTS, { recursive: true });

const log = (...args) => console.log("•", ...args);
const expect = (condition, message) => {
  if (!condition) throw new Error(`Expectation failed: ${message}`);
};

const browser = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {});

const signUp = async (page, email, name) => {
  await page.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="John Doe"]', name);
  await page.fill('input[type="email"]', email);
  const passwords = page.locator('input[type="password"]');
  await passwords.nth(0).fill(password);
  await passwords.nth(1).fill(password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(6000);
};

const shot = async (page, name) => {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  log(`screenshot: ${name}`);
};

try {
  // --- Company: publish a role -------------------------------------------
  const company = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  company.on("pageerror", (e) => console.log("  [company pageerror]", e.message));

  await signUp(company, `founder@${domain}`, "Ann Founder");

  await company.goto(`${BASE}/company/new`, { waitUntil: "networkidle" });
  await company.fill('input[placeholder="Acme AI"]', "Loop Co");
  await company.fill('input[placeholder="acme.dev"]', domain);
  await company.click('button[type="submit"]');
  await company.waitForTimeout(4000);
  const companyId = company.url().split("/company/")[1];

  await company.locator('input[type="email"]').first().fill(`ann@${domain}`);
  await company.getByRole("button", { name: /verify/i }).click();
  await company.waitForTimeout(2500);
  await company.getByRole("button", { name: /accept and continue/i }).click();
  await company.waitForTimeout(2500);

  await company.goto(`${BASE}/company/${companyId}/roles`, { waitUntil: "networkidle" });
  await company.fill('input[placeholder="Senior Backend Engineer"]', "Senior Backend Engineer");
  await company.getByRole("button", { name: /create draft/i }).click();
  await company.waitForTimeout(3500);
  const jobId = company.url().split("/roles/")[1].split("/")[0];

  await company.locator("textarea").first().fill(
    "You will own our ingestion pipeline end to end, working directly with the two founders. " +
      "Expect to shape the architecture rather than only implement it.",
  );
  await company.selectOption("select >> nth=0", "backend");
  await company.selectOption("select >> nth=1", "senior");
  await company.selectOption("select >> nth=2", "remote");
  await company.getByRole("button", { name: /^publish$/i }).click();
  await company.waitForTimeout(3500);
  log("role published:", jobId);

  // --- Candidate: profile, then apply -------------------------------------
  const candidate = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  candidate.on("pageerror", (e) => console.log("  [candidate pageerror]", e.message));

  await signUp(candidate, `dev@mail${stamp}.dev`, "Bo Candidate");

  // Applying must be refused while the profile is incomplete, and say so.
  await candidate.goto(`${BASE}/jobs/${jobId}`, { waitUntil: "networkidle" });
  await shot(candidate, "loop-01-role-before-profile");
  let text = await candidate.locator("body").innerText();
  expect(
    text.includes("Finish your profile to apply"),
    "an incomplete profile must be told what is missing, not shown a dead button",
  );

  await candidate.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await candidate.getByRole("button", { name: /^backend$/i }).click();
  await candidate.selectOption("select >> nth=0", "senior");
  await candidate.selectOption("select >> nth=1", "remote");
  await candidate.fill('input[placeholder="Europe/Berlin"]', "Europe/Berlin");
  await candidate.fill(
    'input[placeholder="TypeScript, Postgres, Kubernetes"]',
    "TypeScript, Postgres",
  );
  await candidate.getByRole("button", { name: /^save$/i }).click();
  await candidate.waitForTimeout(2500);

  await candidate.getByRole("button", { name: /add a role/i }).click();
  await candidate.waitForTimeout(500);
  const inputs = candidate.locator("form input[type='text'], form input:not([type])");
  await inputs.nth(0).fill("Previous Startup");
  await inputs.nth(1).fill("Backend Engineer");
  await candidate.getByRole("button", { name: /^add$/i }).click();
  await candidate.waitForTimeout(2500);
  await shot(candidate, "loop-02-profile-complete");

  text = await candidate.locator("body").innerText();
  expect(text.includes("profile is complete"), "a finished profile must say so");

  // Now applying is available, and the allowance is visible.
  await candidate.goto(`${BASE}/jobs/${jobId}`, { waitUntil: "networkidle" });
  await shot(candidate, "loop-03-role-can-apply");
  text = await candidate.locator("body").innerText();
  expect(text.includes("applications left this week"), "the weekly allowance must be visible");

  await candidate.locator("textarea").first().fill("I have built exactly this before.");
  await candidate.getByRole("button", { name: /^apply$/i }).click();
  await candidate.waitForTimeout(4000);
  await shot(candidate, "loop-04-applied");

  await candidate.goto(`${BASE}/applications`, { waitUntil: "networkidle" });
  await shot(candidate, "loop-05-tracker-pending");
  text = await candidate.locator("body").innerText();
  expect(
    text.includes("committed to replying by"),
    "the candidate must see the deadline the company is working to",
  );

  // --- Company: reply ------------------------------------------------------
  await company.goto(`${BASE}/company/${companyId}/applications`, {
    waitUntil: "networkidle",
  });
  await shot(company, "loop-06-inbox");
  text = await company.locator("body").innerText();
  expect(text.includes("Senior Backend Engineer"), "the application must reach the inbox");

  await company.locator('a[href*="/applications/"]').first().click();
  await company.waitForTimeout(3000);

  // An internal status change must not satisfy the promise.
  await company.selectOption("select >> nth=0", "in_review");
  await company.waitForTimeout(2500);
  text = await company.locator("body").innerText();
  expect(
    !text.includes("Answered"),
    "moving an application to in review must not count as a reply",
  );
  await shot(company, "loop-07-status-changed-still-pending");

  await company.locator("textarea").first().fill("Thanks — we would like to talk next week.");
  await company.getByRole("button", { name: /send reply/i }).click();
  await company.waitForTimeout(4000);
  await shot(company, "loop-08-replied");

  // --- Candidate: sees the reply ------------------------------------------
  await candidate.goto(`${BASE}/applications`, { waitUntil: "networkidle" });
  await shot(candidate, "loop-09-tracker-answered");
  text = await candidate.locator("body").innerText();
  expect(text.includes("Answered"), "the candidate must see that the promise was kept");

  console.log(JSON.stringify({ ok: true, companyId, jobId }, null, 2));
} catch (error) {
  console.error("FAILED:", error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
