import mongoose from "mongoose";

const connectToDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected succuessfully to db");
  } catch (error) {
    console.log("Failed to connect to db", error);
    process.exit(1);
  }
};

export default connectToDB;
