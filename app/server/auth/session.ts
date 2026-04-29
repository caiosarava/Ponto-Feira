import * as cookie from "cookie";
import * as jose from "jose";
import { Session } from "../../contracts/constants.js";
import { env } from "../lib/env.js";
import { findUserByUnionId } from "../queries/users.js";

type SessionPayload = {
  unionId: string;
  clientId: string;
};

const JWT_ALG = "HS256";

export async function signSessionToken(
  payload: SessionPayload,
): Promise<string> {
  const secret = new TextEncoder().encode(env.appSecret);
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("1 year")
    .sign(secret);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(env.appSecret);
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [JWT_ALG],
    });
    const { unionId, clientId } = payload;
    if (!unionId || !clientId) return null;
    return { unionId, clientId } as SessionPayload;
  } catch {
    return null;
  }
}

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  const claim = await verifySessionToken(token);
  if (!claim) return null;
  return findUserByUnionId(claim.unionId);
}
