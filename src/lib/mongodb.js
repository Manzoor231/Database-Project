import mongoose from "mongoose";
const MONGO_URL = "mongodb://127.0.0.1:27017/Fazli";

if (!MONGO_URL) {
  throw new Error("Please Define the MONGO_URL inside lib/mongodb.js");
}

export default async function connectToDatabase() {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(MONGO_URL);
}