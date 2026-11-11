import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type infer as ZodInfer } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response> | Response;

/** Wraps a route handler: maps ApiError/ZodError to JSON responses and hides internals. */
export function route<C = { params: Record<string, string> }>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message, ...e.extra }, { status: e.status });
      if (e instanceof ZodError)
        return NextResponse.json({ error: "Invalid request", issues: e.flatten() }, { status: 400 });
      console.error("[api]", req.method, new URL(req.url).pathname, e);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<ZodInfer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  return schema.parse(json);
}

export function clientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}
