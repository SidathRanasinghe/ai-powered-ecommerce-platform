import User, { IUser } from "../models/User";
import redisClient from "../config/redis";

export class UserService {
  async createUser(userData: Partial<IUser>): Promise<IUser> {
    const user = new User(userData);
    const savedUser = await user.save();

    // Cache user data
    await redisClient.setCache(`user:${savedUser._id}`, savedUser, 3600);

    return savedUser;
  }

  async getUserById(userId: string): Promise<IUser | null> {
    // Try cache first
    const cachedUser = await redisClient.getCache(`user:${userId}`);
    if (cachedUser) {
      return cachedUser;
    }

    // Fetch from database
    const user = await User.findById(userId).select("-password");
    if (user) {
      await redisClient.setCache(`user:${userId}`, user, 3600);
    }

    return user;
  }

  async updateUser(
    userId: string,
    updateData: Partial<IUser>
  ): Promise<IUser | null> {
    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (user) {
      // Update cache
      await redisClient.setCache(`user:${userId}`, user, 3600);
    }

    return user;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(userId);

    if (result) {
      // Remove from cache
      await redisClient.deleteCache(`user:${userId}`);
    }

    return !!result;
  }
}
