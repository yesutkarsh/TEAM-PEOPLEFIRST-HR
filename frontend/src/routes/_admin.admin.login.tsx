import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, Input, Button } from "@/lib/components/ui";
import { adminApi, SUPER_ADMIN_CREDS } from "@/lib/api/admin";
import { adminAuthStore } from "@/lib/store/auth";

export const Route = createFileRoute("/_admin/admin/login")({
  component: AdminLogin,
  head: () => ({ meta: [{ title: "Admin Login — HRMS" }] }),
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (adminAuthStore.isAuthenticated) navigate({ to: "/admin/dashboard" });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await adminApi.login(email, password);
    setLoading(false);
    if (res.error || !res.data) { setError(res.error?.message ?? "Login failed."); return; }
    adminAuthStore.signIn(res.data.name, res.data.token);
    navigate({ to: "/admin/dashboard" });
  };

  const fillDemo = () => { setEmail(SUPER_ADMIN_CREDS.email); setPassword(SUPER_ADMIN_CREDS.password); setError(null); };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">HRMS Platform</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-[-0.01em]">Admin sign in.</h1>
        <p className="mt-1 text-[14px] text-[#6B6B6B]">Internal platform access only.</p>
        <form onSubmit={submit} noValidate className="mt-8 space-y-5">
          <div className="rounded-sm border border-dashed border-[#E5E5E3] bg-[#FAFAF8] p-3 text-[12px] text-[#6B6B6B] flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#0A0A0A]">Demo platform admin</p>
              <p className="mt-0.5">
                <code className="font-mono">{SUPER_ADMIN_CREDS.email}</code> · <code className="font-mono">{SUPER_ADMIN_CREDS.password}</code>
              </p>
            </div>
            <button type="button" onClick={fillDemo} className="shrink-0 text-[12px] font-semibold text-[#0A0A0A] underline underline-offset-4 hover:text-[#F97316] transition-colors">
              Use demo
            </button>
          </div>
          <Input label="Platform email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full" loading={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
          {error && <p role="alert" className="text-[13px] text-[#DC2626] text-center">{error}</p>}
        </form>
      </Card>
    </div>
  );
}
