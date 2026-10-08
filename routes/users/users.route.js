import express from "express";
import {
  verifyTokenAndAdmin,
  verifyTokenAndAuthorization,
} from "../../middleware/verifyToken.js";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from "../../controllers/users/users.controller.js";

const router = express.Router();

/**
 * @description  Update user's data
 * @route        /api/users/:id
 * @method       PUT
 * @access       private
 */

router.put("/:id", verifyTokenAndAuthorization, updateUser);

/**
 * @description  Get all users
 * @route        /api/users
 * @method       GET
 * @access       private (only admin)
 */

router.get("/", verifyTokenAndAdmin, getAllUsers);

/**
 * @description  Get user by id
 * @route        /api/users/:id
 * @method       GET
 * @access       private (only admin & user himself)
 */

router.get("/:id", verifyTokenAndAuthorization, getUserById);

/**
 * @description  Delete user
 * @route        /api/users/:id
 * @method       DELETE
 * @access       private (only admin & user himself)
 */

router.delete("/:id", verifyTokenAndAuthorization, deleteUser);

export default router;
