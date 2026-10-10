import mongoose from "mongoose";
import {
  comparePassword,
  hashPassword,
} from "../../middleware/hashPassword.js";
import { User } from "../../models/user/User.model.js";
import {
  validateResetPassword,
  validateUserLogin,
  validateUserRegister,
} from "./utils/validateUser.js";
import expressAsyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import { sendEmail } from "./services/sendEmail.service.js";

/**
 * @description  Register new user
 * @route        /api/auth/register
 * @method       POST
 * @access       public
 */

export const registerNewUser = expressAsyncHandler(async (req, res) => {
  const { error } = validateUserRegister(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  let user = await User.findOne({ email: req.body.email });
  if (user) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPass = await hashPassword(req.body.password);

  user = new User({
    email: req.body.email,
    username: req.body.username,
    password: hashedPass,
  });

  const result = await user.save();
  const token = user.generateToken();

  const { password, ...other } = result._doc;

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
    return res.status(400).json({ message: error.message });
  }

  let user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const checkPassword = await comparePassword(req.body.password, user.password);

  if (!checkPassword) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const token = user.generateToken();

  const { password, ...other } = user._doc;

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

export const getForgotPasswordView = expressAsyncHandler((req, res) => {
  res.render("forgot-password");
});

/**
 * @description  Send forgot password link
 * @route        /api/auth/forgot-password
 * @method       POST
 * @access       public
 */

export const sendForgotPasswordLink = expressAsyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) return res.status(404).json({ message: "user not found" });

  const secret = process.env.JWT_SECRET + user.password;
  const token = jwt.sign({ email: user.email, id: user.id }, secret, {
    expiresIn: "15m",
  });

  const link = `http://localhost:5000/api/auth/reset-password/${user._id}/${token}`;

  await sendEmail({ to: user.email, link });

  res.render("link-sent");
});

/**
 * @description  Get reset passowrd view
 * @route        /api/auth/reset-password/:userId/:token
 * @method       GET
 * @access       public
 */

export const getResetPasswordView = expressAsyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) return res.status(404).json({ message: "user not found" });

  const secret = process.env.JWT_SECRET + user.password;

  try {
    jwt.verify(req.params.token, secret);
    res.render("reset-password", { email: user.email });
  } catch (error) {
    console.log(error);
    res.json({ message: "error" });
  }
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
    return res.status(400).json({ message: error.message });
  }

  const { userId, token } = req.params;
  const invalidLink = () =>
    res.status(400).json({ message: "Invalid or expired reset link" });

  if (!mongoose.isValidObjectId(userId)) return invalidLink();

  const user = await User.findById(userId);
  if (!user) return invalidLink();

  try {
    jwt.verify(token, process.env.JWT_SECRET + user.password);
  } catch {
    return invalidLink();
  }

  user.password = await hashPassword(req.body.password);
  await user.save();

  res.render("success-reset-password");
});
