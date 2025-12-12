"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import {
  Activity,
  BellRing,
  Building2,
  Cpu,
  Globe2,
  HardDrive,
  HeartHandshake,
  LayoutDashboard,
  Layers,
  LineChart,
  Map,
  Megaphone,
  Package,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  exact?: boolean;
};

type NavGroup = {
  title: string;
  description: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Admin Plane",
    description: "Command, governance, and ops controls",
    items: [
      { label: "Command Center", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
      { label: "Users & RBAC", href: "/admin/users", icon: <ShieldCheck className="h-4 w-4" /> },
      { label: "Brands & Tenants", href: "/admin/brands", icon: <Building2 className="h-4 w-4" /> },
      { label: "AI HQ & Insights", href: "/admin/ai-hq", icon: <Cpu className="h-4 w-4" /> },
      { label: "Notifications & Activity", href: "/admin/notifications", icon: <BellRing className="h-4 w-4" /> },
      { label: "Automations & Rules", href: "/admin/automations", icon: <Zap className="h-4 w-4" /> },
      { label: "Platform Ops & Maintenance", href: "/admin/platform-ops", icon: <HardDrive className="h-4 w-4" /> },
    ],
  },
  {
    title: "Brand Plane",
    description: "Commerce, growth, finance, and field programs",
    items: [
      { label: "Products", href: "/commerce/products", icon: <Package className="h-4 w-4" /> },
      { label: "Pricing", href: "/commerce/pricing", icon: <Tag className="h-4 w-4" /> },
      { label: "Inventory", href: "/commerce/inventory", icon: <Layers className="h-4 w-4" /> },
      { label: "CRM", href: "/growth/crm", icon: <Users className="h-4 w-4" /> },
      { label: "Marketing", href: "/growth/marketing", icon: <Megaphone className="h-4 w-4" /> },
      { label: "Loyalty", href: "/growth/loyalty", icon: <HeartHandshake className="h-4 w-4" /> },
      { label: "Finance", href: "/money/finance", icon: <LineChart className="h-4 w-4" /> },
      { label: "Stand / POS", href: "/field/stand", icon: <Store className="h-4 w-4" /> },
      { label: "Sales Rep Engine", href: "/field/sales-reps", icon: <Map className="h-4 w-4" /> },
    ],
  },
  {
    title: "Virtual Office",
    description: "AI-led meetings and strategic reviews",
    items: [{ label: "Virtual HQ", href: "/virtual-hq", icon: <Globe2 className="h-4 w-4" /> }],
  },
];

const highlightClasses = "bg-gradient-to-r from-primary/80 to-secondary/60 text-white";

const matchesRoute = (pathname: string | null, item: NavItem) => {
  if (!pathname) return false;
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-white/5 bg-slate-950 p-6 text-sm text-slate-300 lg:flex lg:flex-col">
      <div className="mb-6 space-y-1">
        <p className="text-xs uppercase tracking-[0.5em] text-slate-500">MH-OS</p>
        <h2 className="text-2xl font-semibold text-white">SuperApp Shell</h2>
        <p className="text-xs text-slate-500">Enterprise navigation</p>
      </div>
      <div className="flex-1 space-y-8 overflow-y-auto pr-2">
        {navGroups.map((group: typeof navGroups[number]) => (
          <section key={group.title} className="space-y-3">
            <div>
              <p className="text-[0.625rem] uppercase tracking-[0.3em] text-slate-500">{group.title}</p>
              <p className="text-xs text-slate-500">{group.description}</p>
            </div>
            <div className="space-y-1">
              {group.items.map((item: typeof group.items[number]) => {
                const active = matchesRoute(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition",
                      active
                        ? `border border-white/10 ${highlightClasses}`
                        : "border border-transparent hover:border-white/10 hover:bg-white/5",
                    )}
                    title={item.label}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs uppercase tracking-[0.3em] text-slate-400">
        <Sparkles className="h-4 w-4 text-amber-300" />
        AI Dock ready
      </div>
    </aside>
  );
}
