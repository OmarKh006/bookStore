import mongoose from "mongoose";

const authorSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      maxLength: 15,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      maxLength: 15,
    },
    nationality: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      maxLength: 25,
    },
    image: {
      type: String,
      default: "default.png",
    },
  },
  {
    timestamps: true,
  },
);

export const Author = mongoose.model("Author", authorSchema);
