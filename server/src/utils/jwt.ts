/**
 * src/utils/jwt.ts
 * JWT signing and verification with strong typing.
 */

import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { AuthTokenPayload } from "../types/auth";

export function signAccessToken(payload: AuthTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as any,
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === "object" && decoded !== null && "sub" in decoded) {
      return decoded as unknown as AuthTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}
