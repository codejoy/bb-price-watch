import { prisma } from "./db";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE = "bbp_session_user";

export async function registerUser(email: string, password: string) {
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed },
  });
  return user;
}

export async function verifyUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  return user;
}
