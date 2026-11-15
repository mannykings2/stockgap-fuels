import {
  BadgeCheck,
  BarChart3,
  Boxes,
  Building2,
  Factory,
  Flame,
  Fuel,
  LayoutDashboard,
  PackageSearch,
  ScrollText,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Wallet,
  Inbox,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Any one of these permissions reveals the item. */
  permissions?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { to: "/portal", label: "Dashboard", icon: LayoutDashboard, permissions: ["dashboard:view"] },
      { to: "/portal/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/portal/orders", label: "Sales orders", icon: ShoppingCart, permissions: ["orders:read"] },
      { to: "/portal/inventory", label: "Inventory", icon: Boxes, permissions: ["inventory:read"] },
      { to: "/portal/lpg", label: "LPG operations", icon: Flame, permissions: ["lpg:read"] },
      { to: "/portal/petroleum", label: "Petroleum products", icon: Fuel, permissions: ["petroleum:read"] },
      { to: "/portal/manufacturing", label: "Manufacturing", icon: Factory, permissions: ["manufacturing:read"] },
      { to: "/portal/quality", label: "Quality assurance", icon: BadgeCheck, permissions: ["quality:read"] },
      { to: "/portal/logistics", label: "Logistics", icon: Truck, permissions: ["logistics:read", "deliveries:confirm"] },
    ],
  },
  {
    title: "Commercial",
    items: [
      { to: "/portal/procurement", label: "Procurement", icon: PackageSearch, permissions: ["procurement:read"] },
      { to: "/portal/suppliers", label: "Suppliers", icon: Building2, permissions: ["suppliers:read"] },
      { to: "/portal/customers", label: "Customers & partners", icon: Users, permissions: ["customers:read"] },
      { to: "/portal/finance", label: "Finance", icon: Wallet, permissions: ["finance:read"] },
    ],
  },
  {
    title: "Assurance",
    items: [
      { to: "/portal/hse", label: "HSE", icon: ShieldAlert, permissions: ["hse:read", "hse:report"] },
      { to: "/portal/reports", label: "Reports", icon: BarChart3, permissions: ["reports:read"] },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/portal/users", label: "Users & roles", icon: UserCog, permissions: ["users:read"] },
      { to: "/portal/audit", label: "Audit trail", icon: ScrollText, permissions: ["audit:read"] },
      { to: "/portal/enquiries", label: "Website enquiries", icon: Inbox, permissions: ["enquiries:manage"] },
      { to: "/portal/settings", label: "Settings", icon: Settings },
    ],
  },
];
