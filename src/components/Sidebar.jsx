"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, FileText, Users, DollarSign, Settings, Menu, Clock } from "lucide-react";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname(); // for active link highlighting

  const links = [
    { name: "Dashboard", icon: <BarChart2 className="w-4 h-4" />, href: "/" },
    { name: "Transactions", icon: <FileText className="w-4 h-4" />, href: "/transactions" },
    { name: "Products", icon: <Users className="w-4 h-4" />, href: "/products" },
    { name: "Remaining", icon: <Clock className="w-4 h-4" />, href: "/remaining" },
    { name: "Accounting", icon: <Clock className="w-4 h-4" />, href: "/accounting" },
    { name: "Reports", icon: <DollarSign className="w-4 h-4" />, href: "/reports" },
    { name: "Settings", icon: <Settings className="w-4 h-4" />, href: "/settings" },
  ];

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-white shadow-sm p-3 sticky top-0 z-30">
        <div className="text-lg font-bold">Fazli Advertisement</div>
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen(!open)}
          className="p-1 rounded-md hover:bg-gray-200"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:static top-0 left-0 h-full bg-white border-r z-40 transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 w-64 md:w-72 shadow-lg md:shadow-none`}
      >
        <div className="flex flex-col h-full justify-between p-6 overflow-y-auto">
          {/* Branding + nav */}
          <div>
            <div className="text-2xl font-bold mb-6">Fazli Advertisement</div>
            <nav className="space-y-2">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors duration-200 ${
                      isActive
                        ? "bg-green-100 text-green-700 font-semibold"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    {link.icon}
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer */}
          <div className="mt-8 text-xs text-gray-400 text-center">
            © 2025 Fazli Advertisement
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}
    </>
  );
}
