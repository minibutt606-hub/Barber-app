import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Loader2, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAccess, requestAccess } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Management Sign In — Paragon Salon" },
    { name: "description", content: "Sign in or request a Paragon Salon management account." },
    { property: "og:title", content: "Management Sign In — Paragon Salon" },
    { property: "og:description", content: "Secure staff access for Paragon Salon." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const checkAccess = useServerFn(getAccess);
  const sendRequest = useServerFn(requestAccess);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      const access = await checkAccess();
      if (!active) return;
      if (access.allowed) { navigate({ to: "/admin", replace: true }); }
      else setSignedIn(true);
    }).catch(() => {});
    return () => { active = false; };
  }, [navigate, checkAccess]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const access = await checkAccess();
      if (access.allowed) { navigate({ to: "/admin", replace: true }); return; }
      const request = await sendRequest();
      setSignedIn(true);
      setNotice(request.status === "rejected" ? "Access has not been granted. Please contact the salon manager." : "Your request is awaiting approval from the salon manager.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed");
    } finally { setLoading(false); }
  }

  return <div className="flex min-h-screen items-center justify-center px-5 py-10">
    <div className="glass-strong w-full max-w-md rounded-lg p-7 sm:p-9">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-md bg-primary/15"><Crown className="size-5 text-primary" /></div>
        <div><p className="font-display text-2xl font-semibold">Paragon Salon</p><p className="text-xs text-muted-foreground">Management access</p></div>
      </div>
      {signedIn ? <div className="mt-8 space-y-5">
        <h1 className="font-display text-3xl font-semibold">Access pending</h1>
        <p className="text-sm text-muted-foreground">{notice || "Your account needs approval from the salon manager."}</p>
        <Button variant="outline" className="w-full" onClick={async () => { await supabase.auth.signOut(); setSignedIn(false); setNotice(""); }}>Sign out</Button>
      </div> : <>
        <h1 className="mt-8 font-display text-3xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your Paragon Salon account.</p>
        {notice && <p className="mt-5 rounded-md bg-accent p-3 text-sm text-accent-foreground" role="status">{notice}</p>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-medium text-muted-foreground">Email
            <span className="mt-1 flex items-center gap-2 rounded-md border border-input bg-background px-4 focus-within:ring-1 focus-within:ring-ring"><Mail className="size-4" /><input type="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-transparent py-3 text-sm text-foreground outline-none" /></span>
          </label>
          <label className="block text-xs font-medium text-muted-foreground">Password
            <span className="mt-1 flex items-center gap-2 rounded-md border border-input bg-background px-4 focus-within:ring-1 focus-within:ring-ring"><LockKeyhole className="size-4" /><input type="password" required maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className="w-full bg-transparent py-3 text-sm text-foreground outline-none" /></span>
          </label>
          <Button type="submit" disabled={loading} className="h-11 w-full">{loading && <Loader2 className="size-4 animate-spin" />}Sign in</Button>
        </form>
      </>}
    </div>
  </div>;
}
