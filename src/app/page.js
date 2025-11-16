"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Activity, Package, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [records, setRecords] = useState([]);
  const [openSidebar, setOpenSidebar] = useState(false);
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

        setRecords(data);
        
        // Calculate summary totals
        let totalIncome = 0;
        let totalExpense = 0;
        const productsSet = new Set();
        
        for (const r of data) {
          if (r.type === "in") totalIncome += r.effectiveAmount;
          if (r.type === "out") totalExpense += r.effectiveAmount;
          
          if (r.buy && r.buy !== "None") productsSet.add(r.buy);
        }
        
        setSummary({
          totalIncome,
          totalExpense,
          netProfit: totalIncome - totalExpense,
          totalProducts: productsSet.size
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
      }
    };
    
    loadData();
  }, []);

  
  
  return (
    <div className="flex gap-10 min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-gray-200">
        <Sidebar />
      </aside>s

      {/* Mobile Sidebar drawer */}
      <div className={`fixed inset-0 z-40 lg:hidden transition-opacity ${openSidebar ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-black bg-opacity-30" onClick={()=>setOpenSidebar(false)} />
        <div className={`absolute top-0 left-0 h-full w-64 bg-white shadow transform transition-transform ${openSidebar ? "translate-x-0" : "-translate-x-full"}`}>
          <Sidebar />
        </div>
      </div>

      <main className="flex-1 p-4 sm:p-6 space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <button className="lg:hidden p-1" onClick={()=>setOpenSidebar(true)}>
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 text-gray-800">
                <Activity className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" /> Dashboard Overview
              </h1>
            </div>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Total Income" value={summary.totalIncome} icon={<DollarSign className="text-green-600"/>} color="text-green-700"/>
          <SummaryCard title="Total Expense" value={summary.totalExpense} icon={<TrendingDown className="text-red-600"/>} color="text-red-600"/>
          <SummaryCard title="Net Profit" value={summary.netProfit} icon={<TrendingUp className="text-blue-600"/>} color="text-blue-600"/>
          <SummaryCard title="Total Products" value={summary.totalProducts} icon={<Package className="text-purple-600"/>} color="text-purple-700" isProduct/>
        </div>

        {/* Transactions Table */}
        <Card className="border border-gray-200 shadow-sm overflow-x-auto">
          <CardHeader>
            <CardTitle>Recent Transactions & Products</CardTitle>
          </CardHeader>
          <CardContent>
                {records.length === 0 ? (
              <p className="text-gray-500 text-sm">No records found.</p>
            ) : (
              <>
              <table className="min-w-full text-sm text-left border border-gray-200 rounded-md">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-2 border">#</th>
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Type</th>
                    <th className="p-2 border">Amount</th>
                    <th className="p-2 border">Category</th>
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Remaining Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 20).map((r, i) => (
                    <tr key={r._id || i} className="hover:bg-gray-50 transition-colors border-b">
                      <td className="p-2 border">{i + 1}</td>
                      <td className="p-2 border">{r.name || "N/A"}</td>
                      <td className={`p-2 border font-semibold ${r.type==="in"?"text-green-600":"text-red-600"}`}>{r.type?.toUpperCase()}</td>
                      <td className="p-2 border">{r.effectiveAmount?.toLocaleString() || "0"} AFN</td>
                      <td className="p-2 border">{r.buy || "Uncategorized"}</td>
                      <td className="p-2 border">{r.date?.slice(0,10) || "N/A"}</td>
                          <td className={`p-2 border font-semibold ${r.status==="done"?"text-green-600":"text-red-600"}`}>{r.status==="done"?"Paid":"Unpaid"}</td>
                    </tr>
                  ))}
                </tbody>
                  </table>
                  </>
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
