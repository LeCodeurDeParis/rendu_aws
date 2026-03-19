"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LayoutDashboard, Users, Database, LogOut, Shield } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Utilisateurs", icon: Users },
  { href: "/backups", label: "Backups", icon: Database },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, role, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== "admin")) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, role, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated || role !== "admin") return null;

  return (
    <div className="flex h-screen">
      <aside className="flex w-64 flex-col border-r bg-card">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Shield className="h-5 w-5 text-primary" />
          <Link href="/dashboard" className="text-lg font-bold">Admin</Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent ${
                pathname === href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}
