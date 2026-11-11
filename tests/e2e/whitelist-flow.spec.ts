import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const ADMIN_ROLE = "900000000000000001";

/** A Discord-style snowflake for an account created years ago (passes the account-age gate). */
function oldSnowflake() {
  const created = BigInt(Date.parse("2021-03-01T00:00:00Z")) - 1420070400000n;
  const rand = BigInt(Math.floor(Math.random() * 4_000_000));
  return ((created << 22n) | rand).toString();
}

/** Signs in through the test-only Credentials provider (enabled by AUTH_TEST_LOGIN_SECRET). */
async function signIn(request: APIRequestContext, discordId: string, username: string, roles = "") {
  const { csrfToken } = await (await request.get("/api/auth/csrf")).json();
  const res = await request.post("/api/auth/callback/test-login", {
    form: { csrfToken, discordId, username, roles, secret: "e2e-login", callbackUrl: "/profile" },
    maxRedirects: 0,
  });
  expect([200, 302]).toContain(res.status());
  const me = await (await request.get("/api/me")).json();
  expect(me.user?.discordId).toBe(discordId);
}

async function fillLong(page: Page, label: RegExp, n: number) {
  await page.getByLabel(label).fill("I enjoy slow, character-driven roleplay and building stories with other people. ".repeat(Math.ceil(n / 80)).slice(0, n + 20));
}

test("sign in → apply for whitelist → admin accepts → player is whitelisted", async ({ browser, baseURL }) => {
  const applicantId = oldSnowflake();
  const adminId = oldSnowflake();

  // --- Applicant applies ---
  const applicant = await browser.newContext({ baseURL });
  await signIn(applicant.request, applicantId, `applicant_${applicantId.slice(-5)}`);
  const page = await applicant.newPage();

  await page.goto("/applications");
  await expect(page.getByRole("heading", { name: "Applications." })).toBeVisible();
  await page.goto("/applications/whitelist");
  await expect(page.getByText("The use of AI to write applications is prohibited.")).toBeVisible();

  // Step 1: About you
  await page.getByLabel(/How old are you/).fill("24");
  await page.getByLabel(/Which timezone/).selectOption("EU");
  await fillLong(page, /roleplay experience/, 120);
  await page.getByText("A friend", { exact: true }).click();
  await page.getByRole("button", { name: /Continue/ }).click();

  // Step 2: Your character
  await page.getByLabel(/character's name/).fill("Marlow Reyes");
  await fillLong(page, /backstory/, 270);
  await fillLong(page, /goals for their first month/, 120);
  await page.getByRole("button", { name: /Continue/ }).click();

  // Step 3: Scenarios
  await fillLong(page, /three armed people/, 170);
  await fillLong(page, /friend on Discord/, 120);
  await fillLong(page, /RDM, VDM/, 170);
  await page.getByRole("button", { name: /Continue/ }).click();

  // Step 4: Final check
  await page.getByRole("group", { name: /working microphone/ }).getByText("Yes", { exact: true }).click();
  await page.getByLabel(/I have read and agree to the server rules/).check();
  await page.getByRole("button", { name: /Review answers/ }).click();

  await expect(page.getByRole("heading", { name: "Review your answers." })).toBeVisible();
  await page.getByRole("button", { name: /Submit application/ }).click();
  await expect(page.getByRole("heading", { name: "Application sent." })).toBeVisible();
  const reference = (await page.locator("text=/^DRP-[A-Z0-9]{6}$/").first().textContent())!.trim();
  expect(reference).toMatch(/^DRP-/);

  // Not whitelisted yet.
  expect((await (await applicant.request.get("/api/me")).json()).user.whitelisted).toBe(false);

  // --- Admin accepts ---
  const admin = await browser.newContext({ baseURL });
  await signIn(admin.request, adminId, `admin_${adminId.slice(-5)}`, ADMIN_ROLE);
  const adminPage = await admin.newPage();
  await adminPage.goto(`/admin/applications?q=${reference}&status=all`);
  await adminPage.getByRole("link", { name: /Review/ }).first().click();
  await expect(adminPage.getByRole("heading", { name: "Whitelist" })).toBeVisible();
  await adminPage.getByRole("button", { name: "Accept", exact: true }).click();
  await adminPage.getByRole("button", { name: "Confirm accept" }).click();
  await expect(adminPage.getByText("Status updated.")).toBeVisible();
  await expect(adminPage.getByText("Accepted", { exact: true }).first()).toBeVisible();

  // --- Applicant is now whitelisted ---
  const me = (await (await applicant.request.get("/api/me?sync=1")).json()).user;
  expect(me.whitelisted).toBe(true);
  await page.goto("/queue");
  await expect(page.getByRole("heading", { name: "You're whitelisted." })).toBeVisible();

  // --- FiveM resource sees the same data ---
  const license = `license:e2e${applicantId}`;
  const fivem = { "x-api-key": "e2e-fivem" };
  const check = await (await applicant.request.post("/api/fivem/check", { headers: fivem, data: { license, discordId: `discord:${applicantId}` } })).json();
  expect(check).toMatchObject({ allowed: true, reason: "ok", priority: 0, banned: false });
  // Licence is linked on first connect and shown on the profile.
  expect((await (await applicant.request.get("/api/me")).json()).user.license).toBe(license);
  // Heartbeat with the player queued → the website shows their live position.
  const hb = await applicant.request.post("/api/fivem/heartbeat", {
    headers: fivem,
    data: { players: [], queue: [{ license: "license:someone-else", priority: 40, joinedAt: Date.now() - 5000 }, { license, discordId: applicantId, priority: 0, joinedAt: Date.now() }], maxClients: 64 },
  });
  expect(hb.status()).toBe(200);
  expect((await hb.json()).priorities[license]).toBe(0);
  expect((await (await applicant.request.get("/api/me")).json()).user.queue).toEqual({ position: 2, length: 2 });

  // Non-staff can't reach admin APIs.
  const denied = await applicant.request.patch("/api/admin/users/whatever", { data: { resync: true } });
  expect(denied.status()).toBe(403);

  await applicant.close();
  await admin.close();
});

test("FiveM check endpoint rejects bad keys and gates on whitelist", async ({ request }) => {
  const bad = await request.post("/api/fivem/check", { data: { license: "license:abc123" }, headers: { "x-api-key": "nope" } });
  expect(bad.status()).toBe(401);
  const unknown = await request.post("/api/fivem/check", {
    data: { license: `license:${Date.now()}`, discordId: oldSnowflake() },
    headers: { "x-api-key": "e2e-fivem" },
  });
  expect(unknown.status()).toBe(200);
  const body = await unknown.json();
  expect(body.allowed).toBe(false);
  expect(body.reason).toBe("not_registered");
});
