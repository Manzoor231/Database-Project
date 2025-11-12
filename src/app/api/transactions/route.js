import { NextResponse } from "next/server";

import connectToDatabase from "@/lib/mongodb";
import Transactions from "@/app/models/Transactions";

export async function GET() {
  await connectToDatabase();
  const list = await Transactions.find().sort({ date: -1 });
  return NextResponse.json(list);
}

export async function POST(req) {
  await connectToDatabase();
  const body = await req.json();
  const tx = await Transactions.create(body);
  return NextResponse.json(tx);
}

export async function PUT(req) {
  await connectToDatabase();
  const body = await req.json();
  const { id, ...update } = body;

  await Transactions.findByIdAndUpdate(id, update);
  return NextResponse.json({ success: true });
}

// export async function DELETE(req) {
//   await connectToDatabase();
//   const body = await req.json();

//   if (body.relatedProductId) {
//     await Transactions.deleteMany({ relatedProductId: body.relatedProductId });
//     return NextResponse.json({ success: true });
//   }

//   if (body.id) {
//     await Transactions.findByIdAndDelete(body.id);
//     return NextResponse.json({ success: true });
//   }

//   return NextResponse.json({ error: "Invalid delete request" }, { status: 400 });
// }
// DELETE /api/transactions
export async function DELETE(req) {
  await connectToDatabase();

  try {
    const body = await req.json(); // <- parse JSON from request

    const { id, relatedProductId } = body;

    if (!id && !relatedProductId) {
      return NextResponse.json({ error: "No ID provided" }, { status: 400 });
    }

    const query = id ? { _id: id } : { relatedProductId };
    const result = await Transactions.deleteMany(query);

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("Delete failed:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}