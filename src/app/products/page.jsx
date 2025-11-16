"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Trash2, Edit2 } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [balance, setBalance] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const emptyForm = {
    name: "",
    phone: "",
    buy: [],
    amount: "",
    advanceAmount: "",
    remainingAmount: 0,
    date: "",
    workStatus: "pending",
    paymentStatus: "unpaid",
  };

  const [form, setForm] = useState(emptyForm);

  const NAZIR_CATEGORIES = ["Banner Printing", "Glass Printing", "Flag Printing", "Sticker Printing"];
  const assignOwner = (categoriesArray) =>
    categoriesArray.some((cat) => NAZIR_CATEGORIES.includes(cat)) ? "Nazir" : "Shabir";

  // Auto-calculate remaining amount
  useEffect(() => {
    const total = Number(form.amount) || 0;
    const advance = Number(form.advanceAmount) || 0;
    setForm((f) => ({ ...f, remainingAmount: Math.max(total - advance, 0) }));
  }, [form.amount, form.advanceAmount]);

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

  useEffect(() => { loadProducts(); }, []);

  // Calculate total completed balance (only paid)
  useEffect(() => {
    const total = products.reduce((sum, p) => {
      const paidAmount = Number(p.amount || 0) - Number(p.remainingAmount || 0);
      return sum + paidAmount;
    }, 0);
    setBalance(total);
  }, [products]);

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.amount || !form.date) {
      alert("Please fill all required fields.");
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        ...form,
        buy: [...form.buy],
        amount: Number(form.amount),
        advanceAmount: Number(form.advanceAmount),
        remainingAmount: Number(form.remainingAmount),
        ownerName: assignOwner(form.buy),
      };

      const method = editProduct ? "PUT" : "POST";
      const url = editProduct ? `/api/products/${editProduct._id}` : "/api/products";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await loadProducts();
      setOpenForm(false);
      setEditProduct(null);
      setForm(emptyForm);
    } catch (err) {
      console.error(err);
      alert("Save failed. Check console.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setActionLoading(true);
    try {
      await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteId }),
      });
      await loadProducts();
      setOpenDelete(false);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteId(null);
      setActionLoading(false);
    }
  };

  // Toggle work status (does NOT affect balance)
  const handleWorkStatusChange = async (id) => {
    setActionLoading(true);
    try {
      const product = products.find((p) => p._id === id);
      if (!product) throw new Error("Product not found");

      const newStatus = product.workStatus === "pending" ? "done" : "pending";

      await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workStatus: newStatus }),
      });

      await loadProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Pay remaining (adds to total completed)
  const handlePaymentDone = async (id) => {
    setActionLoading(true);
    try {
      const product = products.find((p) => p._id === id);
      if (!product) throw new Error("Product not found");

      const currentRemaining = Number(product.remainingAmount || 0);

      if (currentRemaining > 0) {
        // mark as paid
        await fetch(`/api/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remainingAmount: 0, paymentStatus: "paid" }),
        });
      } else {
        // undo payment: restore remaining = amount - advanceAmount
        const amount = Number(product.amount || 0);
        const advance = Number(product.advanceAmount || 0);
        const undoRemaining = Math.max(0, amount - advance);
        const paymentStatus = undoRemaining === 0 ? "paid" : (advance > 0 ? "partial" : "unpaid");

        await fetch(`/api/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remainingAmount: undoRemaining, paymentStatus }),
        });
      }

      await loadProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? products : products.filter((p) => p.name?.toLowerCase().includes(q));
  }, [search, products]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100">
      <Sidebar className="w-full lg:w-64 flex-shrink-0" />
      <main className="flex-1 p-4 lg:p-6 space-y-6 overflow-x-hidden">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-purple-600" /> Products
            </h1>
            <p className="text-sm text-gray-500">Manage your print orders & payments</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <Input
              placeholder="Search by customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs flex-1"
            />
            <Button onClick={() => { setEditProduct(null); setForm(emptyForm); setOpenForm(true); }}>
              + Add Product
            </Button>
          </div>
        </header>

        {/* Balance */}
        <Card className="bg-green-50 border-green-300 shadow-sm">
          <CardHeader>
            <CardTitle className="text-green-800 font-semibold">
              💰 Total Completed Amount: {balance.toFixed(2)} AFN
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Product Table */}
        <Card className="shadow overflow-x-auto">
          <CardHeader>
            <CardTitle>
              Product List <span className="text-gray-600">({filtered.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b text-left">
                  <th className="p-2">Date</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Phone</th>
                  <th className="p-2">Category</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2 text-right">Remaining</th>
                  <th className="p-2 text-right">Advance</th>
                  <th className="p-2 text-center">Work Status</th>
                  <th className="p-2 text-center">Payment Status</th>
                  <th className="p-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="10" className="p-4 text-center text-gray-500">No products found.</td>
                  </tr>
                )}
                {filtered.map((p) => (
                  <tr key={p._id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="p-2">{p.name}</td>
                    <td className="p-2">{p.phone}</td>
                    <td className="p-2">{Array.isArray(p.buy) ? p.buy.join(", ") : p.buy}</td>
                    <td className="p-2 text-right">{Number(p.amount).toFixed(2)}</td>
                    <td className="p-2 text-right">{Number(p.remainingAmount).toFixed(2)}</td>
                    <td className="p-2 text-right">{Number(p.advanceAmount).toFixed(2)}</td>
                    <td className="p-2 text-center capitalize">{p.workStatus}</td>
                    <td className="p-2 text-center capitalize">{p.paymentStatus}</td>
                    <td className="p-2 text-center flex flex-wrap justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWorkStatusChange(p._id)}
                        disabled={actionLoading}
                      >
                        {p.workStatus === "pending" ? "Mark Work Done" : "Undo Work"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePaymentDone(p._id)}
                        disabled={actionLoading}
                      >
                        {p.remainingAmount > 0 ? "Pay" : "Undo"}
                      </Button>
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => { setEditProduct(p); setForm({ ...p, buy: [...p.buy] }); setOpenForm(true); }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={() => { setDeleteId(p._id); setOpenDelete(true); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <footer className="text-center text-xs text-gray-500 mt-6">
          © 2025 Fazli Advertisement — Products
        </footer>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder="Customer Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              type="text"
              placeholder="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Total Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Advance Amount"
              value={form.advanceAmount}
              onChange={(e) => setForm({ ...form, advanceAmount: e.target.value })}
            />
            <Input
              type="number"
              disabled
              value={form.remainingAmount}
              className="bg-gray-100"
            />
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />

            {/* Categories */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Categories</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 border rounded-md bg-white">
                {[
                  "Glass Printing","Card Printing","Banner Printing","Flag Printing",
                  "Sticker Printing","Indoor Sticker Printing","Tatt Printing",
                  "Roll-Up Stand Printing","3D Printing","Bill Book Printing"
                ].map((cat) => (
                  <label key={cat} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.buy.includes(cat)}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          buy: f.buy.includes(cat)
                            ? f.buy.filter((c) => c !== cat)
                            : [...f.buy, cat],
                        }))
                      }
                    />
                    <span className="text-sm">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Only show dropdowns when editing */}
            {editProduct && (
              <>
                <select
                  className="p-2 border rounded w-full"
                  value={form.workStatus}
                  onChange={(e) => setForm({ ...form, workStatus: e.target.value })}
                >
                  <option value="pending">Work Pending</option>
                  <option value="in-progress">In-Progress</option>
                  <option value="done">Work Done</option>
                </select>

                <select
                  className="p-2 border rounded w-full"
                  value={form.paymentStatus}
                  onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </>
            )}
          </div>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={actionLoading}>
              {editProduct ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Are you sure you want to delete this product?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDelete(false)}>Cancel</Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={actionLoading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
