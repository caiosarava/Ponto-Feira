import { TRPCError } from "@trpc/server";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { serialize } from "cookie";
import type { SerializeOptions } from "cookie";
import { z } from "zod";
import { Session } from "../contracts/constants.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { getSessionCookieOptions } from "./lib/cookies.js";
import { createRouter, publicQuery } from "./middleware.js";
import { signSessionToken } from "./auth/session.js";
import { getDb } from "./queries/connection.js";
import {
  appendUserCredentials,
  getUserCredentialsByEmail,
} from "./services/googleSheets.js";

const scrypt = promisify(scryptCallback);
const db = getDb();

type UserCredentialRecord = {
  email: string;
  passwordHash: string;
  name?: string | null;
  role?: "user" | "admin";
};

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== hash.length) return false;
  return timingSafeEqual(keyBuffer, hash);
}

async function findUserByEmail(email: string): Promise<UserCredentialRecord | null> {
  const googleSheetId =
    process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (googleSheetId) {
    return await getUserCredentialsByEmail(googleSheetId, email);
  }

  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!dbUser.length || !dbUser[0].password) {
    return null;
  }

  return {
    email: dbUser[0].email,
    passwordHash: dbUser[0].password,
    name: dbUser[0].name,
    role: dbUser[0].role,
  };
}

function setSessionCookie(
  headers: Headers,
  requestHeaders: Headers,
  token: string,
  maxAge: number,
) {
  const options = getSessionCookieOptions(requestHeaders);
  const serializeOptions: SerializeOptions = {
    httpOnly: options.httpOnly,
    path: options.path,
    secure: options.secure,
    sameSite:
      options.sameSite?.toLowerCase() === "strict"
        ? "strict"
        : options.sameSite?.toLowerCase() === "none"
          ? "none"
          : "lax",
    maxAge,
  };

  headers.append(
    "set-cookie",
    serialize(Session.cookieName, token, serializeOptions),
  );
}

const authRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(2).max(80).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await findUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este email já está cadastrado.",
        });
      }

      const passwordHash = await hashPassword(input.password);

      await db.insert(users).values({
        email: input.email,
        password: passwordHash,
        name: input.name,
        role: "user",
        unionId: input.email,
      });

      const googleSheetId =
        process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      if (googleSheetId) {
        await appendUserCredentials(
          googleSheetId,
          input.email,
          passwordHash,
          input.name,
        );
      }

      const token = await signSessionToken({
        unionId: input.email,
        clientId: "password-auth",
      });

      setSessionCookie(
        ctx.resHeaders,
        ctx.req.headers,
        token,
        Math.floor(Session.maxAgeMs / 1000),
      );

      return { success: true };
    }),

  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userRecord = await findUserByEmail(input.email);
      if (!userRecord?.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou senha inválidos.",
        });
      }

      const validPassword = await verifyPassword(
        input.password,
        userRecord.passwordHash,
      );

      if (!validPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou senha inválidos.",
        });
      }

      const token = await signSessionToken({
        unionId: userRecord.email,
        clientId: "password-auth",
      });

      setSessionCookie(
        ctx.resHeaders,
        ctx.req.headers,
        token,
        Math.floor(Session.maxAgeMs / 1000),
      );

      return { success: true };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }
    return ctx.user;
  }),

  logout: publicQuery.mutation(async ({ ctx }) => {
    const options = getSessionCookieOptions(ctx.req.headers);
    const serializeOptions: SerializeOptions = {
      httpOnly: options.httpOnly,
      path: options.path,
      secure: options.secure,
      sameSite:
        options.sameSite?.toLowerCase() === "strict"
          ? "strict"
          : options.sameSite?.toLowerCase() === "none"
            ? "none"
            : "lax",
      maxAge: 0,
    };

    ctx.resHeaders.append(
      "set-cookie",
      serialize(Session.cookieName, "", serializeOptions),
    );
    return { success: true };
  }),
});

export default authRouter;
