import { Schema, model, models, type Model } from "mongoose";

const AdminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin"], default: "admin" },
  },
  { timestamps: true, collection: "admin_users" }
);

export const AdminUserModel: Model<any> =
  (models.AdminUser as Model<any>) || model("AdminUser", AdminUserSchema);
