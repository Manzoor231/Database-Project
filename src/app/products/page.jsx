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
    amount: 0,
    advanceAmount: 0,
    remainingAmount: 0,
    date: "",
    workStatus: "pending",
    paymentStatus: "unpaid",
    partialPayments: [],
  };

  const [form, setForm] = useState(emptyForm);

  const NAZIR_CATEGORIES = ["Banner Printing", "Glass Printing", "Flag Printing", "Sticker Printing"];
  const assignOwner = (categoriesArray) =>
    categoriesArray.some((cat) => NAZIR_CATEGORIES.includes(cat)) ? "Nazir" : "Shabir";

  // Recalculate remainingAmount whenever amounts or partial payments change
  useEffect(() => {
    const total = Number(form.amount || 0);
    const advance = Number(form.advanceAmount || 0);
    const partialPaid = (form.partialPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    setForm(f => ({ ...f, remainingAmount: Math.max(total - advance - partialPaid, 0) }));
  }, [form.amount, form.advanceAmount, form.partialPayments]);

  // Recalculate total amount from buy array
  useEffect(() => {
    const totalAmount = form.buy.reduce((sum, b) => sum + (b.qty * (b.unitPrice || 0)), 0);
    setForm(f => ({ ...f, amount: totalAmount }));
  }, [form.buy]);

  // Load products from API
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

  // Update total balance
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
        buy: Array.isArray(form.buy) ? form.buy.map(item => ({
          category: item.category,
          qty: Number(item.qty),
          unitPrice: Number(item.unitPrice || 0)
        })) : [],
        amount: Number(form.amount),
        advanceAmount: Number(form.advanceAmount),
        remainingAmount: Number(form.remainingAmount),
        ownerName: assignOwner(form.buy.map(b => b.category)),
      };

      if (!editProduct && payload._id) delete payload._id;

      const method = editProduct ? "PUT" : "POST";
      const url = editProduct ? `/api/products/${editProduct._id}` : "/api/products";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("API request failed");

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
      await fetch(`/api/products/${deleteId}`, { method: "DELETE" });
      await loadProducts();
      setOpenDelete(false);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteId(null);
      setActionLoading(false);
    }
  };

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

  const handlePaymentDone = async (id, payment = null) => {
    setActionLoading(true);
    try {
      const product = products.find((p) => p._id === id);
      if (!product) throw new Error("Product not found");

      let partialPayments = Array.isArray(product.partialPayments) ? [...product.partialPayments] : [];
      if (payment) partialPayments.push(payment);

      const totalPartial = partialPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const remaining = Math.max(Number(product.amount || 0) - Number(product.advanceAmount || 0) - totalPartial, 0);
      const paymentStatus = remaining === 0
        ? "paid"
        : totalPartial + Number(product.advanceAmount || 0) > 0
          ? "partial"
          : "unpaid";

      await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partialPayments, remainingAmount: remaining, paymentStatus }),
      });

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
      <Sidebar className="w-full lg:w-64 shrink-0" />
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
                  <th className="p-2 text-center">Partial Payments</th>
                  <th className="p-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="11" className="p-4 text-center text-gray-500">No products found.</td>
                  </tr>
                )}
                {filtered.map((p) => (
                  <tr key={p._id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="p-2">{p.name}</td>
                    <td className="p-2">{p.phone}</td>
                    <td className="p-2">
                      {Array.isArray(p.buy)
                        ? p.buy.map(b => `${b.category} (${b.qty} × ${Number(b.unitPrice || 0).toFixed(2)} = ${(b.qty * (b.unitPrice || 0)).toFixed(2)})`).join(", ")
                        : ""}
                    </td>
                    <td className="p-2 text-right">{Number(p.amount).toFixed(2)}</td>
                    <td className="p-2 text-right">{Number(p.remainingAmount).toFixed(2)}</td>
                    <td className="p-2 text-right">{Number(p.advanceAmount).toFixed(2)}</td>
                    <td className="p-2 text-center capitalize">{p.workStatus}</td>
                    <td className="p-2 text-center capitalize">{p.paymentStatus}</td>
                    <td className="p-2 text-center">
                      {Array.isArray(p.partialPayments) && p.partialPayments.length > 0
                        ? p.partialPayments.map((pp, idx) => (
                          <div key={idx}>
                            {Number(pp.amount).toFixed(2)} AFN - {new Date(pp.date).toLocaleDateString()}
                          </div>
                        ))
                        : "-"}
                    </td>
                    <td className="p-2 text-center flex flex-wrap justify-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleWorkStatusChange(p._id)} disabled={actionLoading}>
                        {p.workStatus === "pending" ? "Mark Work Done" : "Undo Work"}
                      </Button>

                      <Button size="sm" variant="outline" onClick={() => {
                        const amount = Number(prompt("Enter partial payment amount:"));
                        if (amount > 0 && amount < p.remainingAmount) {
                          handlePaymentDone(p._id, { amount, date: new Date() });
                        } else if (amount >= p.remainingAmount) {
                          alert(`Amount must be less than remaining: ${p.remainingAmount}`);
                        }
                      }} disabled={actionLoading || p.remainingAmount === 0}>
                        Partial Pay
                      </Button>

                      <Button size="sm" variant="outline" onClick={() => {
                        if (p.remainingAmount > 0) {
                          handlePaymentDone(p._id, { amount: Number(p.remainingAmount), date: new Date() });
                        }
                      }} disabled={actionLoading || p.remainingAmount === 0}>
                        Pay Remaining
                      </Button>

                      <button className="text-blue-600 hover:text-blue-800" onClick={() => {
                        setEditProduct(p);
                        setForm({ ...p, buy: Array.isArray(p.buy) ? [...p.buy] : [], partialPayments: Array.isArray(p.partialPayments) ? [...p.partialPayments] : [] });
                        setOpenForm(true);
                      }}>
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button className="text-red-600 hover:text-red-800" onClick={() => { setDeleteId(p._id); setOpenDelete(true); }}>
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
        <DialogContent className="flex flex-col max-h-[90vh] w-full sm:w-[500px]">
          <DialogHeader>
            <DialogTitle>{editProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 space-y-3 mt-2 pr-2">
            <Input placeholder="Customer Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input type="text" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input type="number" placeholder="Advance Amount" value={form.advanceAmount} onChange={(e) => setForm({ ...form, advanceAmount: Number(e.target.value) })} />
            <Input type="number" disabled value={form.remainingAmount} className="bg-gray-100" />
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />

            {/* Categories */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Categories, Qty & Unit Price</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-2 border rounded-md bg-white max-h-64 overflow-y-auto">
                {["Glass Printing", "Card Printing", "Banner Printing", "Flag Printing", "Sticker Printing", "Indoor Sticker Printing", "Tatt Printing", "Roll-Up Stand Printing", "3D Printing", "Bill Book Printing"].map(cat => {
                  const selected = form.buy.find(b => b.category === cat);
                  return (
                    <div key={cat} className="flex flex-col border p-2 rounded-md">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={!!selected} onChange={() => {
                          if (selected) setForm(f => ({ ...f, buy: f.buy.filter(b => b.category !== cat) }));
                          else setForm(f => ({ ...f, buy: [...f.buy, { category: cat, qty: 1, unitPrice: 0 }] }));
                        }} />
                        <span className="text-sm">{cat}</span>
                      </label>
                      {selected && (
                        <>
                          <Input type="number" min="1" value={selected.qty} onChange={(e) => {
                            const qty = Number(e.target.value);
                            setForm(f => ({
                              ...f,
                              buy: f.buy.map(b => b.category === cat ? { ...b, qty } : b)
                            }));
                          }} className="mt-1" placeholder="Qty" />
                          <Input type="number" min="0" value={selected.unitPrice} onChange={(e) => {
                            const unitPrice = Number(e.target.value);
                            setForm(f => ({
                              ...f,
                              buy: f.buy.map(b => b.category === cat ? { ...b, unitPrice } : b)
                            }));
                          }} className="mt-1" placeholder="Unit Price" />
                          <div className="text-right text-sm mt-1">
                            Total: {(selected.qty * (selected.unitPrice || 0)).toFixed(2)} AFN
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <Input type="number" disabled value={form.amount} className="bg-gray-100 mt-2" placeholder="Total Product Amount" />

            {/* Partial Payments */}
            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium">Partial Payments</label>
              {form.partialPayments.map((p, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input type="number" placeholder="Amount" value={p.amount} onChange={(e) => {
                    const newAmount = Number(e.target.value);
                    setForm(f => ({ ...f, partialPayments: f.partialPayments.map((pp, i) => i === idx ? { ...pp, amount: newAmount } : pp) }));
                  }} />
                  <Input type="date" value={p.date ? new Date(p.date).toISOString().split("T")[0] : ""} onChange={(e) => {
                    const newDate = e.target.value;
                    setForm(f => ({ ...f, partialPayments: f.partialPayments.map((pp, i) => i === idx ? { ...pp, date: newDate } : pp) }));
                  }} />
                  <Button variant="outline" onClick={() => setForm(f => ({ ...f, partialPayments: f.partialPayments.filter((_, i) => i !== idx) }))}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setForm(f => ({ ...f, partialPayments: [...f.partialPayments, { amount: 0, date: new Date() }] }))}>
                + Add Partial Payment
              </Button>
            </div>

            {editProduct && (
              <>
                <select className="p-2 border rounded w-full" value={form.workStatus} onChange={(e) => setForm({ ...form, workStatus: e.target.value })}>
                  <option value="pending">Work Pending</option>
                  <option value="in-progress">In-Progress</option>
                  <option value="done">Work Done</option>
                </select>
                <select className="p-2 border rounded w-full" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial Paid</option>
                  <option value="paid">Paid</option>
                </select>
              </>
            )}
          </div>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenForm(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={actionLoading}>
              {editProduct ? "Update Product" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">Are you sure you want to delete this product?</div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenDelete(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={actionLoading}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
