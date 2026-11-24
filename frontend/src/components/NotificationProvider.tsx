import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Notice } from "../services/api";

type NotificationContextValue = {
  items: Notice[];
  unread: number;
  loaded: boolean;
  error: string;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const result = await api.notifications();
      setItems(result.items);
      setUnread(result.unread);
      setError("");
      setLoaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر جلب الإشعارات");
    }
  }, []);

  useEffect(() => {
    let active = true;
    let working = false;
    const poll = async () => {
      if (!active || working || document.visibilityState !== "visible") return;
      working = true;
      try {
        const result = await api.notifications();
        if (!active) return;
        setItems(result.items);
        setUnread(result.unread);
        setError("");
        setLoaded(true);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "تعذر جلب الإشعارات");
      } finally {
        working = false;
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 45_000);
    document.addEventListener("visibilitychange", poll);
    window.addEventListener("focus", poll);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
      window.removeEventListener("focus", poll);
    };
  }, []);

  const markRead = useCallback(async (id: string) => {
    await api.notificationRead(id);
    setItems((current) => current.map((item) => item.id === id && !item.read_at
      ? { ...item, read_at: new Date().toISOString() }
      : item));
    setUnread((current) => Math.max(0, current - 1));
  }, []);

  const value = useMemo(() => ({ items, unread, loaded, error, refresh, markRead }),
    [items, unread, loaded, error, refresh, markRead]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotifications must be used inside NotificationProvider");
  return value;
}

export function NotificationBadge({ className = "" }: { className?: string }) {
  const { unread } = useNotifications();
  if (!unread) return null;
  return <span className={`notification-badge ${className}`} aria-label={`${unread} إشعار غير مقروء`}>
    {unread > 99 ? "99+" : unread}
  </span>;
}
