"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/cognito";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    getSession().then((session) => {
      if (session?.isValid()) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    });
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Chargement...</div>
    </div>
  );
}
