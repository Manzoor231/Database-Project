"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  FileText,
  Users,
  DollarSign,
  Settings,
  Menu,
  Clock,
} from "lucide-react";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
      <div className="md:hidden flex items-center justify-between bg-white shadow-sm p-3 sticky top-0 z-40">
        <div className="text-lg font-bold">Fazli Advertisement</div>
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen(true)}
          className="p-2 rounded-md hover:bg-gray-200"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* MOBILE DRAWER */}
      <div
        className={`fixed inset-0 z-40 transition-opacity md:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setOpen(false)}
        />

        {/* Drawer Sidebar */}
        <aside
          className={`absolute top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarContent closeMenu={() => setOpen(false)} pathname={pathname} links={links} />
        </aside>
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:flex-col w-64 min-h-screen border-r shadow-sm bg-white">
        <SidebarContent pathname={pathname} links={links} />
      </aside>
    </>
  );
}

/* Extracted content renderer */
function SidebarContent({ closeMenu, pathname, links }) {
  return (
    <div className="flex flex-col h-full justify-between p-6 overflow-y-auto">
      <div>
        <div className="text-2xl font-bold mb-6">Fazli Advertisement</div>

        <nav className="space-y-2">
          {links.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => closeMenu && closeMenu()}
                className={`flex items-center gap-3 p-2 rounded-lg transition ${
                  active
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

      <div className="mt-8 text-xs text-gray-400 text-center">
        © 2025 Fazli Advertisement
      </div>
    </div>
  );
}
