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

type AdminCheck = "ok" | "not_configured" | "locked" | "invalid";

function verifyAdminPassword(req: Request, candidate: unknown): AdminCheck {
  const expected = process.env["ADMIN_PASSWORD"];
  if (!expected) return "not_configured";

  const key = clientKey(req);
  const now = Date.now();
  if (isLockedOut(key, now)) return "locked";

  if (typeof candidate !== "string" || !passwordMatches(candidate, expected)) {
    recordFailure(key, now);
    return "invalid";
  }

  failures.delete(key);
  return "ok";
}

// Responds with the failure itself and returns false when the password is missing,
// wrong, rate limited, or not configured on the server.
export function checkAdminPassword(req: Request, res: Response, candidate: unknown) {
  const result = verifyAdminPassword(req, candidate);
  if (result === "not_configured") res.status(503).json({ error: "admin_not_configured" });
  else if (result === "locked") res.status(429).json({ error: "too_many_attempts" });
  else if (result === "invalid") res.status(401).json({ error: "invalid_admin_password" });
  return result === "ok";
}

// For routes open to everyone that do something extra (like notifying the group)
// only for admins. Absent header means "not an admin request", not a failure.
export function hasValidAdminPassword(req: Request) {
  const candidate = req.headers["x-admin-password"];
  return candidate !== undefined && verifyAdminPassword(req, candidate) === "ok";
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (checkAdminPassword(req, res, req.headers["x-admin-password"])) next();
}
