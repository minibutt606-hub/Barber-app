import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Crown, Loader2, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { SALON } from "@/lib/salon";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff Sign In — Paragon Barber" },
      { name: "description", content: "Secure sign in for Paragon Barber salon staff." },
      { property: "og:title", content: "Staff Sign In — Paragon Barber" },
      { property: "og:description", content: "Access the salon POS and bookings dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Account created. You can sign in now.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate({ to: "/admin", replace: true });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="glass-strong w-full max-w-md rounded-3xl p-8">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15">
            <Crown className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold">{SALON.name}</p>
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              Salon control room
            </p>
          </div>
        </div>

        <h1 className="mt-7 font-display text-3xl font-semibold">
          {mode === "signin" ? "Welcome back" : "Create staff access"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to manage bookings, billing and analytics."
            : "Register the salon's admin account to get started."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <div className="mt-1 flex items-center gap-2 rounded-2xl bg-white/5 px-4 focus-within:ring-1 focus-within:ring-primary/60">
              <Mail className="size-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@paragonbarber.pk"
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Password</label>
            <div className="mt-1 flex items-center gap-2 rounded-2xl bg-white/5 px-4 focus-within:ring-1 focus-within:ring-primary/60">
              <LockKeyhole className="size-4 text-muted-foreground" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          {mode === "signin"
            ? "First time here? Create the salon account"
            : "Already registered? Sign in"}
        </button>
      </div>
    </div>
  );
}
