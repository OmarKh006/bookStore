import express from "express";
import {
  getForgotPasswordView,
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

/**
 * @description  GET the forget password view
 * @route        /api/auth/forgetPassword
 * @method       GET
 * @access       public
 */

router.route("/forgot-password").get(getForgotPasswordView);

export default router;
