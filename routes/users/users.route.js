import express from "express";
import expressAsyncHandler from "express-async-handler";
import { validateUserUpdate } from "./utils/validateUser.js";
import { User } from "../../models/user/User.model.js";
import { hashPassword } from "../../middleware/hashPassword.js";
import {
  verifyTokenAndAdmin,
  verifyTokenAndAuthorization,
} from "../../middleware/verifyToken.js";

const router = express.Router();

/**
 * @description  Update user's data
 * @route        /api/users/:id
 * @method       PUT
 * @access       private
 */

router.put(
  "/:id",
  verifyTokenAndAuthorization,
  expressAsyncHandler(async (req, res) => {
    const { error } = validateUserUpdate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    if (req.body.password) {
      req.body.password = await hashPassword(req.body.password);
    }

    await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          email: req.body.email,
          password: req.body.password,
          username: req.body.username,
        },
      },
      { new: true },
    ).select("-password");

    res.status(200).json({ message: "User updated successfully" });
  }),
);

/**
 * @description  Get all users
 * @route        /api/users
 * @method       GET
 * @access       private (only admin)
 */

router.get(
  "/",
  verifyTokenAndAdmin,
  expressAsyncHandler(async (req, res) => {
    const users = await User.find().select("-password");
    res.status(200).json({ data: users });
  }),
);

export default router;
