"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface UserProfile {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get<UserProfile>("/users/me").then((u) => {
      setUser(u);
      setName(u.name);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const updated = await api.put<UserProfile>("/users/me", { name });
      setUser(updated);
      setMessage("Profil mis à jour");
    } catch {
      setMessage("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <div className="text-muted-foreground">Chargement...</div>;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-sm text-muted-foreground">Gérez vos informations personnelles</p>
      </div>
      <form onSubmit={handleSave} className="space-y-4 rounded-lg border p-6">
        {message && (
          <div className="rounded-md bg-primary/10 p-3 text-sm">{message}</div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">Nom</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Rôle</label>
          <input
            type="text"
            value={user.role}
            disabled
            className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
