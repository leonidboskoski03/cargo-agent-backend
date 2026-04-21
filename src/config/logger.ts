import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: "cargo-agent-backend",
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "authorization",
      "cookie",
      "set-cookie",
    ],
    censor: "[REDACTED]",
  },
  transport: env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
});

