import express from "express";
import userAuth from "../middleware/userAuth.js";
import { getUserData } from "../controllers/userController.js";

const userRouter = express.Router();

// Define the route to get user data
userRouter.get("/data", userAuth, getUserData);

export default userRouter;
