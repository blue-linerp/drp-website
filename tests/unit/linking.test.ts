import { describe, expect, it, beforeAll } from "vitest";
import { constants, generateKeyPairSync, publicEncrypt } from "node:crypto";

beforeAll(() => {
  process.env.AUTH_SECRET ??= "unit-test-secret-unit-test-secret";
});

describe("sealed link state", async () => {
  const { seal, unseal } = await import("@/lib/link-state");

  it("round-trips data", () => {
    const t = seal({ uid: "u1", state: "abc" }, 60);
    expect(unseal<{ uid: string; state: string }>(t)).toMatchObject({ uid: "u1", state: "abc" });
  });

  it("rejects tampered or expired tokens", () => {
    const t = seal({ uid: "u1" }, 60);
    const bytes = Buffer.from(t, "base64url");
    bytes[bytes.length - 1] ^= 1;
    expect(unseal(bytes.toString("base64url"))).toBeNull();
    expect(unseal(seal({ uid: "u1" }, -1))).toBeNull();
    expect(unseal("garbage")).toBeNull();
    expect(unseal(undefined)).toBeNull();
  });
});

describe("steam", async () => {
  const { steamHexFromId64, steamLoginUrl, verifySteamAssertion } = await import("@/lib/linking");

  it("converts SteamID64 to the hex identifier FiveM reports", () => {
    // 76561197960265728 is the base of the individual-account range (0x110000100000000).
    expect(steamHexFromId64("76561197960265728")).toBe("steam:110000100000000");
    // 76561198000000000 − 76561197960265728 = 39 734 272 = 0x25E4C00
    expect(steamHexFromId64("76561198000000000")).toBe("steam:1100001025e4c00");
  });

  it("builds an OpenID 2.0 checkid_setup request", () => {
    const u = new URL(steamLoginUrl("http://localhost:3000/api/link/steam/callback?state=s"));
    expect(u.origin + u.pathname).toBe("https://steamcommunity.com/openid/login");
    expect(u.searchParams.get("openid.mode")).toBe("checkid_setup");
    expect(u.searchParams.get("openid.return_to")).toContain("state=s");
  });

  it("rejects assertions that don't come from Steam before calling out", async () => {
    const base = {
      "openid.mode": "id_res",
      "openid.op_endpoint": "https://steamcommunity.com/openid/login",
      "openid.return_to": "http://localhost:3000/api/link/steam/callback?state=s",
      "openid.claimed_id": "https://steamcommunity.com/openid/id/76561198000000000",
    };
    const expected = "http://localhost:3000/api/link/steam/callback";
    expect(await verifySteamAssertion(new URLSearchParams({ ...base, "openid.mode": "cancel" }), expected)).toBeNull();
    expect(await verifySteamAssertion(new URLSearchParams({ ...base, "openid.op_endpoint": "https://evil.example/openid" }), expected)).toBeNull();
    expect(await verifySteamAssertion(new URLSearchParams({ ...base, "openid.return_to": "https://evil.example/cb" }), expected)).toBeNull();
    expect(await verifySteamAssertion(new URLSearchParams({ ...base, "openid.claimed_id": "https://evil.example/id/1" }), expected)).toBeNull();
  });
});

describe("cfx.re payload", async () => {
  const { decryptCfxPayload, newCfxRequest } = await import("@/lib/linking");

  it("decrypts a Discourse PKCS#1 v1.5 payload", () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    const msg = JSON.stringify({ key: "user-api-key-123", nonce: "n0nce", push: false, api: 4 });
    const payload = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(msg)).toString("base64");
    expect(decryptCfxPayload(payload, privateKey)).toMatchObject({ key: "user-api-key-123", nonce: "n0nce" });
    // Query strings can turn "+" into spaces; that's tolerated.
    expect(decryptCfxPayload(payload.replace(/\+/g, " "), privateKey)?.key).toBe("user-api-key-123");
  });

  it("returns null for a payload encrypted to a different key", () => {
    const other = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
    const mine = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
    const payload = publicEncrypt({ key: other.publicKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from('{"key":"k","nonce":"n"}')).toString("base64");
    expect(decryptCfxPayload(payload, mine.privateKey)).toBeNull();
  });

  it("requests only the session_info scope", () => {
    const r = newCfxRequest("http://localhost:3000/api/link/cfx/callback");
    const u = new URL(r.url);
    expect(u.origin + u.pathname).toBe("https://forum.cfx.re/user-api-key/new");
    expect(u.searchParams.get("scopes")).toBe("session_info");
    expect(u.searchParams.get("nonce")).toBe(r.nonce);
    expect(u.searchParams.get("public_key")).toContain("BEGIN PUBLIC KEY");
  });
});
