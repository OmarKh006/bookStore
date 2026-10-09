import express from "express";
import {
  getForgotPasswordView,
  getResetPasswordView,
  loginUser,
  registerNewUser,
  resetPassword,
  sendForgotPasswordLink,
} from "../../controllers/users/auth.controller.js";

const router = express.Router();

router.post("/register", registerNewUser);

router.post("/login", loginUser);

router
  .route("/forgot-password")
  .get(getForgotPasswordView)
  .post(sendForgotPasswordLink);

router
  .route("/reset-password/:userId/:token")
  .get(getResetPasswordView)
  .post(resetPassword);

export default router;
