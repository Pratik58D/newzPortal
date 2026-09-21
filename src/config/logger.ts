import pino from "pino";

// Structured logging (see docs/news-portal-findings.md B6, docs/remediation-plan.md Phase 3):
// replaces ad hoc console.log/console.error calls with leveled, structured
// output. In development this prints human-readable lines via pino-pretty
// when available; in production it prints newline-delimited JSON suitable
// for log aggregation.
const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      }),
});
