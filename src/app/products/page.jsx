"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Trash2, Edit2, CheckCircle2, Clock } from "lucide-react";

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
    buy: "Glass Printing",
    amount: "",
    advanceAmount: "",
    remainingAmount: 0,
    date: "",
    status: "pending",
  };

  const [form, setForm] = useState(emptyForm);

  const NAZIR_CATEGORIES = ["Banner Printing", "Glass Printing", "Flag Printing", "Sticker Printing"];
  const assignOwner = (category) => NAZIR_CATEGORIES.includes(category) ? "Nazir" : "Shabir";

  // Auto calculate remaining amount
  useEffect(() => {
    const total = Number(form.amount) || 0;
    const advance = Number(form.advanceAmount) || 0;
    setForm(f => ({ ...f, remainingAmount: Math.max(total - advance, 0) }));
  }, [form.amount, form.advanceAmount]);

  // Load products from API
  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      setProducts(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate total balance
  useEffect(() => {
    const total = products.reduce((sum, p) => {
      if (p.status === "done") return sum + Number(p.amount || 0);
      return sum + Number(p.advanceAmount || 0);
    }, 0);
    setBalance(total);
  }, [products]);

  useEffect(() => { loadProducts(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.amount || !form.date) {
      alert("Please fill all required fields.");
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        advanceAmount: Number(form.advanceAmount),
        remainingAmount: Number(form.remainingAmount),
        status: form.status,
      };

      const method = editProduct ? "PUT" : "POST";
      const url = editProduct ? `/api/products/${editProduct._id}` : "/api/products";
      const productRes = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const saved = productRes.ok ? await productRes.json() : null;

      // Sync transaction
      if (saved) {
        await fetch("/api/transactions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relatedProductId: saved._id }),
        }).catch(() => { });

        const adv = Number(saved.advanceAmount) || 0;
        const rem = Number(saved.amount) - adv;

        const txPayload = saved.status === "done"
          ? { amount: saved.amount, remainingAmount: 0 }
          : { amount: adv, remainingAmount: rem };

        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: saved.name,
            buy: saved.buy,
            ...txPayload,
            type: "in",
            date: saved.date,
            owner: assignOwner(saved.buy),
            relatedProductId: saved._id,
          }),
        });
      }

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
      await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relatedProductId: deleteId }),
      }).catch(() => { });
      await loadProducts();
      setOpenDelete(false);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteId(null);
      setActionLoading(false);
    }
  };

  // Toggle product status and sync transaction
  const handleStatusChange = async (id, currentStatus) => {
    setActionLoading(true);
    try {
      const product = products.find(p => p._id === id);
      if (!product) throw new Error("Product not found");

      const newStatus = currentStatus === "pending" ? "done" : "pending";
      const updatedRemaining = newStatus === "done" ? 0 : Number(product.amount) - Number(product.advanceAmount);

      // 1. Update product
      await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, remainingAmount: updatedRemaining }),
      });

      // 2. Remove old transaction
      await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relatedProductId: id }),
      });

      // 3. Create new transaction
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          buy: product.buy,
          amount: Number(product.amount),
          remainingAmount: updatedRemaining,
          type: "in",
          date: product.date,
          owner: assignOwner(product.buy),
          relatedProductId: product._id,
        }),
      });

      await loadProducts(); // refresh products
    } catch (err) {
      console.error("Status change failed:", err);
    } finally {
      setActionLoading(false);
    }
  };



  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? products : products.filter(p => p.name?.toLowerCase().includes(q));
  }, [search, products]);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-purple-600" /> Products
            </h1>
            <p className="text-sm text-gray-500">Manage your print orders & payments</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Input placeholder="Search by customer name..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
            <Button onClick={() => { setEditProduct(null); setForm(emptyForm); setOpenForm(true); }}>+ Add Product</Button>
          </div>
        </header>

        <Card className="bg-green-50 border-green-300 shadow-sm">
          <CardHeader>
            <CardTitle className="text-green-800 font-semibold">💰 Total Completed Amount: {balance.toFixed(2)} AFN</CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow">
          <CardHeader>
            <CardTitle>Product List <span className="text-gray-600">({filtered.length})</span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b text-left">
                    <th className="p-2">Date</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Phone</th>
                    <th className="p-2">Category</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-right">Remaining</th>
                    <th className="p-2 text-right">Advance</th>
                    <th className="p-2 text-center">Status</th>
                    <th className="p-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p._id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{p.date}</td>
                      <td className="p-2">{p.name}</td>
                      <td className="p-2">{p.phone}</td>
                      <td className="p-2">{p.buy}</td>
                      <td className="p-2 text-right">{Number(p.amount).toFixed(2)}</td>
                      <td className="p-2 text-right">{Number(p.remainingAmount).toFixed(2)}</td>
                      <td className="p-2 text-right">{Number(p.advanceAmount).toFixed(2)}</td>
                      <td className="p-2 text-center">
                        {p.status === "done" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center flex justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(p._id, p.status)} disabled={actionLoading}>
                          {p.status === "pending" ? "Mark Done" : "Undo"}
                        </Button>
                        <button className="text-blue-600 hover:text-blue-800" onClick={() => { setEditProduct(p); setForm({ ...p }); setOpenForm(true); }}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-800" onClick={() => { setDeleteId(p._id); setOpenDelete(true); }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="9" className="p-4 text-center text-gray-500">No products found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <footer className="text-center text-xs text-gray-500 mt-6">© 2025 Fazli Advertisement — Products</footer>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Customer Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input type="number" placeholder="Phone Number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input type="number" placeholder="Total Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <Input type="number" placeholder="Advance Amount" value={form.advanceAmount} onChange={e => setForm({ ...form, advanceAmount: e.target.value })} />
            <Input type="number" disabled value={form.remainingAmount} className="bg-gray-100" />
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            <select value={form.buy} onChange={e => setForm({ ...form, buy: e.target.value })} className="w-full p-2 border rounded-md">
              <option value="Glass Printing">Glass Printing</option>
              <option value="Card Printing">Card Printing</option>
              <option value="Banner Printing">Banner Printing</option>
              <option value="Flag Printing">Flag Printing</option>
              <option value="Sticker Printing">Sticker Printing</option>
              <option value="Indoor Sticker Printing">Indoor Sticker Printing</option>
              <option value="Tatt Printing">Tatt Printing</option>
              <option value="Roll-Up Stand Printing">Roll-Up Stand Printing</option>
              <option value="3D Printing">3D Printing</option>
              <option value="Bill Book Printing">Bill Book Printing</option>
            </select>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={actionLoading}>{editProduct ? "Save Changes" : "Add Product"}</Button>
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
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white" disabled={actionLoading}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
