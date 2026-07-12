import { NextRequest, NextResponse } from "next/server";
import { verifyToken, findUserByEmail, updateUser } from "@/lib/auth/db";

export async function PUT(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = verifyToken(auth.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const { name, email, grade, phone, university, avatar } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const existing = findUserByEmail(email);
    if (existing && existing.id !== payload.id) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const updated = updateUser(payload.id, { name, email, grade, phone, university, avatar });
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { password, ...safe } = updated;
    return NextResponse.json({ user: safe });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
