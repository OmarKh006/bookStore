import expressAsyncHandler from "express-async-handler";
import { hashPassword } from "../../middleware/hashPassword.ts";
import { User } from "../../models/User.model.ts";
import { validatePageQuery, validateUserUpdate } from "./utils/validateUser.ts";

/**
 * @description  Update user's data
 * @route        /api/users/:id
 * @method       PUT
 * @access       private
 */
export const updateUser = expressAsyncHandler(async (req, res) => {
  const { error } = validateUserUpdate(req.body);
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
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
});

/**
 * @description  Get all users
 * @route        /api/users
 * @method       GET
 * @access       private (only admin)
 */
export const getAllUsers = expressAsyncHandler(async (req, res) => {
  const { error, value } = validatePageQuery(req.query);
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  const { pageNumber, limit } = value;

  const [users, total] = await Promise.all([
    User.find()
      .sort({ createdAt: -1, _id: 1 })
      .skip((pageNumber - 1) * limit)
      .limit(limit),
    User.countDocuments(),
  ]);

  const pages = Math.ceil(total / limit);

  res.status(200).json({ data: users, total, pages, pageNumber, limit });
});

/**
 * @description  Get user by id
 * @route        /api/users/:id
 * @method       GET
 * @access       private (only admin & user himself)
 */
export const getUserById = expressAsyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (user) {
    res.status(200).json({ data: user });
  } else {
    res.status(404).json({ message: "User not found" });
  }
});

/**
 * @description  Delete user
 * @route        /api/users/:id
 * @method       DELETE
 * @access       private (only admin & user himself)
 */
export const deleteUser = expressAsyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (user) {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User deleted successfully" });
  } else {
    res.status(404).json({ message: "User not found" });
  }
});
