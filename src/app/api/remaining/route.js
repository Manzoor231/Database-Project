import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Remaining from "@/app/models/Remaining";

export async function GET() {
  try {
    await connectToDatabase();
    const records = await Remaining.find().sort({ createdAt: -1 });
    return NextResponse.json(records);
  } catch (err) {
    console.error("GET /api/remaining →", err);
    return NextResponse.json(
      { error: "Unable to fetch records." },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectToDatabase();

    const body = await req.json();
    if (!body?.name || !body?.amount) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const created = await Remaining.create(body);
    return NextResponse.json(created);
  } catch (err) {
    console.error("POST /api/remaining →", err);
    return NextResponse.json(
      { error: "Unable to create record." },
      { status: 500 }
    );
  }
}
