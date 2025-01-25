import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => console.log("Database Connected"));
    await mongoose.connect(process.env.MONGODB_URI); // Use MONGODB_URI directly
    console.log("MongoDB Atlas connection established");
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
};

export default connectDB;
