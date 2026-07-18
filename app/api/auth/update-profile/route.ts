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

    const { name, email, userType, grade, phone, organization, avatar } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const existing = await findUserByEmail(email);
    if (existing && existing.id !== payload.id) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const updated = await updateUser(payload.id, { name, email, userType, grade, phone, organization, avatar });
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
