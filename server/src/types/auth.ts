/**
 * src/types/auth.ts
 * Typed auth interfaces and Express Request augmentation.
 */

import { Role } from "@prisma/client";

export interface SafeUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  institutionId: string | null;
}

export interface AuthTokenPayload {
  sub: string; // User ID
  email: string;
  role: Role;
  institutionId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}
