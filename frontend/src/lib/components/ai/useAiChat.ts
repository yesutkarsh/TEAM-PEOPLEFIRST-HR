/** Shared chat session state for the panel and the full AI Assistant page. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { aiApi } from "@/lib/api/ai";
import { authStore } from "@/lib/store/auth";
import { useCurrentEmployee } from "@/lib/hooks/useCurrentEmployee";
import type { AiChatSession } from "@/lib/types/ai";

export function useAiChat(active: boolean) {
  const user = authStore.useSelector((s) => s.user);
  const { employee } = useCurrentEmployee();
  const route = useRouterState({ select: (s) => s.location.pathname });

  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<AiChatSession | null>(null);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const employeeId = employee?.id ?? "unassigned";

  const refreshSessions = useCallback(async () => {
    const res = await aiApi.listSessions(employeeId);
    setSessions(res.data ?? []);
    return res.data ?? [];
  }, [employeeId]);

  useEffect(() => {
    if (!active || !employee) return;
    let alive = true;
    void (async () => {
      const list = await refreshSessions();
      if (!alive) return;
      if (list.length > 0) {
        setActiveSession(list[0]);
      } else {
        const created = await aiApi.createSession(employeeId);
        if (created.data && alive) {
          setActiveSession(created.data);
          void refreshSessions();
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, employee]);

  const selectSession = useCallback(async (id: string) => {
    const res = await aiApi.getSession(id);
    if (res.data) setActiveSession(res.data);
  }, []);

  const newSession = useCallback(async () => {
    const res = await aiApi.createSession(employeeId);
    if (res.data) {
      setActiveSession(res.data);
      void refreshSessions();
    }
  }, [employeeId, refreshSessions]);

  const clearConversation = useCallback(async () => {
    const res = await aiApi.clearSession(employeeId);
    if (res.data) {
      setActiveSession(res.data);
      void refreshSessions();
    }
  }, [employeeId, refreshSessions]);

  const send = useCallback(
    async (text: string) => {
      if (!activeSession) return;
      setSending(true);
      const res = await aiApi.sendMessage(activeSession.id, text, { route, role: user?.role ?? "employee" });
      setSending(false);
      if (res.error?.message === "rate_limited") {
        setCooldown(true);
        if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
        cooldownTimer.current = setTimeout(() => setCooldown(false), 1500);
        return;
      }
      if (res.data) {
        setActiveSession(res.data);
        void refreshSessions();
      }
    },
    [activeSession, route, user?.role, refreshSessions],
  );

  const setFeedback = useCallback(
    async (messageId: string, value: "helpful" | "not_helpful" | null) => {
      if (!activeSession) return;
      const res = await aiApi.setFeedback(activeSession.id, messageId, value);
      if (res.data) setActiveSession(res.data);
    },
    [activeSession],
  );

  return {
    role: user?.role ?? "employee",
    sessions,
    activeSession,
    sending,
    cooldown,
    selectSession,
    newSession,
    clearConversation,
    send,
    setFeedback,
  };
}
