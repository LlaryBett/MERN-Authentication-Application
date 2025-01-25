import bcrypt from "bcryptjs";
import Jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import transporter from "../config/nodemailer.js";
import { EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from "../config/emailTemplates.js";
// REGISTER CONTROLLER
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  // Validate input
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
    // Check if the user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the user to the database
    const user = new userModel({ name, email, password: hashedPassword });
    await user.save();

    // Generate JWT
    const token = Jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Set the cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send a welcome email
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Welcome to Greatstack",
      text: `Welcome to Greatstack Website! Your account has been successfully created with email ID: ${email}.`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.error("Error in register:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// LOGIN CONTROLLER
export const login = async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
    // Check if the user exists
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    // Generate JWT
    const token = Jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Set the cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({ success: true, message: "Login successful" });
  } catch (error) {
    console.error("Error in login:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// LOGOUT CONTROLLER
export const logout = async (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in logout:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
// verify otp
export const sendVerifyOtp = async (req, res) => {
    try {
      const { userId } = req.body;
  
      // Find user by ID
      const user = await userModel.findById(userId);
  
      // Check if the account is already verified
      if (user.isAccountVerified) {
        return res.json({ success: false, message: "Account already verified" });
      }
  
      // Generate OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      user.verifyOtp = otp;
      user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000; // Set OTP expiry time to 24 hours from now
      await user.save();
  
      // Mail options
      const mailOption = {
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: "Account Verification OTP",
        // text: `Your OTP is ${otp}. Verify your account using this OTP.`,
        html:EMAIL_VERIFY_TEMPLATE.replace("{{otp}}",otp).replace("{{email}}",user.email)
      };
  
      // Send email
      await transporter.sendMail(mailOption);
  
      res.json({ success: true, message: "Verification OTP sent on email" });
    } catch (error) {
      res.json({ success: false, message: error.message });
    }
  };
//   Verify email
  export const verifyEmail = async (req, res) => {
    const { userId, otp } = req.body;
  
    if (!userId || !otp) {
      return res.json({ success: false, message: 'Missing Details' });
    }
  
    try {
      const user = await userModel.findById(userId);
  
      if (!user) {
        return res.json({ success: false, message: 'User not found' });
      }
  
      // Check if OTP is valid
      if (user.verifyOtp === '' || user.verifyOtp !== otp) {
        return res.json({ success: false, message: 'Invalid OTP' });
      }
  
      // Check if OTP has expired
      if (user.verifyOtpExpireAt < Date.now()) {
        return res.json({ success: false, message: 'OTP Expired' });
      }
  
      // Update user's account verification status
      user.isAccountVerified = true;
      user.verifyOtp = '';
      user.verifyOtpExpireAt = 0; // Reset OTP expiration time
  
      // Save updated user details
      await user.save();
  
      return res.json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
      return res.json({ success: false, message: error.message });
    }
  };
//   Check if user is authenticated
  export const isAuthenticated =async(req,res)=>{
    try {
        return res.json({success:true});
    } catch (error) {
        res.json({success:false,message:error.message});
    }
  }
// Send Password Reset OTP
export const sendResetOtp = async (req, res) => {
    const { email } = req.body;
  
    // Validate the input
    if (!email) {
      return res.json({ success: false, message: 'Email is required' });
    }
  
    try {
      // Find user by email
      const user = await userModel.findOne({ email });
  
      if (!user) {
        return res.json({ success: false, message: 'User not found' });
      }
  
      // Generate OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      user.resetOtp = otp; // Use consistent naming (resetOtp instead of verifyOtp)
      user.resetOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiry
  
      // Save OTP and expiry to database
      await user.save();
  
      console.log('OTP generated and saved:', { email, otp });
  
      // Set up mail options
      const mailOption = {
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: 'Password Reset OTP',
        // text: `Your OTP for resetting your password is ${otp}. Use this OTP to proceed with resetting your password.`,
        html:PASSWORD_RESET_TEMPLATE.replace("{{otp}}",otp).replace("{{email}}",user.email)
      };
  
      // Send the email
      await transporter.sendMail(mailOption);
      console.log('Email sent to:', user.email);
  
      // Respond to the client
      return res.json({ success: true, message: 'OTP sent to your email' });
    } catch (error) {
      console.error('Error in sendResetOtp:', error.message);
      return res.json({ success: false, message: error.message });
    }
  };
  
//   Reset Password 
  export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
  
    if (!email || !otp || !newPassword) {
      return res.json({ success: false, message: 'Email, OTP, and new password are required' });
    }
  
    try {
      const user = await userModel.findOne({ email });
      if (!user) {
        return res.json({ success: false, message: 'User not found' });
      }
  
      console.log({
        email,
        otp,
        storedOtp: user.resetOtp,
        expiry: user.resetOtpExpireAt,
        currentTime: Date.now(),
      });
  
      if (String(user.resetOtp) !== String(otp)) {
        return res.json({ success: false, message: 'Invalid OTP' });
      }
  
      if (user.resetOtpExpireAt < Date.now()) {
        return res.json({ success: false, message: 'OTP Expired' });
      }
  
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.resetOtp = '';
      user.resetOtpExpireAt = 0;
  
      await user.save();
      return res.json({ success: true, message: 'Password has been reset successfully' });
    } catch (error) {
      return res.json({ success: false, message: error.message });
    }
  };
  