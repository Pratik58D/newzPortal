import mongoose, { Document, Schema, Types } from "mongoose";

export type AuditTargetType = "User" | "NewsArticle";

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actor: Types.ObjectId;
  action: string;
  targetType: AuditTargetType;
  targetId: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ["User", "NewsArticle"],
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
export default AuditLog;
