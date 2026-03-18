import type { CookieOptions, Response } from "express";
import { env } from "../../config/env.js";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
};

export function setAccessCookie(res: Response, token: string) {
  res.cookie(env.JWT_COOKIE_NAME, token, baseCookieOptions);
}

export function clearAccessCookie(res: Response) {
  res.clearCookie(env.JWT_COOKIE_NAME, baseCookieOptions);
}

