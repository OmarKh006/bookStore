import express from "express";
import {
  verifyTokenAndAdmin,
  verifyTokenAndAuthorization,
} from "../middleware/verifyToken.js";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from "../controllers/users/users.controller.ts";
import { validateObjectId } from "../middleware/validateObjectId.ts";

const router = express.Router();

router.put("/:id", verifyTokenAndAuthorization, validateObjectId, updateUser);
router.get("/", verifyTokenAndAdmin, getAllUsers);
router.get("/:id", verifyTokenAndAuthorization, validateObjectId, getUserById);
router.delete(
  "/:id",
  verifyTokenAndAuthorization,
  validateObjectId,
  deleteUser,
);

export default router;
