import { compare, hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { loginSchema, registerSchema } from "./validators";

export class UserError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const dummyHash =
  "$2a$12$C6UzMDM.H6dfI/f/IKcEeOeWE3Iq9ci/NAtJaG11QH5wBrFX.QrfO";

export async function registerUser(input: unknown) {
  const data = registerSchema.parse(input);
  const passwordHash = await hash(data.password, 12);
  try {
    return await db.user.create({
      data: { name: data.name, email: data.email, passwordHash },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new UserError("Email is already registered.", 409);
    throw error;
  }
}

export async function authenticateCredentials(input: unknown) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;
  const now = new Date();
  const throttle = await db.loginThrottle.findUnique({ where: { email } });
  if (
    throttle &&
    now.getTime() - throttle.windowStartedAt.getTime() < WINDOW_MS &&
    throttle.attempts >= MAX_ATTEMPTS
  )
    return null;
  const user = await db.user.findUnique({ where: { email } });
  const valid = await compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !valid) {
    if (
      !throttle ||
      now.getTime() - throttle.windowStartedAt.getTime() >= WINDOW_MS
    ) {
      await db.loginThrottle.upsert({
        where: { email },
        create: { email, attempts: 1, windowStartedAt: now },
        update: { attempts: 1, windowStartedAt: now },
      });
    } else {
      await db.loginThrottle.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
    }
    return null;
  }
  await db.loginThrottle.deleteMany({ where: { email } });
  return { id: user.id, name: user.name, email: user.email };
}
