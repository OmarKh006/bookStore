import rateLimit from "express-rate-limit";

/**
 * Builds a per-IP limiter (15 minute window). The default of 10 requests
 * matches the original app; tests pass a bigger number so they don't trip it.
 */
export const createLimiter = (limit = 10) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    message: {
      message:
        "Too many requests from this IP, please try again after 15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
