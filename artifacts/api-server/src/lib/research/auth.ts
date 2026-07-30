import { verifyToken } from "@/lib/auth/db";

export function getUserFromRequest(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}
