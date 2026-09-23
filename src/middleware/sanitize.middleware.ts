import type { NextFunction, Request, Response } from "express";

// Strips Mongo/Mongoose operator keys (`$gt`, `$where`, ...) and keys
// containing `.` from any plain object, recursively, mutating it in place.
//
// Implemented by hand rather than with `express-mongo-sanitize` because that
// package reassigns `req.query` (`req.query = clean(...)`), which throws on
// Express 5 — `req.query` there is a getter-only property with no setter.
// Mutating in place (as done here) works on both Express 4 and 5.
const sanitizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      value[index] = sanitizeValue(item);
    });
    return value;
  }

  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete (value as Record<string, unknown>)[key];
        continue;
      }
      (value as Record<string, unknown>)[key] = sanitizeValue(
        (value as Record<string, unknown>)[key],
      );
    }
    return value;
  }

  return value;
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) sanitizeValue(req.body);
  if (req.params) sanitizeValue(req.params);
  // req.query is read-only on Express 5 (no setter) but its keys/values can
  // still be mutated in place, so it's sanitized the same way as body/params.
  if (req.query) sanitizeValue(req.query);

  next();
};
