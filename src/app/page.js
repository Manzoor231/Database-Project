"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Activity, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    totalProducts: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();
        if (!Array.isArray(data)) return;

        setTransactions(data);

        let totalIncome = 0;
        let totalExpense = 0;
        const productsSet = new Set();

        for (const t of data) {
          // Use effectiveAmount for totals
          if (t.type === "in") totalIncome += t.effectiveAmount;
          if (t.type === "out") totalExpense += t.effectiveAmount;

          if (t.buy && t.buy !== "None") productsSet.add(t.buy);
        }

        setSummary({
          totalIncome,
          totalExpense,
          netProfit: totalIncome - totalExpense,
          totalProducts: productsSet.size,
        });
      } catch (err) {
        console.error("Error loading dashboard:", err);
      }
    };

    loadData();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 text-gray-800">
              <Activity className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" /> Dashboard Overview
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">
              Financial summary and recent transactions (MongoDB synced)
            </p>
          </div>
          <Button
            onClick={() => alert("Report download coming soon...")}
            className="bg-green-600 hover:bg-green-700 text-white mt-2 sm:mt-0"
          >
            Download Report
          </Button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Total Income" value={summary.totalIncome} icon={<DollarSign className="text-green-600"/>} color="text-green-700"/>
          <SummaryCard title="Total Expense" value={summary.totalExpense} icon={<TrendingDown className="text-red-600"/>} color="text-red-600"/>
          <SummaryCard title="Net Profit" value={summary.netProfit} icon={<TrendingUp className="text-blue-600"/>} color="text-blue-600"/>
          <SummaryCard title="Total Products" value={summary.totalProducts} icon={<Package className="text-purple-600"/>} color="text-purple-700" isProduct/>
        </div>

        <Card className="border border-gray-200 shadow-sm overflow-x-auto">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-sm">No transactions found.</p>
            ) : (
              <table className="min-w-full text-sm text-left border border-gray-200 rounded-md">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-2 border">#</th>
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Type</th>
                    <th className="p-2 border">Amount</th>
                    <th className="p-2 border">Category</th>
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(-10).reverse().map((t, i) => (
                    <tr key={t._id || i} className="hover:bg-gray-50 transition-colors border-b">
                      <td className="p-2 border">{i + 1}</td>
                      <td className="p-2 border">{t.name || "N/A"}</td>
                      <td className={`p-2 border font-semibold ${t.type==="in"?"text-green-600":"text-red-600"}`}>{t.type?.toUpperCase()}</td>
                      <td className="p-2 border">{t.effectiveAmount?.toLocaleString() || "0"} AFN</td>
                      <td className="p-2 border">{t.buy || "Uncategorized"}</td>
                      <td className="p-2 border">{t.date?.slice(0,10) || "N/A"}</td>
                      <td className={`p-2 border font-semibold ${t.status==="done"?"text-green-600":"text-red-600"}`}>{t.status==="done"?"Paid":"Unpaid"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, isProduct }) {
  return (
    <Card className="hover:shadow-md transition-all duration-300 border border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold ${color}`}>{isProduct ? value : `${value.toLocaleString()} AFN`}</p>
      </CardContent>
    </Card>
  );
}
