"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users, FolderKanban, ListTodo, Building2 } from "lucide-react";

interface Stats {
  users: number;
  teams: number;
  projects: number;
  tasks: number;
}

const statCards = [
  { key: "users" as const, label: "Utilisateurs", icon: Users, color: "text-blue-500 bg-blue-500/10" },
  { key: "teams" as const, label: "Équipes", icon: Building2, color: "text-green-500 bg-green-500/10" },
  { key: "projects" as const, label: "Projets", icon: FolderKanban, color: "text-purple-500 bg-purple-500/10" },
  { key: "tasks" as const, label: "Tâches", icon: ListTodo, color: "text-orange-500 bg-orange-500/10" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Stats>("/admin/stats").then(setStats).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Vue d&apos;ensemble de la plateforme</p>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <div className={`flex h-10 w-10 items-center justify-center rounded-md ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold">{stats[key]}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-destructive">Erreur lors du chargement des statistiques</div>
      )}
    </div>
  );
}
