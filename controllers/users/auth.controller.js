import {
  comparePassword,
  hashPassword,
} from "../../middleware/hashPassword.js";
import { User } from "../../models/user/User.model.js";
import {
  validateUserLogin,
  validateUserRegister,
} from "./utils/validateUser.js";
import expressAsyncHandler from "express-async-handler";

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

export const getForgotPasswordView = expressAsyncHandler(async (req, res) => {
  res.render("forgot-password");
});
