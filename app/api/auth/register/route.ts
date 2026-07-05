import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createUser, signToken } from "@/lib/auth/db";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    if (findUserByEmail(email)) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const user = await createUser(name, email, password);
    const token = signToken(user);

    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
