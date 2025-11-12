"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RemainingPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [openSidebar, setOpenSidebar] = useState(false);

  // Load products
  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const remainingList = products
    .map(p => ({
      ...p,
      remainingAmount: Number(p.amount || 0) - Number(p.advanceAmount || 0),
    }))
    .filter(p => p.remainingAmount > 0 && p.status !== "done")
    .filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden lg:block w-64">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden ${openSidebar ? "block" : "hidden"}`}
        onClick={() => setOpenSidebar(false)}
      />
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-40 lg:hidden transform transition-transform ${
          openSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:ml-4 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" className="lg:hidden p-1" onClick={() => setOpenSidebar(!openSidebar)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">Remaining Payments</h1>
          </div>
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </header>

        {/* Remaining Payments Cards */}
        {remainingList.length === 0 ? (
          <div className="text-gray-400 text-center py-6">No Remaining Balances</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {remainingList.map(item => (
              <Card key={item._id} className="hover:shadow-md transition-shadow">
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="font-semibold text-lg">{item.name}</div>
                    {item.phone && <div className="text-sm text-gray-500">{item.phone}</div>}
                  </div>

                  <div className="space-y-1">
                    <div className="text-gray-600 text-sm">{item.note}</div>
                    <div className="flex justify-between">
                      <span className="font-bold text-blue-600">Total:</span>
                      <span>{item.amount} AFN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-green-600">Advance:</span>
                      <span>{item.advanceAmount} AFN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-red-600">Remaining:</span>
                      <span>{item.remainingAmount} AFN</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <footer className="text-center text-xs text-gray-500 mt-10">
          © 2025 Fazli Advertisement — Remaining Payments
        </footer>
      </main>
    </div>
  );
}
