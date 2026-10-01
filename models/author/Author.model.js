import mongoose from "mongoose";

const authorSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      maxLength: 200,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      maxLength: 200,
    },
    nationality: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      maxLength: 100,
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
