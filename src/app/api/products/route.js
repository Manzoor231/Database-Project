// /app/api/products/route.js
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Products from "@/app/models/Products";
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
  return NextResponse.json(updated);
}


export async function DELETE(req) {
  await connectToDatabase();
  const { id } = await req.json();

  await Products.findByIdAndDelete(id);

  return NextResponse.json({ success: true });
}
