import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    name: String, // customer name
    buy: String,
    amount: Number,
    remainingAmount: { type: Number, default: 0 },
    owner: { type: String, enum: ["Nazir", "Shabir"], default: null },
    type: String,
    date: String,
    relatedProductId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
