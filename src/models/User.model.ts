import mongoose, { type Model } from "mongoose";
import jwt from "jsonwebtoken";

export interface IUser {
  email: string;
  username: string;
  password: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  generateToken(): string;
}

type UserModel = Model<IUser, object, IUserMethods>;

const userSchema = new mongoose.Schema<IUser, UserModel, IUserMethods>(
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
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.methods.generateToken = function generateToken(): string {
  return jwt.sign(
    { id: this._id, isAdmin: this.isAdmin },
    process.env.JWT_SECRET as string,
    { expiresIn: "1d" },
  );
};

export const User = mongoose.model<IUser, UserModel>("User", userSchema);
