import express from "express";
import {
  loginUser,
  registerNewUser,
} from "../../controllers/users/auth.controller.js";

const router = express.Router();

/**
 * @description  Register new user
 * @route        /api/auth/register
 * @method       POST
 * @access       public
 */

router.post("/register", registerNewUser);

/**
 * @description  Login user
 * @route        /api/auth/login
 * @method       POST
 * @access       public
 */

router.post("/login", loginUser);

export default router;
