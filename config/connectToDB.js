import mongoose from "mongoose";

const connectToDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected succuessfully to db");
  } catch (error) {
    console.log("Failed to connect to db", error);
  }
};

export default connectToDB;
