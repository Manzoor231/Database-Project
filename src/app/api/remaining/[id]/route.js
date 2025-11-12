import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import mongoose from "mongoose";
import Remaining from "@/app/models/Remaining";

// ✅ Helper to safely resolve params in Next.js 16
async function getId(context) {
  const c = await context;
  const p = (await c?.params) || {};
  return p.id;
}

// ✅ GET One
export async function GET(_, context) {
  try {
    const id = await getId(context);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();
    const record = await Remaining.findById(id);

    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (err) {
    console.error("GET /api/remaining/[id] →", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ✅ UPDATE
export async function PUT(req, context) {
  try {
    const id = await getId(context);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const data = await req.json();
    await connectToDatabase();

    const updated = await Remaining.findByIdAndUpdate(id, data, { new: true });

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/remaining/[id] →", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// ✅ DELETE
export async function DELETE(_, context) {
  try {
    const id = await getId(context);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();
    await Remaining.findByIdAndDelete(id);

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/remaining/[id] →", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
