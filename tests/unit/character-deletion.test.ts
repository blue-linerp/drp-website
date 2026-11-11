import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ deleteMany: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { character: { deleteMany: mocks.deleteMany } } }));
vi.mock("@/lib/fivem-auth", () => ({ verifyFivemRequest: mocks.verify }));

import { POST } from "@/app/api/fivem/characters/deleted/route";
import { ApiError } from "@/lib/api";

const request = (body: unknown) => new Request("https://example.com/api/fivem/characters/deleted", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const context = { params: {} };

describe("confirmed character deletion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("deletes only the citizen ID reported by the game server", async () => {
    const response = await POST(request({ citizenid: "ABC123" }), context);
    expect(response.status).toBe(200);
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { citizenid: "ABC123" } });
  });

  it("rejects unauthenticated and invalid reports without deleting anything", async () => {
    mocks.verify.mockImplementationOnce(() => { throw new ApiError(401, "Invalid API key"); });
    expect((await POST(request({ citizenid: "ABC123" }), context)).status).toBe(401);
    expect((await POST(request({ citizenid: "" }), context)).status).toBe(400);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});
