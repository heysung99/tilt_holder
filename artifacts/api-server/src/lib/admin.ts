import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const MAX_FAILURES = 10;
const LOCKOUT_WINDOW_MS = 10 * 60 * 1000;

// Per-instance only (serverless instances don't share memory), but it still makes
// guessing the password through any single warm instance impractical.
const failures = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return first?.trim() || req.ip || "unknown";
}

function isLockedOut(key: string, now: number) {
  const entry = failures.get(key);
  if (!entry) return false;
  if (entry.resetAt <= now) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(key: string, now: number) {
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= now) {
    failures.set(key, { count: 1, resetAt: now + LOCKOUT_WINDOW_MS });
  } else {
    entry.count += 1;
  }
  if (failures.size > 1000) {
    for (const [k, v] of failures) {
      if (v.resetAt <= now) failures.delete(k);
    }
  }
}

function passwordMatches(candidate: string, expected: string) {
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Responds with the failure itself and returns false when the password is missing,
// wrong, rate limited, or not configured on the server.
export function checkAdminPassword(req: Request, res: Response, candidate: unknown) {
  const expected = process.env["ADMIN_PASSWORD"];
  if (!expected) {
    res.status(503).json({ error: "admin_not_configured" });
    return false;
  }

  const key = clientKey(req);
  const now = Date.now();
  if (isLockedOut(key, now)) {
    res.status(429).json({ error: "too_many_attempts" });
    return false;
  }

  if (typeof candidate !== "string" || !passwordMatches(candidate, expected)) {
    recordFailure(key, now);
    res.status(401).json({ error: "invalid_admin_password" });
    return false;
  }

  failures.delete(key);
  return true;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (checkAdminPassword(req, res, req.headers["x-admin-password"])) next();
}
