import mongoose, { Schema } from "mongoose";
const auditLogSchema = new Schema({
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
}, { timestamps: true });
const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
//# sourceMappingURL=auditLog.model.js.map