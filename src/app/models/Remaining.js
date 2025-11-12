import mongoose from "mongoose";

const RemainingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },

    // ✅ Main fields you forgot
    amount: { type: Number, required: true },
    advanceAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },

    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Remaining ||
  mongoose.model("Remaining", RemainingSchema);
