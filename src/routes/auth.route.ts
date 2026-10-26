import express, { type RequestHandler } from "express";
import {
  getForgotPasswordView,
  getResetPasswordView,
  loginUser,
  registerNewUser,
  resetPassword,
  sendForgotPasswordLink,
} from "../controllers/users/auth.controller.ts";
import { createLimiter } from "../middleware/rateLimiter.ts";

/** The limiter is injectable so each app instance gets its own counters. */
export const createAuthRouter = (limiter: RequestHandler = createLimiter()) => {
  const router = express.Router();

  router.post("/register", limiter, registerNewUser);
  router.post("/login", limiter, loginUser);

  router
    .route("/forgot-password")
    .get(getForgotPasswordView)
    .post(limiter, sendForgotPasswordLink);

  router
    .route("/reset-password/:userId/:token")
    .get(getResetPasswordView)
    .post(limiter, resetPassword);

  return router;
};

export default createAuthRouter;
