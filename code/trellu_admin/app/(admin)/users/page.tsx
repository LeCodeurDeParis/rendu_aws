"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { User, Shield } from "lucide-react";

interface CognitoUser {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<CognitoUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CognitoUser[]>("/admin/users").then(setUsers).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <p className="text-sm text-muted-foreground">{users.length} utilisateurs inscrits</p>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Utilisateur</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rôle</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">ID</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.sub} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {user.role === "admin" ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>
                      <span className="text-sm font-medium">{user.name || "Sans nom"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.role === "admin" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{user.sub.slice(0, 12)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
