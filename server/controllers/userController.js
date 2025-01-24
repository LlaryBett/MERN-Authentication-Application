import userModel from "../models/userModel.js";

export const getUserData = async (req, res) => { // Added `async`
    try {
        const { userId } = req.body;

        // Check if userId is provided
        if (!userId) {
            return res.json({ success: false, message: "User ID is required" });
        }

        // Find user by ID
        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Respond with user data
        res.json({
            success: true,
            userData: {
                name: user.name,
                isAccountVerified: user.isAccountVerified, // Fixed capitalization
            },
        });
    } catch (error) {
        // Handle any errors
        res.json({ success: false, message: error.message });
    }
};
