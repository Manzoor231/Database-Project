// /app/api/products/route.js
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Products from "@/app/models/Products";
import Transactions from "@/app/models/Transactions";
export async function GET() {
  try {
    await connectToDatabase();
    const products = await Products.find().sort({ date: -1 });
    return NextResponse.json(products);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export async function POST(req) {
  await connectToDatabase();
  const body = await req.json();
  const { name, phone, buy, amount, advanceAmount } = body;

  const remaining = amount - (advanceAmount || 0);
  let paymentStatus = "unpaid";
  if (remaining === 0) paymentStatus = "paid";
  else if (advanceAmount > 0 && remaining > 0) paymentStatus = "unpaid";

  const ownerName = (buy || []).some(c => ["Banner Printing", "Glass Printing", "Flag Printing", "Sticker Printing"].includes(c)) ? "Nazir" : "Shabir";

  const newProduct = await Products.create({
    name,
    phone,
    buy,
    ownerName,
    amount,
    advanceAmount,
    remainingAmount: remaining,
    paymentStatus,
    workStatus: "pending",
    date: body.date || new Date()
  });

  try {
    // Also create a corresponding transaction so products show in transactions/dashboard
    await Transactions.create({
      name: newProduct.name,
      buy: Array.isArray(newProduct.buy) ? (newProduct.buy[0] || "Uncategorized") : newProduct.buy || "Uncategorized",
      amount: Number(newProduct.amount) || 0,
      advanceAmount: Number(newProduct.advanceAmount) || 0,
      remainingAmount: Number(newProduct.remainingAmount) || 0,
      relatedProductId: String(newProduct._id),
      type: "in",
      date: newProduct.date instanceof Date ? newProduct.date.toISOString() : newProduct.date,
    });
  } catch (txErr) {
    console.error("Failed to create linked transaction:", txErr);
  }

  return NextResponse.json(newProduct);
}


export async function PUT(req) {
  await connectToDatabase();
  const body = await req.json();
  const { id, name, phone, buy, amount, advanceAmount, workStatus, paymentStatus, date } = body;

  const update = {};

  if (name !== undefined) update.name = name;
  if (phone !== undefined) update.phone = phone;
  if (buy !== undefined) update.buy = buy;
  if (amount !== undefined) update.amount = amount;
  if (advanceAmount !== undefined) update.advanceAmount = advanceAmount;
  if (workStatus !== undefined) update.workStatus = workStatus;
  if (paymentStatus !== undefined) update.paymentStatus = paymentStatus;
  if (date !== undefined) update.date = date;

  if (amount !== undefined || advanceAmount !== undefined) {
    const remaining = (amount || 0) - (advanceAmount || 0);
    update.remainingAmount = remaining;
    if (remaining === 0) update.paymentStatus = "paid";
    else if ((advanceAmount || 0) > 0) update.paymentStatus = "partial";
    else update.paymentStatus = "unpaid";
  }

  if (buy !== undefined) {
    update.ownerName = buy.some(c => ["Banner Printing","Glass Printing","Flag Printing","Sticker Printing"].includes(c)) ? "Nazir" : "Shabir";
  }

  const updated = await Products.findByIdAndUpdate(id, update, { new: true });
  // Keep linked transaction in sync (update or create if missing)
  try {
    await Transactions.findOneAndUpdate(
      { relatedProductId: String(id) },
      {
        name: updated?.name,
        buy: Array.isArray(updated?.buy) ? (updated.buy[0] || "Uncategorized") : updated?.buy || "Uncategorized",
        amount: Number(updated?.amount) || 0,
        advanceAmount: Number(updated?.advanceAmount) || 0,
        remainingAmount: Number(updated?.remainingAmount) || 0,
        relatedProductId: String(id),
        type: "in",
        date: updated?.date instanceof Date ? updated.date.toISOString() : updated?.date,
        status: (updated?.paymentStatus === "paid") ? "done" : "pending",
      },
      { upsert: true, new: true }
    );
  } catch (txErr) {
    console.error("Failed to sync linked transaction on product update:", txErr);
  }

  return NextResponse.json(updated);
}


export async function DELETE(req) {
  await connectToDatabase();
  const { id } = await req.json();

  await Products.findByIdAndDelete(id);
  try {
    await Transactions.deleteMany({ relatedProductId: String(id) });
  } catch (txErr) {
    console.error("Failed to delete linked transactions:", txErr);
  }

  return NextResponse.json({ success: true });
}
