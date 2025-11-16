import Transactions from "@/app/models/Transactions";
import Products from "@/app/models/Products";
import connectToDatabase from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDatabase();

    // Fetch transactions
    const transactions = await Transactions.find().sort({ date: -1 });

    // Fetch all products
    const products = await Products.find().sort({ date: -1 });

    // Normalize transactions
    const normalizedTxs = await Promise.all(transactions.map(async t => {
      const amount = Number(t.amount || 0);
      const advanceAmount = Number(t.advanceAmount || 0);
      let remainingAmount = Number(t.remainingAmount ?? (amount - advanceAmount));
      let effectiveAmount = advanceAmount;
      let status = remainingAmount > 0 ? "pending" : "done";

      if (t.relatedProductId) {
        const prod = await Products.findById(t.relatedProductId);
        if (prod) {
          const prodAmount = Number(prod.amount || 0);
          const prodAdvance = Number(prod.advanceAmount || 0);
          effectiveAmount = (prod.paymentStatus === "paid") ? prodAmount : prodAdvance;
          // If product is marked paid, remaining should be 0
          remainingAmount = (prod.paymentStatus === "paid") ? 0 : Number(prod.remainingAmount ?? (prodAmount - prodAdvance));
          status = (prod.paymentStatus === "paid") ? "done" : "pending";
        }
      }

      return {
        ...t.toObject(),
        amount,
        advanceAmount,
        remainingAmount,
        effectiveAmount,
        status,
        isPaid: status === "done",
        type: t.type || "in",
        buy: t.buy || "Uncategorized",
        date: t.date || new Date().toISOString()
      };
    }));

    // Convert products that do not have transactions into pseudo-transactions
    const productTxs = products
      .filter(p => !transactions.some(t => String(t.relatedProductId) === String(p._id)))
      .map(p => {
        const amount = Number(p.amount || 0);
        const advanceAmount = Number(p.advanceAmount || 0);
        const remainingAmount = (p.paymentStatus === "paid") ? 0 : Number(p.remainingAmount ?? (amount - advanceAmount));
        const effectiveAmount = (p.paymentStatus === "paid") ? amount : advanceAmount;
        const status = (p.paymentStatus === "paid") ? "done" : "pending";

        return {
          _id: p._id,
          name: p.name || "Unnamed Product",
          type: "in",
          amount,
          advanceAmount,
          remainingAmount,
          effectiveAmount,
          status,
          isPaid: status === "done",
          buy: Array.isArray(p.buy) ? (p.buy[0] || "Uncategorized") : p.buy || "Uncategorized",
          relatedProductId: p._id,
          date: p.date || new Date().toISOString()
        };
      });

    // Combine all records and sort by date descending
    const allRecords = [...normalizedTxs, ...productTxs].sort((a, b) => new Date(b.date) - new Date(a.date));

    return NextResponse.json(allRecords);
  } catch (err) {
    console.error("Dashboard API error:", err);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
