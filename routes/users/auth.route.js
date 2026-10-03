import express from "express";
import expressAsyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";

import {
  validateUserLogin,
  validateUserRegister,
} from "./utils/validateUser.js";
import { User } from "../../models/user/User.model.js";
import {
  comparePassword,
  hashPassword,
} from "../../middleware/hashPassword.js";

const router = express.Router();

/**
 * @description  Register new user
 * @route        /api/auth/register
 * @method       POST
 * @access       public
 */

router.post(
  "/register",
  expressAsyncHandler(async (req, res) => {
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
    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    const { password, ...other } = result._doc;

    res
      .status(201)
      .json({ message: "User added successfully", data: { ...other, token } });
  }),
);

/**
 * @description  Login user
 * @route        /api/auth/login
 * @method       POST
 * @access       public
 */

router.post(
  "/login",
  expressAsyncHandler(async (req, res) => {
    const { error } = validateUserLogin(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    let user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const checkPassword = await comparePassword(
      req.body.password,
      user.password,
    );

    if (!checkPassword) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    const { password, ...other } = user._doc;

    res.status(200).json({
      message: "User logged in successfully",
      data: { ...other, token },
    });
  }),
);

export default router;
