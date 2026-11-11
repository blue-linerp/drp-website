import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { getGuides } from "@/lib/content";

export const revalidate = 300;

export const GET = route(async () => NextResponse.json({ guides: await getGuides() }));
