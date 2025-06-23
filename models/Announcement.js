import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

export default mongoose.model("Announcement", announcementSchema);
