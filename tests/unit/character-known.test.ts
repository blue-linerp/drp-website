import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUser: vi.fn(), findCharacters: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.findUser }, character: { findMany: mocks.findCharacters } } }));
vi.mock("@/lib/fivem-auth", () => ({ verifyFivemRequest: mocks.verify, normId: (_: string, value: string) => value }));
import { POST } from "@/app/api/fivem/characters/known/route";
import { ApiError } from "@/lib/api";

const request = () => new Request("https://example.com/api/fivem/characters/known", { method: "POST", body: JSON.stringify({ license: "license:abc" }) });
const context = { params: {} };

describe("known character reconciliation", () => {
  beforeEach(() => vi.resetAllMocks());
  it("returns only character IDs for the licence owner", async () => {
    mocks.findUser.mockResolvedValue({ id: "user1" });
    mocks.findCharacters.mockResolvedValue([{ citizenid: "ABC" }]);
    const response = await POST(request(), context);
    expect(await response.json()).toEqual({ ok: true, characters: ["ABC"] });
    expect(mocks.findCharacters).toHaveBeenCalledWith({ where: { userId: "user1" }, select: { citizenid: true } });
  });
  it("rejects unauthenticated requests and unknown accounts", async () => {
    mocks.verify.mockImplementationOnce(() => { throw new ApiError(401, "Invalid API key"); });
    expect((await POST(request(), context)).status).toBe(401);
    mocks.findUser.mockResolvedValue(null);
    expect((await POST(request(), context)).status).toBe(404);
    expect(mocks.findCharacters).not.toHaveBeenCalled();
  });
});
