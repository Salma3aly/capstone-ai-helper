import { Schema, model, models } from "mongoose";

export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  userType?: string;
  grade?: string;
  phone?: string;
  organization?: string;
  avatar?: string;
  createdAt: string;
}

const UserSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String },
  grade: { type: String },
  phone: { type: String },
  organization: { type: String },
  avatar: { type: String },
  createdAt: { type: String, required: true },
});

export const User = models.User || model<IUser>("User", UserSchema);
