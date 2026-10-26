import mongoose, { type InferSchemaType } from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minLength: 3, maxLength: 250 },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Author",
      index: true,
    },
    description: { type: String, required: true, trim: true, minLength: 5 },
    price: { type: Number, required: true, min: 0, index: true },
    cover: { type: String, required: true, enum: ["soft cover", "hard cover"] },
  },
  { timestamps: true },
);

export type IBook = InferSchemaType<typeof bookSchema>;
export const Book = mongoose.model("Book", bookSchema);
