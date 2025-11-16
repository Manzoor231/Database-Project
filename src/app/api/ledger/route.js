// app/api/ledger/route.js
import connectToDatabase from "@/lib/mongodb";
import Ledger from "@/app/models/Ledger";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await connectToDatabase();
    // optional query params: ?limit=50&from=2025-01-01&to=2025-12-31&type=income
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const type = url.searchParams.get("type") || null;
    const from = url.searchParams.get("from") || null;
    const to = url.searchParams.get("to") || null;
    const person = url.searchParams.get("person") || null;

    const filter = {};
    if (type) filter.type = type;
    if (person) filter.person = { $regex: person, $options: "i" };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const records = await Ledger.find(filter).sort({ date: -1, createdAt: -1 }).limit(limit);
    return NextResponse.json(records);
  } catch (err) {
    console.error("GET /api/ledger error:", err);
    return NextResponse.json({ error: "Failed to load ledger" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    // Basic validation
    const { type, amount, date } = body;
    if (!type || !["income", "expense"].includes(type)) {
      return NextResponse.json({ error: "Invalid or missing 'type' (income|expense)" }, { status: 400 });
    }
    if (typeof amount === "undefined" || Number.isNaN(Number(amount))) {
      return NextResponse.json({ error: "Invalid or missing 'amount'" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "Missing 'date' (YYYY-MM-DD)" }, { status: 400 });
    }

    const doc = await Ledger.create({
      type,
      amount: Number(amount),
      person: body.person || "",
      category: body.category || "",
      description: body.description || "",
      date,
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error("POST /api/ledger error:", err);
    return NextResponse.json({ error: "Failed to create ledger entry" }, { status: 500 });
  }
}
