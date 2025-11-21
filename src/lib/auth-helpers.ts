import type { Session } from "next-auth";

import { auth } from "@/auth";

export async function requireAdminSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    const error = new Error("UNAUTHORIZED");
    error.name = "UNAUTHORIZED";
    throw error;
  }
  return session;
}
