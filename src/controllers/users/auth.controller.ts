import expressAsyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import type { Response } from "express";
import {
  comparePassword,
  hashPassword,
} from "../../middleware/hashPassword.ts";
import { User } from "../../models/User.model.ts";
import { sendEmail } from "./services/sendEmail.service.ts";
import {
  validateForgotPassword,
  validateResetPassword,
  validateUserLogin,
  validateUserRegister,
} from "./utils/validateUser.ts";

const invalidLink = (res: Response): void => {
  res.status(400).json({ message: "Invalid or expired reset link" });
};

/**
 * @description  Register new user
 * @route        /api/auth/register
 * @method       POST
 * @access       public
 */
export const registerNewUser = expressAsyncHandler(async (req, res) => {
  const { error } = validateUserRegister(req.body);
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  const existing = await User.findOne({ email: req.body.email });
  if (existing) {
    res.status(400).json({ message: "User already exists" });
    return;
  }

  const hashedPass = await hashPassword(req.body.password);

  const user = new User({
    email: req.body.email,
    username: req.body.username,
    password: hashedPass,
  });

  const result = await user.save();
  const token = user.generateToken();

  const { password: _password, ...other } = result.toObject();

  res
    .status(201)
    .json({ message: "User added successfully", data: { ...other, token } });
});

/**
 * @description  Login user
 * @route        /api/auth/login
 * @method       POST
 * @access       public
 */
export const loginUser = expressAsyncHandler(async (req, res) => {
  const { error } = validateUserLogin(req.body);
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  const user = await User.findOne({ email: req.body.email }).select(
    "+password",
  );
  if (!user) {
    res.status(400).json({ message: "Invalid email or password" });
    return;
  }

  const checkPassword = await comparePassword(req.body.password, user.password);

  if (!checkPassword) {
    res.status(400).json({ message: "Invalid email or password" });
    return;
  }

  const token = user.generateToken();

  const { password: _password, ...other } = user.toObject();

  res.status(200).json({
    message: "User logged in successfully",
    data: { ...other, token },
  });
});

/**
 * @description  GET the forget password view
 * @route        /api/auth/forgot-password
 * @method       GET
 * @access       public
 */
export const getForgotPasswordView = expressAsyncHandler(async (_req, res) => {
  res.render("forgot-password");
});

/**
 * @description  Send forgot password link
 * @route        /api/auth/forgot-password
 * @method       POST
 * @access       public
 */
export const sendForgotPasswordLink = expressAsyncHandler(async (req, res) => {
  const { error } = validateForgotPassword(req.body);
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  const user = await User.findOne({ email: req.body.email }).select(
    "+password",
  );

  if (user) {
    const secret = (process.env.JWT_SECRET as string) + user.password;
    const token = jwt.sign({ email: user.email, id: user.id }, secret, {
      expiresIn: "15m",
    });
    const link = `${process.env.BASE_URL}/api/auth/reset-password/${user._id}/${token}`;

    try {
      await sendEmail({ to: user.email, link });
    } catch (err) {
      console.log(err);
    }
  }

  // Same response whether or not the account exists
  res.render("link-sent");
});

/**
 * @description  Get reset password view
 * @route        /api/auth/reset-password/:userId/:token
 * @method       GET
 * @access       public
 */
export const getResetPasswordView = expressAsyncHandler(async (req, res) => {
  const { userId, token } = req.params as { userId: string; token: string };

  if (!mongoose.isObjectIdOrHexString(userId)) return invalidLink(res);

  const user = await User.findById(userId).select("+password");
  if (!user) return invalidLink(res);

  try {
    jwt.verify(token, (process.env.JWT_SECRET as string) + user.password);
  } catch {
    return invalidLink(res);
  }

  res.render("reset-password", { email: user.email });
});

/**
 * @description  Reset password
 * @route        /api/auth/reset-password/:userId/:token
 * @method       POST
 * @access       public
 */
export const resetPassword = expressAsyncHandler(async (req, res) => {
  const { error } = validateResetPassword(req.body);
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  const { userId, token } = req.params as { userId: string; token: string };

  if (!mongoose.isObjectIdOrHexString(userId)) return invalidLink(res);

  const user = await User.findById(userId).select("+password");
  if (!user) return invalidLink(res);

  try {
    jwt.verify(token, (process.env.JWT_SECRET as string) + user.password);
  } catch {
    return invalidLink(res);
  }

  user.password = await hashPassword(req.body.password);
  await user.save();

  res.render("success-reset-password");
});
