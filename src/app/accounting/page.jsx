// app/accounting/page.jsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Edit2, Plus } from "lucide-react";

/*
  Accounting (Ledger) page
  - Shows entries (income/expense)
  - Add / edit / delete
  - Filters: date from/to, type, person
  - Totals: total income, total expense, net balance
*/

const emptyForm = {
    type: "income",
    amount: "",
    person: "",
    category: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
};

export default function AccountingPage() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);

    // filters / UI state
    const [qPerson, setQPerson] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // dialog / form state
    const [openForm, setOpenForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [openDelete, setOpenDelete] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const loadEntries = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/ledger");
            const data = await res.json();
            setEntries(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load ledger", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEntries();
    }, []);

    const openNew = () => {
        setForm(emptyForm);
        setEditingId(null);
        setOpenForm(true);
    };

    const handleSave = async () => {
        if (!form.type || !form.date || !form.amount) {
            alert("Please fill type, date and amount");
            return;
        }
        setActionLoading(true);
        try {
            const payload = {
                ...form,
                amount: Number(form.amount),
            };
            if (editingId) {
                const res = await fetch(`/api/ledger/${editingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error("Update failed");
            } else {
                const res = await fetch("/api/ledger", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error("Create failed");
            }
            await loadEntries();
            setOpenForm(false);
            setEditingId(null);
        } catch (err) {
            console.error(err);
            alert("Save failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleEdit = (entry) => {
        setEditingId(entry._id);
        setForm({
            type: entry.type,
            amount: entry.amount,
            person: entry.person || "",
            category: entry.category || "",
            description: entry.description || "",
            date: entry.date ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        });
        setOpenForm(true);
    };

    const confirmDelete = (id) => {
        setDeleteId(id);
        setOpenDelete(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/ledger/${deleteId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            await loadEntries();
            setOpenDelete(false);
            setDeleteId(null);
        } catch (err) {
            console.error(err);
            alert("Delete failed");
        } finally {
            setActionLoading(false);
        }
    };

    const filtered = useMemo(() => {
        const q = qPerson.trim().toLowerCase();
        return entries.filter((e) => {
            if (filterType !== "all" && e.type !== filterType) return false;
            if (q && !(e.person || "").toLowerCase().includes(q)) return false;
            if (fromDate && e.date < fromDate) return false;
            if (toDate && e.date > toDate) return false;
            return true;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [entries, qPerson, filterType, fromDate, toDate]);

    // totals
    const totals = useMemo(() => {
        let income = 0;
        let expense = 0;
        for (const e of filtered) {
            if (e.type === "income") income += Number(e.amount || 0);
            else expense += Number(e.amount || 0);
        }
        return { income, expense, balance: income - expense };
    }, [filtered]);

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <main className="flex-1 p-6 space-y-6">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Accounting</h1>
                        <p className="text-sm text-gray-500">Manual ledger — record incomes and expenses</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Input placeholder="Search person..." value={qPerson} onChange={(e) => setQPerson(e.target.value)} className="max-w-xs" />
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border p-2 rounded-md">
                            <option value="all">All</option>
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                        </select>
                        <Button onClick={openNew} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add</Button>
                    </div>
                </header>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filters & Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                            <div className="flex gap-2 items-center">
                                <label className="text-sm text-gray-600">From</label>
                                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border p-2 rounded-md" />
                                <label className="text-sm text-gray-600">To</label>
                                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border p-2 rounded-md" />
                                <Button variant="outline" onClick={() => { setFromDate(""); setToDate(""); setFilterType("all"); setQPerson(""); }}>Reset</Button>
                            </div>

                            <div className="text-right">
                                <div className="text-sm text-gray-600">Total Income</div>
                                <div className="text-xl font-semibold text-green-600">{totals.income.toLocaleString()} AFN</div>

                                <div className="text-sm text-gray-600 mt-1">Total Expense</div>
                                <div className="text-xl font-semibold text-red-600">-{totals.expense.toLocaleString()} AFN</div>

                                <div className="text-sm text-gray-600 mt-1">Balance</div>
                                <div className={`text-2xl font-bold ${totals.balance >= 0 ? "text-green-700" : "text-red-700"}`}>{totals.balance.toLocaleString()} AFN</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Ledger Entries ({filtered.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100 text-left">
                                        <th className="p-2">Date</th>
                                        <th className="p-2">Type</th>
                                        <th className="p-2">Person</th>
                                        <th className="p-2">Category</th>
                                        <th className="p-2 text-right">Amount</th>
                                        <th className="p-2">Description</th>
                                        <th className="p-2 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((e) => (
                                        <tr key={e._id} className="border-b hover:bg-gray-50">
                                            <td className="p-2">{(e.date || "").slice(0, 10)}</td>
                                            <td className={`p-2 font-semibold ${e.type === "income" ? "text-green-600" : "text-red-600"}`}>{(e.type || "").toUpperCase()}</td>
                                            <td className="p-2">{e.person || "—"}</td>
                                            <td className="p-2">{e.category || "—"}</td>
                                            <td className="p-2 text-right">{Number(e.amount || 0).toLocaleString()} AFN</td>
                                            <td className="p-2">{e.description || ""}</td>
                                            <td className="p-2 text-center flex justify-center gap-2">
                                                <button onClick={() => handleEdit(e)} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => confirmDelete(e._id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="p-4 text-center text-gray-500">No entries</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <footer className="text-center text-xs text-gray-500">© 2025 Fazli Advertisement — Accounting</footer>
            </main>

            {/* Add/Edit Dialog */}
            <Dialog open={openForm} onOpenChange={setOpenForm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Entry" : "Add Entry"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="border p-2 rounded-md">
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                            </select>

                            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="border p-2 rounded-md" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input placeholder="Person" value={form.person} onChange={e => setForm({ ...form, person: e.target.value })} />
                            <Input placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                        </div>

                        <Input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                        <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </div>

                    <DialogFooter className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => { setOpenForm(false); setEditingId(null); }}>Cancel</Button>
                        <Button onClick={handleSave} disabled={actionLoading}>{editingId ? "Save" : "Add"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Delete</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm">Are you sure you want to delete this entry?</p>
                    <DialogFooter className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setOpenDelete(false)}>Cancel</Button>
                        <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white" disabled={actionLoading}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
