// app/api/ledger/[id]/route.js
import connectToDatabase from "@/lib/mongodb";
import Ledger from "@/app/models/Ledger";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

async function resolveParams(context) {
    const awaited = await context;
    const raw = awaited?.params;
    return raw && typeof raw.then === "function" ? await raw : raw;
}

export async function PUT(request, context) {
    try {
        const params = await resolveParams(context);
        const id = params?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid id" }, { status: 400 });
        }

        await connectToDatabase();
        const body = await request.json();

        const update = {};
        if (body.type) update.type = body.type;
        if (body.amount !== undefined) update.amount = Number(body.amount);
        if (body.person !== undefined) update.person = body.person;
        if (body.category !== undefined) update.category = body.category;
        if (body.description !== undefined) update.description = body.description;
        if (body.date !== undefined) update.date = body.date;

        const updated = await Ledger.findByIdAndUpdate(id, update, { new: true });
        if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json(updated);
    } catch (err) {
        console.error("PUT /api/ledger/[id] error:", err);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}

export async function DELETE(request, context) {
    try {
        const params = await resolveParams(context);
        const id = params?.id;
        await connectToDatabase();
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid id" }, { status: 400 });
        }

        await Ledger.findByIdAndDelete(id);
        return NextResponse.json({ message: "Deleted" });
    } catch (err) {
        console.error("DELETE /api/ledger/[id] error:", err);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
