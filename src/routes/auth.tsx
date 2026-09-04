import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Loader2, LockKeyhole, Mail, Store } from "lucide-react";
import { toast } from "sonner";

import { ensureSalonWorkspace } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Salon Sign In — SalonOS" },
      { name: "description", content: "Sign in or create your own salon workspace on SalonOS." },
      { property: "og:title", content: "Salon Sign In — SalonOS" },
      { property: "og:description", content: "Access your salon POS and bookings dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [salonName, setSalonName] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const setupWorkspace = useServerFn(ensureSalonWorkspace);

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
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          toast.success("Account created. Please sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }

      const workspace = await setupWorkspace({
        data: { salonName: salonName.trim() || null },
      });
      if (workspace?.created) {
        toast.success(`${workspace.salon?.name} workspace is ready`);
      }
      navigate({ to: "/admin", replace: true });
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
            <p className="font-display text-xl font-semibold">SalonOS</p>
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              Salon control room
            </p>
          </div>
        </div>

        <div className="mt-7 flex gap-1 rounded-full bg-white/5 p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <h1 className="mt-5 font-display text-3xl font-semibold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to manage bookings, billing and analytics."
            : "The first account becomes the salon owner."}
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

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "signin"
            ? "New here? Use Sign up to create the owner account."
            : "Extra staff accounts need owner approval before access."}
        </p>
      </div>
    </div>
  );
}
