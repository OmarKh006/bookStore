import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      minLength: 5,
      maxLength: 254,
      unique: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      minLength: 2,
      maxLength: 200,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, isAdmin: this.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );
};

export const User = mongoose.model("User", userSchema);
