"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { confirmSignUp, resendConfirmationCode } from "@/lib/cognito";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") ?? "";

  const [email] = useState(emailParam);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmSignUp(email, code);
      router.push("/login?verified=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setResent(false);
    try {
      await resendConfirmationCode(email);
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du renvoi");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Trellu</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Un code de vérification a été envoyé à <strong>{email}</strong>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          {resent && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
              Code renvoyé avec succès
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">Code de vérification</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-center text-lg tracking-widest ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="000000"
            />
          </div>
          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Vérification..." : "Vérifier"}
          </button>
        </form>
        <div className="text-center space-y-2">
          <button
            onClick={handleResend}
            className="text-sm text-primary hover:underline"
          >
            Renvoyer le code
          </button>
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
