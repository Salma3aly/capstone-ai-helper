import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/db";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = verifyToken(auth.slice(7));
  if (!user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  return NextResponse.json({ user });
}
