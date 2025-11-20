// /app/models/Products.js
import mongoose from "mongoose";

// Schema for partial payments
const PartialPaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

// Schema for individual purchase items (categories)
const BuyItemSchema = new mongoose.Schema({
  category: { type: String, required: true },
  qty: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true }, // New: price per unit
  total: { type: Number, default: 0 },          // New: qty * unitPrice
});

// Main Product schema
const ProductsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  buy: { type: [BuyItemSchema], default: [] },  // Updated schema
  ownerName: { type: String },
  amount: { type: Number, required: true },      // Total amount of product
  advanceAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  workStatus: { type: String, default: "pending" },
  paymentStatus: { type: String, default: "unpaid" },
  partialPayments: { type: [PartialPaymentSchema], default: [] },
});

// Pre-save middleware to calculate total per category and overall amount
ProductsSchema.pre("save", function (next) {
  if (Array.isArray(this.buy)) {
    let totalAmount = 0;
    this.buy = this.buy.map(item => {
      item.total = (item.qty || 0) * (item.unitPrice || 0);
      totalAmount += item.total;
      return item;
    });
    this.amount = totalAmount;
  }
  next();
});

export default mongoose.models.Products || mongoose.model("Products", ProductsSchema);
