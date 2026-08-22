/** Platform login page. */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Input, Button, Card } from "@/lib/components/ui";
import { authApi } from "@/lib/api/auth";
import { authStore } from "@/lib/store/auth";
import { tenantStore } from "@/lib/store/tenant";
import { applyTenantTheme } from "@/lib/themes/utils";
import { uiStore } from "@/lib/store/ui";
import { seedDemoData, DEMO_ACCOUNTS } from "@/lib/api/seed";

export const Route = createFileRoute("/_platform/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — HRMS" },
      { name: "description", content: "Sign in to your HRMS workspace, or explore a demo role." },
      { property: "og:title", content: "Sign in — HRMS" },
      { property: "og:description", content: "Sign in to your HRMS workspace, or explore a demo role." },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    seedDemoData();
    if (typeof window !== "undefined" && window.localStorage.getItem("hrms.auth")) {
      navigate({ to: "/dashboard" });
    }
  }, [navigate]);

  const signIn = async (mail: string, pass: string) => {
    setError(null);
    setLoading(true);
    const res = await authApi.login(mail, pass);
    setLoading(false);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "Incorrect email or password.");
      return;
    }
    tenantStore.setTenant(res.data.tenant);
    applyTenantTheme(res.data.tenant.theme);
    authStore.signIn(res.data.user, res.data.token);
    navigate({ to: "/dashboard" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <h1 className="text-[32px] font-semibold tracking-[-0.01em]">Welcome back.</h1>
        <p className="mt-1 text-[14px] text-[#6B6B6B]">Sign in to your workspace.</p>

        <div 
          onClick={() => {
            setEmail("admin@example.com");
            setPassword("admin123");
            void signIn("admin@example.com", "admin123");
          }}
          className="mt-5 rounded-lg border border-[#E5E5E3] bg-[#FAFAF8] px-4 py-3 text-[13px] text-[#6B6B6B] cursor-pointer hover:border-[#F97316] hover:bg-[#FFF7ED] transition duration-150 group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setEmail("admin@example.com");
              setPassword("admin123");
              void signIn("admin@example.com", "admin123");
            }
          }}
        >
          <p>
            <span className="font-semibold text-[#0A0A0A] group-hover:text-[#EA580C]">Quick demo sign-in:</span> Click here to auto-fill and log in with <code className="bg-[#E5E5E3] group-hover:bg-[#FFEDD5] px-1.5 py-0.5 rounded text-[#0A0A0A] font-mono">admin@example.com</code> / <code className="bg-[#E5E5E3] group-hover:bg-[#FFEDD5] px-1.5 py-0.5 rounded text-[#0A0A0A] font-mono">admin123</code>.
          </p>
        </div>



        <form onSubmit={submit} noValidate className="mt-6 space-y-5">
          <Input
            label="Work email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="text-right">
            <button
              type="button"
              onClick={() => uiStore.pushToast({ message: "Coming soon", variant: "info" })}
              className="text-[13px] text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          {error && (
            <p role="alert" aria-live="polite" className="text-[13px] text-[#DC2626] text-center">
              {error}
            </p>
          )}
        </form>
        <p className="mt-8 text-center text-[13px] text-[#6B6B6B]">
          New company?{" "}
          <Link to="/onboarding" className="text-[#0A0A0A] underline underline-offset-4">
            Set up your workspace →
          </Link>
        </p>
      </Card>
    </div>
  );
}