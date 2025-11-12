import Transactions from "@/app/models/Transactions";
import Products from "@/app/models/Products";
import connectToDatabase from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDatabase();

    const transactions = await Transactions.find().sort({ date: -1 });

    const normalized = await Promise.all(
      transactions.map(async (t) => {
        const amount = Number(t.amount || 0);
        const advanceAmount = Number(t.advanceAmount || 0);
        let remainingAmount = Number(t.remainingAmount ?? (amount - advanceAmount));

        let effectiveAmount = advanceAmount; // default to advance
        let status = remainingAmount > 0 ? "pending" : "done";

        // If linked to a product, use product's status and amounts
        if (t.relatedProductId) {
          const product = await Products.findById(t.relatedProductId);
          if (product) {
            const prodAmount = Number(product.amount || 0);
            const prodAdvance = Number(product.advanceAmount || 0);

            effectiveAmount = product.status === "done" ? prodAmount : prodAdvance;
            remainingAmount = Number(product.remainingAmount ?? (prodAmount - prodAdvance));
            status = product.status === "done" ? "done" : "pending";
          }
        } else {
          // If not linked to a product, fallback to transaction logic
          effectiveAmount = remainingAmount > 0 ? advanceAmount : amount;
          status = remainingAmount > 0 ? "pending" : "done";
        }

        const isPaid = status === "done";

        return {
          ...t.toObject(),
          amount,
          advanceAmount,
          remainingAmount,
          effectiveAmount,
          status,
          isPaid,
        };
      })
    );

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
