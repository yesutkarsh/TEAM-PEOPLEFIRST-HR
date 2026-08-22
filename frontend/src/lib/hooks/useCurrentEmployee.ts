/** Resolves the signed-in user to a seeded employee record (frontend-only mock). */
import { useEffect, useState } from "react";
import { listEmployees } from "@/lib/api/employees";
import { authStore } from "@/lib/store/auth";
import type { Employee } from "@/lib/types/employee";

export function useCurrentEmployee() {
  const user = authStore.useSelector((s) => s.user);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await listEmployees();
      if (!alive) return;
      const list = res.data ?? [];
      setEmployee(list.find((e) => e.workEmail === user?.email) ?? list[0] ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user?.email]);

  return { employee, loading };
}