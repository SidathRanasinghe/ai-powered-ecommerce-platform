import { Request, Response } from "express";
import User, { IUser } from "@/models/User";
import { config } from "@/config/config";
import { v4 as uuidv4 } from "uuid";
import AWS from "aws-sdk";

// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

const s3 = new AWS.S3({
  region: config.aws.region,
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
});

// Get user profile
export const getProfile = async (req: Request, res: Response) => {
  const user = req.user as IUser;

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: user,
  });
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  const user = req.user as IUser;
  const { firstName, lastName, email } = req.body;

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Validate email format
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  user.firstName = firstName || user.firstName;
  user.lastName = lastName || user.lastName;
  user.email = email || user.email;

  await user.save();

  return res.status(200).json({
    success: true,
    data: user,
  });
};

// Change user password
export const changePassword = async (req: Request, res: Response) => {
  const user = req.user as IUser;
  const { currentPassword, newPassword } = req.body;

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Validate current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: "Current password is incorrect",
    });
  }

  // Validate new password strength
  if (
    newPassword.length < 8 ||
    !/[A-Z]/.test(newPassword) ||
    !/[a-z]/.test(newPassword) ||
    !/\d/.test(newPassword)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "New password must be at least 8 characters long and contain uppercase, lowercase letters, and numbers",
    });
  }

  user.password = newPassword;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
};

// Delete user account
export const deleteAccount = async (req: Request, res: Response) => {
  const user = req.user as IUser;

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  await User.deleteOne({ _id: user._id });

  return res.status(200).json({
    success: true,
    message: "Account deleted successfully",
  });
};

// Upload user avatar
export const uploadAvatar = async (req: Request, res: Response) => {
  const user = req.user as IUser;

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  // Assuming uploadToS3 is a utility function to upload files to S3
  const avatarUrl = await uploadToS3(req.file);

  user.avatar = avatarUrl;
  await user.save();

  return res.status(200).json({
    success: true,
    data: { avatar: avatarUrl },
  });
};

// Get all users (Admin only)
export const getUsers = async (_req: Request, res: Response) => {
  const users = await User.find().select("-password");

  return res.status(200).json({
    success: true,
    data: users,
  });
};

// Get user by ID (Admin only)
export const getUserById = async (req: Request, res: Response) => {
  const userId = req.params["id"];
  const user = await User.findById(userId).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: user,
  });
};

// Update user (Admin only)
export const updateUser = async (req: Request, res: Response) => {
  const userId = req.params["id"];
  const { firstName, lastName, email, role } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  user.firstName = firstName || user.firstName;
  user.lastName = lastName || user.lastName;
  user.email = email || user.email;
  user.role = role || user.role;

  await user.save();

  return res.status(200).json({
    success: true,
    data: user,
  });
};

// Delete user (Admin only)
export const deleteUser = async (req: Request, res: Response) => {
  const userId = req.params["id"];

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  await User.deleteOne({ _id: user._id });

  return res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
};

async function uploadToS3(file: Express.Multer.File): Promise<string> {
  const fileExtension = file.originalname.split(".").pop();
  const key = `avatars/${uuidv4()}.${fileExtension}`;

  const params = {
    Bucket: config.aws.s3Bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read",
  };

  await s3.upload(params).promise();

  return `https://${params.Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
}
