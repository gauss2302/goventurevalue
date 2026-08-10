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

  // --- Company: an internal move, which the candidate must not see ---------
  await company.goto(`${BASE}/company/${companyId}/applications`, {
    waitUntil: "networkidle",
  });
  await shot(company, "loop-06-inbox");
  text = await company.locator("body").innerText();
  expect(text.includes("Senior Backend Engineer"), "the application must reach the inbox");

  await company.locator('a[href*="/applications/"]').first().click();
  await company.waitForTimeout(3000);

  // The internal status control, which is the first select on the page.
  await company.selectOption("select >> nth=0", "in_review");
  await company.waitForTimeout(2500);
  text = await company.locator("body").innerText();
  expect(
    !text.includes("Answered"),
    "moving an application to in review must not count as a reply",
  );
  await shot(company, "loop-07-status-changed-still-pending");

  // The candidate's flow, before anything has been said to them.
  await candidate.goto(`${BASE}/applications`, { waitUntil: "networkidle" });
  await candidate.locator('a[href*="/applications/"]').first().click();
  await candidate.waitForTimeout(3000);
  const flowUrl = candidate.url();
  await shot(candidate, "loop-08-flow-before-reply");
  text = await candidate.locator("body").innerText();
  expect(
    !text.includes("Moved to Under review"),
    "an internal stage move must not leak into the candidate's flow",
  );
  expect(
    text.includes("committed to replying by"),
    "the flow must show the commitment as a recorded fact",
  );
  expect(
    text.includes("do not show their internal pipeline"),
    "the flow must say what the stage rail does and does not mean",
  );
  expect(
    text.includes("Opens once"),
    "the candidate must be told why they cannot write back yet",
  );

  // --- Company: reply, and tell them the stage -----------------------------
  await company.locator("textarea").first().fill("Thanks — we would like to talk next week.");
  // The second select shares a stage as part of the reply.
  await company.selectOption("select >> nth=1", "interviewing");
  await company.getByRole("button", { name: /send reply/i }).click();
  await company.waitForTimeout(4000);
  await shot(company, "loop-09-replied");
  text = await company.locator("body").innerText();
  expect(
    text.includes("Told them:"),
    "the company must be able to see which stage move the candidate was told about",
  );

  // --- Candidate: the full update -----------------------------------------
  await candidate.goto(`${BASE}/applications`, { waitUntil: "networkidle" });
  await shot(candidate, "loop-10-tracker-answered");
  text = await candidate.locator("body").innerText();
  expect(text.includes("Answered"), "the candidate must see that the promise was kept");
  expect(text.includes("Interviewing"), "the tracker must show the stage they were told");
  expect(text.includes("New"), "an unread reply must be marked as new");

  await candidate.goto(flowUrl, { waitUntil: "networkidle" });
  await candidate.waitForTimeout(1500);
  await shot(candidate, "loop-11-flow-answered");
  text = await candidate.locator("body").innerText();
  expect(
    text.includes("Thanks — we would like to talk next week."),
    "the candidate must read the reply itself, not only a badge",
  );
  expect(
    text.includes("Moved to Interviewing"),
    "a stage shared with the reply must reach the candidate",
  );
  expect(
    text.includes("reply that met their commitment"),
    "the flow must say which message settled the promise",
  );
  expect(
    !text.includes("No replies measured yet"),
    "a page showing a reply must not also claim the company has no measured replies",
  );

  // --- Candidate: writes back ---------------------------------------------
  await candidate.locator("textarea").first().fill("Thanks — Tuesday works for me.");
  await candidate.getByRole("button", { name: /^send$/i }).click();
  await candidate.waitForTimeout(4000);
  await shot(candidate, "loop-12-flow-candidate-replied");
  text = await candidate.locator("body").innerText();
  expect(text.includes("You replied"), "the candidate's own message must appear in the flow");
  expect(
    text.includes("Tuesday works for me"),
    "the candidate's message must be stored and shown",
  );

  // Opening the flow clears the unread marker for the next visit.
  await candidate.goto(`${BASE}/applications`, { waitUntil: "networkidle" });
  text = await candidate.locator("body").innerText();
  expect(!text.includes("New"), "reading the flow must clear the unread marker");

  // --- Company: sees the candidate's message ------------------------------
  await company.reload({ waitUntil: "networkidle" });
  await company.waitForTimeout(1500);
  await shot(company, "loop-13-company-sees-candidate-message");
  text = await company.locator("body").innerText();
  expect(
    text.includes("Candidate wrote") && text.includes("Tuesday works for me"),
    "the company must see what the candidate wrote back",
  );

  console.log(JSON.stringify({ ok: true, companyId, jobId }, null, 2));
} catch (error) {
  console.error("FAILED:", error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
