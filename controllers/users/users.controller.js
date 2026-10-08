import { hashPassword } from "../../middleware/hashPassword.js";
import { User } from "../../models/user/User.model.js";
import { validateUserUpdate } from "./utils/validateUser.js";
import expressAsyncHandler from "express-async-handler";

export const updateUser = expressAsyncHandler(async (req, res) => {
  const { error } = validateUserUpdate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
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

export const getAllUsers = expressAsyncHandler(async (req, res) => {
  const { pageNumber } = req.query;
  const usersPerPage = 2;

  const users = await User.find()
    .select("-password")
    .skip((pageNumber - 1) * usersPerPage)
    .limit(usersPerPage);

  res.status(200).json({ data: users });
});

export const getUserById = expressAsyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (user) {
    res.status(200).json({ data: user });
  } else {
    res.status(404).json({ message: "User not found" });
  }
});

export const deleteUser = expressAsyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id).select("-password");
  if (user) {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User deleted successfully" });
  } else {
    res.status(404).json({ message: "User not found" });
  }
});
