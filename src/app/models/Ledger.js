// app/models/Ledger.js
import mongoose from "mongoose";

const LedgerSchema = new mongoose.Schema(
    {
        type: { type: String, enum: ["income", "expense"], required: true }, // income or expense
        amount: { type: Number, required: true },
        person: { type: String, default: "" }, // who paid/received
        category: { type: String, default: "" }, // optional category
        description: { type: String, default: "" },
        date: { type: String, required: true }, // store as ISO string (YYYY-MM-DD)
    },
    { timestamps: true }
);

export default mongoose.models.Ledger || mongoose.model("Ledger", LedgerSchema);
