import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Product from "@/app/models/Products";
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

    const updated = await Product.findByIdAndUpdate(id, body, { new: true });
    if (!updated) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
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

    await Product.findByIdAndDelete(id);
    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
