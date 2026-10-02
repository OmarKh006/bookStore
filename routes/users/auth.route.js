import express from "express";
import expressAsyncHandler from "express-async-handler";

import { validateUserRegister } from "./utils/validateUser.js";
import { User } from "../../models/user/User.model.js";
import { hashPassowrd } from "../../middleware/hashPassword.js";

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

    const hashedPass = await hashPassowrd(req.body.password);

    user = new User({
      email: req.body.email,
      username: req.body.username,
      password: hashedPass,
      isAdmin: req.body.isAdmin,
    });

    const result = await user.save();
    const token = null;

    const { password, ...other } = result._doc;

    res
      .status(201)
      .json({ message: "User added successfully", data: { ...other, token } });
  }),
);

export default router;
