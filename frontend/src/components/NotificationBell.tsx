"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check } from "lucide-react";
import { ApiError, notifications, type Notification } from "@/lib/api";

export function NotificationBell({
  enabled,
  align = "right",
}: {
  enabled: boolean;
  align?: "left" | "right";
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notificationList, setNotificationList] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || isDisabled) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isDisabled]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchNotifications() {
    if (!enabled || isDisabled) return;
    try {
      const [all, unread] = await Promise.all([
        notifications.list({ limit: 10 }),
        notifications.list({ unread_only: true, limit: 50 }),
      ]);
      setNotificationList(all);
      setUnreadCount(unread.length);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setIsDisabled(true);
        setNotificationList([]);
        setUnreadCount(0);
        return;
      }
      console.error("Failed to fetch notifications:", err);
    }
  }

  async function handleNotificationClick(notification: Notification) {
    setIsLoading(true);
    try {
      if (notification.read_at === null) {
        const updated = await notifications.markRead(notification.id);
        setNotificationList((prev) => prev.map((n) => (n.id === notification.id ? updated : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      if (notification.link_url) {
        setIsOpen(false);
        router.push(notification.link_url);
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function getNotificationIcon(kind: Notification["kind"]) {
    switch (kind) {
      case "submission_graded":
        return <Check className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-[var(--muted-foreground)]" />;
    }
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] rounded-lg transition-colors"
        aria-label="Notifications"
        disabled={!enabled || isDisabled}
        title={!enabled ? "Notifications loading..." : isDisabled ? "Notifications disabled" : "Notifications"}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[var(--secondary)] text-white text-xs font-medium rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute ${align === "left" ? "left-0" : "right-0"} mt-2 w-80 bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-xl z-50 overflow-hidden`}
          >
            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--foreground)]">Notifications</h3>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {unreadCount} unread
                </span>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notificationList.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--muted-foreground)]">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {notificationList.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      disabled={isLoading}
                      className={`w-full p-4 text-left hover:bg-[var(--card)] transition-colors ${
                        notification.read_at === null ? "bg-[var(--primary)]/5" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">{getNotificationIcon(notification.kind)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-[var(--foreground)] truncate">
                              {notification.title}
                            </p>
                            <span className="text-xs text-[var(--muted-foreground)] flex-shrink-0">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                          {notification.body && (
                            <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">
                              {notification.body}
                            </p>
                          )}
                          {notification.read_at === null && (
                            <div className="mt-2 flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full" />
                              <span className="text-xs text-[var(--primary)]">New</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
