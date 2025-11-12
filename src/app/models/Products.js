// /models/Product.js
import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    buy: { type: String, required: true },

    amount: { type: Number, required: true },          // Total
    advanceAmount: { type: Number, default: 0 },        // Advance
    remainingAmount: { type: Number, default: 0 },      // Auto calculated

    date: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "done"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);
