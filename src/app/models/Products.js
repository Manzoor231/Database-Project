import mongoose from "mongoose";

const ProductsSchema = new mongoose.Schema({
  name: { type: String },          // customer name
  phone: { type: String },
  buy: { type: [String], default: [] }, // array of categories
  ownerName: { type: String },
  amount: { type: Number, required: true },
  advanceAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  workStatus: { type: String, default: "pending" },
  paymentStatus: { type: String, default: "unpaid" },
});

export default mongoose.models.Products || mongoose.model("Products", ProductsSchema);
