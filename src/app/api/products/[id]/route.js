import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Products from "@/app/models/Products";
import Transactions from "@/app/models/Transactions";
import mongoose from "mongoose";

// ✅ Helper: safely unwrap params even if it's a promise
async function getParams(context) {
  const awaited = await context;
  const rawParams = awaited?.params;

  // Sometimes rawParams itself is a Promise in Next.js 16
  const resolved = rawParams && typeof rawParams.then === "function"
    ? await rawParams
    : rawParams;

  return resolved || {};
}

// ✅ PUT: Update a product
export async function PUT(request, context) {
  try {
    const params = await getParams(context);
    const id = params?.id;

    console.log("Resolved params:", params);

    await connectToDatabase();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: "Empty body" }, { status: 400 });
    }

    const updated = await Products.findByIdAndUpdate(id, body, { new: true });
    if (!updated) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Sync a linked transaction (update or create)
    try {
      await Transactions.findOneAndUpdate(
        { relatedProductId: String(id) },
        {
          name: updated.name,
          buy: Array.isArray(updated.buy) ? updated.buy : (updated.buy ? [updated.buy] : []),
          amount: Number(updated.amount || 0),
          advanceAmount: Number(updated.advanceAmount || 0),
          remainingAmount: Number(updated.remainingAmount || 0),
          relatedProductId: String(id),
          type: "in",
          date: updated.date instanceof Date ? updated.date.toISOString() : updated.date,
          status: (updated.paymentStatus === "paid") ? "done" : "pending",
        },
        { upsert: true, new: true }
      );
    } catch (txErr) {
      console.error("Failed to sync transaction for product PUT:", txErr);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/products/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ DELETE: Remove a product
export async function DELETE(request, context) {
  try {
    const params = await getParams(context);
    const id = params?.id;

    await connectToDatabase();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    await Products.findByIdAndDelete(id);
    try {
      await Transactions.deleteMany({ relatedProductId: String(id) });
    } catch (txErr) {
      console.error("Failed to delete linked transactions:", txErr);
    }

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
