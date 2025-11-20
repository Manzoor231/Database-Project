// /app/api/products/route.js
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Products from "@/app/models/Products";
import Transactions from "@/app/models/Transactions";
import mongoose from "mongoose";

// Helper to validate ObjectId
function isValidObjectId(id) {
  return id && mongoose.Types.ObjectId.isValid(id);
}

// GET all products
export async function GET() {
  try {
    await connectToDatabase();
    const products = await Products.find().sort({ date: -1 });
    return NextResponse.json(products);
  } catch (err) {
    console.error("GET /api/products error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST create a new product
export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, phone, buy, advanceAmount = 0, date, partialPayments = [] } = body;

    // Validate & calculate totals
    const processedBuy = Array.isArray(buy)
      ? buy.map(item => ({
          category: item.category,
          qty: Number(item.qty) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          total: (Number(item.qty) || 1) * (Number(item.unitPrice) || 0)
        }))
      : [];

    const totalAmount = processedBuy.reduce((sum, item) => sum + item.total, 0);

    const totalPartialPaid = partialPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const remaining = Math.max(totalAmount - Number(advanceAmount) - totalPartialPaid, 0);

    let paymentStatus = "unpaid";
    if (remaining === 0) paymentStatus = "paid";
    else if (Number(advanceAmount) + totalPartialPaid > 0) paymentStatus = "partial";

    // Assign owner
    const NAZIR_CATEGORIES = ["Banner Printing", "Glass Printing", "Flag Printing", "Sticker Printing"];
    const ownerName = processedBuy.some(b => NAZIR_CATEGORIES.includes(b.category)) ? "Nazir" : "Shabir";

    const newProduct = await Products.create({
      name,
      phone,
      buy: processedBuy,
      ownerName,
      amount: totalAmount,
      advanceAmount: Number(advanceAmount),
      remainingAmount: remaining,
      paymentStatus,
      workStatus: "pending",
      partialPayments,
      date: date || new Date(),
    });

    // Sync transaction table
    try {
      await Transactions.create({
        name: newProduct.name,
        buy: processedBuy.map(b => b.category).join(", "),
        amount: newProduct.amount,
        advanceAmount: newProduct.advanceAmount,
        remainingAmount: newProduct.remainingAmount,
        relatedProductId: String(newProduct._id),
        type: "in",
        date: newProduct.date instanceof Date ? newProduct.date.toISOString() : newProduct.date,
        status: paymentStatus === "paid" ? "done" : "pending",
      });
    } catch (txErr) {
      console.error("Transaction sync failed:", txErr);
    }

    return NextResponse.json(newProduct);
  } catch (err) {
    console.error("POST /api/products error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT update a product
export async function PUT(req, context) {
  try {
    await connectToDatabase();
    const id = context?.params?.id;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });

    const body = await req.json();
    const { buy, advanceAmount, partialPayments, workStatus, paymentStatus, date, name, phone } = body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (workStatus !== undefined) update.workStatus = workStatus;
    if (date !== undefined) update.date = date;

    // Handle buy array with qty & unitPrice
    let totalAmount;
    if (buy !== undefined) {
      const processedBuy = buy.map(item => ({
        category: item.category,
        qty: Number(item.qty) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        total: (Number(item.qty) || 1) * (Number(item.unitPrice) || 0)
      }));
      update.buy = processedBuy;
      totalAmount = processedBuy.reduce((sum, item) => sum + item.total, 0);

      // Assign owner
      const NAZIR_CATEGORIES = ["Banner Printing", "Glass Printing", "Flag Printing", "Sticker Printing"];
      update.ownerName = processedBuy.some(b => NAZIR_CATEGORIES.includes(b.category)) ? "Nazir" : "Shabir";
    }

    if (advanceAmount !== undefined) update.advanceAmount = Number(advanceAmount);
    if (partialPayments !== undefined) update.partialPayments = partialPayments;

    // Recalculate remainingAmount & paymentStatus
    const advAmount = advanceAmount !== undefined ? Number(advanceAmount) : undefined;
    const partials = partialPayments !== undefined ? partialPayments : [];
    const amount = totalAmount !== undefined ? totalAmount : undefined;

    if (amount !== undefined || advAmount !== undefined || partialPayments !== undefined) {
      const remaining = Math.max((amount ?? 0) - (advAmount ?? 0) - partials.reduce((s, p) => s + (Number(p.amount) || 0), 0), 0);
      update.remainingAmount = remaining;

      if (remaining === 0) update.paymentStatus = "paid";
      else if ((advAmount ?? 0) + partials.reduce((s, p) => s + (Number(p.amount) || 0), 0) > 0) update.paymentStatus = "partial";
      else update.paymentStatus = "unpaid";
    }

    const updated = await Products.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // Sync transaction table
    try {
      await Transactions.findOneAndUpdate(
        { relatedProductId: String(id) },
        {
          name: updated.name,
          buy: Array.isArray(updated.buy) ? updated.buy.map(b => b.category).join(", ") : "Uncategorized",
          amount: Number(updated.amount),
          advanceAmount: Number(updated.advanceAmount),
          remainingAmount: Number(updated.remainingAmount),
          relatedProductId: String(id),
          type: "in",
          date: updated.date instanceof Date ? updated.date.toISOString() : updated.date,
          status: updated.paymentStatus === "paid" ? "done" : "pending",
        },
        { upsert: true, new: true }
      );
    } catch (txErr) {
      console.error("Transaction sync failed:", txErr);
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/products error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE a product
export async function DELETE(req, context) {
  try {
    await connectToDatabase();
    const id = context?.params?.id;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });

    const deleted = await Products.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    try {
      await Transactions.deleteMany({ relatedProductId: String(id) });
    } catch (txErr) {
      console.error("Failed to delete linked transactions:", txErr);
    }

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/products error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
