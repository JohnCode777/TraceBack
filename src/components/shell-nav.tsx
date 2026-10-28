"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui";

const items = [
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/help/reporting", label: "Reporting help", icon: "help" },
];
export function ShellNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main navigation"
      className="flex gap-1 overflow-x-auto px-4 py-3 lg:block lg:space-y-1 lg:px-4 lg:py-0"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={
            pathname === item.href ||
            (item.href === "/projects" && pathname.startsWith("/projects"))
              ? "page"
              : undefined
          }
          className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${pathname === item.href || (item.href === "/projects" && pathname.startsWith("/projects")) ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg" : "text-indigo-100 hover:bg-white/10 hover:text-white"}`}
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
