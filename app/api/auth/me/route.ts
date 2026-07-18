import { NextRequest, NextResponse } from "next/server";
import { verifyToken, findUserById } from "@/lib/auth/db";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = verifyToken(auth.slice(7));
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const user = await findUserById(payload.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { password, ...safe } = user;
  return NextResponse.json({ user: safe });
}
