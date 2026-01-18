"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check } from "lucide-react";
import { ApiError, notifications, type Notification } from "@/lib/api";
import { reportError } from "@/lib/reportError";

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
  const [errorMessage, setErrorMessage] = useState<string>("");
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);

  const portalTarget = useMemo(() => {
    if (typeof document === "undefined") return null;
    return document.body;
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!enabled || isDisabled) return;
    setErrorMessage("");
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
      setErrorMessage("Failed to load notifications.");
      reportError("Failed to fetch notifications", err);
    }
  }, [enabled, isDisabled]);

  useEffect(() => {
    if (!enabled || isDisabled) return;
    void fetchNotifications();
    const interval = setInterval(() => void fetchNotifications(), 60000);       
    return () => clearInterval(interval);
  }, [enabled, fetchNotifications, isDisabled]);

  const computePanelPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const margin = 8;
    const panelWidth = 320; // matches w-80

    let left = align === "left" ? rect.left : rect.right - panelWidth;
    left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));

    let top = rect.bottom + margin;

    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    if (panelHeight > 0 && top + panelHeight > window.innerHeight - margin) {
      top = rect.top - panelHeight - margin;
      top = Math.max(margin, top);
    }

    setPanelPos({ top, left });
  }, [align]);

  useEffect(() => {
    if (!isOpen) return;
    computePanelPosition();

    const onResize = () => computePanelPosition();
    const onScroll = () => computePanelPosition();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [computePanelPosition, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (panelRef.current && panelRef.current.contains(target)) return;
      if (isOpen) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);



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
      setErrorMessage("Failed to update notification.");
      reportError("Failed to mark notification as read", err);
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
    <div className="relative">
      <button
        ref={buttonRef}
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

      {portalTarget
        ? createPortal(
            <AnimatePresence>
              {isOpen && panelPos && (
                <motion.div
                  ref={panelRef}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{ top: panelPos.top, left: panelPos.left }}
                  className="fixed w-80 bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-xl z-[100] overflow-hidden"
                >
                  <div className="p-4 border-b border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-[var(--foreground)]">
                        Notifications
                      </h3>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {unreadCount} unread
                      </span>
                    </div>
                    {errorMessage ? (
                      <p className="text-xs text-[var(--secondary)] mt-2">
                        {errorMessage}
                      </p>
                    ) : null}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notificationList.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-3" />
                        <p className="text-sm text-[var(--muted-foreground)]">
                          No notifications yet
                        </p>
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
                              <div className="mt-0.5">
                                {getNotificationIcon(notification.kind)}
                              </div>
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
                                    <span className="text-xs text-[var(--primary)]">
                                      New
                                    </span>
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
            </AnimatePresence>,
            portalTarget
          )
        : null}
    </div>
  );
}
