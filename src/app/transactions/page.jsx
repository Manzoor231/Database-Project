"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, Trash2, Edit2, Filter, Menu } from "lucide-react";

const NAZIR_CATEGORIES = ["Banner Printing", "Glass Printing", "Flag Printing", "Sticker Printing"];
const ALL_CATEGORIES = ["None", "Glass Printing", "Card Printing", "Banner Printing", "Flag Printing", "Sticker Printing", "Poster"];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    month: "all",
    type: "all",
    category: "all",
    person: "all",
    minAmount: "",
    sortBy: "latest",
  });
  const [openSidebar, setOpenSidebar] = useState(false);

  const deriveOwner = (buy = "None") => {
    const arr = Array.isArray(buy) ? buy : [buy];
    return arr.some(c => NAZIR_CATEGORIES.includes(c)) ? "Nazir" : "Shabir";
  };

  const loadTransactions = async () => {
    try {
      const res = await fetch("/api/transactions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const normalized = (data || []).map(t => {
        const amount = Number(t.amount || 0);
        const advance = Number(t.advanceAmount || 0);
        const rawRemaining = (t.remainingAmount !== undefined && t.remainingAmount !== null)
          ? Number(t.remainingAmount)
          : Math.max(0, amount - advance);
        const remaining = Math.max(0, Math.min(rawRemaining, amount));
        const isPaid = (t.paymentStatus === "paid") || (t.status === "done") || remaining === 0;
        return { ...t, amount, remainingAmount: remaining, isPaid };
      });
      setTransactions(normalized);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadTransactions(); }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      const { month, type, category, person, minAmount } = filters;
      const matchesSearch = t.name?.toLowerCase().includes(search.toLowerCase());
      const matchesType = type === "all" || t.type === type;
      const matchesCategory = category === "all" || (Array.isArray(t.buy) ? t.buy.includes(category) : t.buy === category);
      const matchesPerson = person === "all" || (t.owner || deriveOwner(t.buy)) === person;
      const matchesAmount = !minAmount || t.amount >= parseFloat(minAmount);
      const matchesMonth =
        month === "all" ||
        (month === "thisMonth" && tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear()) ||
        (month === "lastMonth" && (now.getMonth() === 0
          ? tDate.getMonth() === 11 && tDate.getFullYear() === now.getFullYear() - 1
          : tDate.getMonth() === now.getMonth() - 1 && tDate.getFullYear() === now.getFullYear())) ||
        (month === "thisYear" && tDate.getFullYear() === now.getFullYear());
      return matchesSearch && matchesType && matchesCategory && matchesPerson && matchesAmount && matchesMonth;
    }).sort((a,b)=>{
      switch(filters.sortBy){
        case "latest": return new Date(b.date) - new Date(a.date);
        case "oldest": return new Date(a.date) - new Date(b.date);
        case "highest": return b.amount - a.amount;
        case "lowest": return a.amount - b.amount;
        case "name": return (a.name||"").localeCompare(b.name||"");
        default: return 0;
      }
    });
  }, [transactions, filters, search]);

  const totals = useMemo(() => {
    const income = filtered.filter(t => t.type==="in").reduce((sum,t)=>sum+t.amount,0);
    const expense = filtered.filter(t => t.type==="out").reduce((sum,t)=>sum+t.amount,0);
    return { income, expense, balance: income-expense };
  }, [filtered]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50 gap-10">

      {/* Always-mounted sidebar */}
      <div className="w-full lg:w-64 shrink-0 border-r border-gray-200">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Drawer */}
      <div className={`fixed inset-0 z-40 lg:hidden transition-opacity ${openSidebar ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-black bg-opacity-30" onClick={()=>setOpenSidebar(false)} />
        <div className={`absolute top-0 left-0 h-full w-64 bg-white shadow transform transition-transform ${openSidebar ? "translate-x-0" : "-translate-x-full"}`}>
          <Sidebar />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-x-hidden">

        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" className="lg:hidden p-1" onClick={()=>setOpenSidebar(true)}>
              <Menu className="w-5 h-5"/>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
              <DollarSign className="w-6 h-6 text-green-600"/> Transactions
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Input placeholder="Search by name..." value={search} onChange={e=>setSearch(e.target.value)} className="flex-1 min-w-[150px]"/>
            <Button onClick={()=>alert("Add transaction")}>Add</Button>
          </div>
        </header>

        {/* Filters */}
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[{label:"Month", key:"month", options:["all","thisMonth","lastMonth","thisYear"]},
              {label:"Type", key:"type", options:["all","in","out"]},
              {label:"Category", key:"category", options:ALL_CATEGORIES},
              {label:"Person", key:"person", options:["all","Nazir","Shabir"]},
            ].map(f=>(<FilterSelect key={f.key} label={f.label} value={filters[f.key]} onChange={v=>setFilters({...filters,[f.key]:v})} options={f.options}/>))}
            <div>
              <label className="text-sm text-gray-600">Min Amount</label>
              <Input type="number" value={filters.minAmount} onChange={e=>setFilters({...filters,minAmount:e.target.value})} placeholder="Amount"/>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
            <div className="flex gap-3 items-center">
              <label className="text-sm text-gray-600">Sort By</label>
              <select value={filters.sortBy} onChange={e=>setFilters({...filters,sortBy:e.target.value})} className="border p-2 rounded-md">
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
            <Button variant="outline" onClick={()=>setFilters({month:"all",type:"all",category:"all",person:"all",minAmount:"",sortBy:"latest"})}>
              <Filter className="w-4 h-4 mr-2"/> Reset Filters
            </Button>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-x-auto">
          <CardHeader>
            <CardTitle>Transaction Records ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-3 overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm text-left border-collapse hidden sm:table">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  {["ID","Date","Name","Category","Amount","Remaining","Remaining Status","Type","Actions"].map(h => <th key={h} className="p-2 border">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-gray-500">No transactions found</td></tr>}
                {filtered.map((t, idx)=>(
                  <tr key={t._id} className={`${idx%2===0?"bg-white":"bg-gray-50"} hover:bg-gray-100`}>
                    <td className="p-2 border">{t._id}</td>
                    <td className="p-2 border">{t.date?.slice(0,10)}</td>
                    <td className="p-2 border">{t.name}</td>
                    <td className="p-2 border">{Array.isArray(t.buy) ? t.buy.join(", ") : t.buy}</td>
                    <td className={`p-2 border text-right font-semibold ${t.type==="in"?"text-green-600":"text-red-600"}`}>{t.type==="in"?"+":"-"}{Number(t.amount || 0).toFixed(2)} AFN</td>
                    <td className="p-2 border text-right">{t.remainingAmount>0?Number(t.remainingAmount).toFixed(2)+" AFN":"Paid"}</td>
                    <td className="p-2 border text-center">{t.isPaid ? <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">Paid</span> : <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-full">Unpaid</span>}</td>
                    <td className={`p-2 border text-center rounded-md ${t.type==="in"?"bg-green-50 text-green-600":"bg-red-50 text-red-600"}`}>{(t.type||"").toUpperCase()}</td>
                    <td className="p-2 border flex justify-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800"><Edit2 className="w-4 h-4"/></button>
                      <button className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4"/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Totals */}
        <div className="mt-4 text-sm font-medium flex flex-col sm:flex-row sm:justify-between gap-2">
          <p>Total Income: <span className="text-green-600 font-bold">+{totals.income.toFixed(2)} AFN</span></p>
          <p>Total Expense: <span className="text-red-600 font-bold">-{totals.expense.toFixed(2)} AFN</span></p>
          <p>Balance: <span className={`font-bold ${totals.balance>=0?"text-green-700":"text-red-700"}`}>{totals.balance.toFixed(2)} AFN</span></p>
        </div>

        <footer className="text-center text-xs text-gray-500 mt-6">© 2025 Fazli Advertisement — Transactions</footer>
      </main>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} className="w-full border p-2 rounded-md">
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
