import express from "express";
import {
  getForgotPasswordView,
  getResetPasswordView,
  loginUser,
  registerNewUser,
  resetPassword,
  sendForgotPasswordLink,
} from "../../controllers/users/auth.controller.js";
import { limiter } from "../../middleware/rateLimiter.js";

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

export default router;
