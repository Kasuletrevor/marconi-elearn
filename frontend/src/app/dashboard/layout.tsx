"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  Bell,
  Check,
} from "lucide-react";
import { auth, notifications, ApiError, type User as UserType, type Notification } from "@/lib/api";
import { useAuthStore, getRedirectPath } from "@/lib/store";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/* ============================================
   NOTIFICATION BELL COMPONENT
   ============================================ */

function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notificationList, setNotificationList] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fetch notifications on mount and periodically
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
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
    try {
      const [all, unread] = await Promise.all([
        notifications.list({ limit: 10 }),
        notifications.list({ unread_only: true, limit: 50 }),
      ]);
      setNotificationList(all);
      setUnreadCount(unread.length);
    } catch (err) {
      // Silently fail for notifications
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
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] rounded-lg transition-colors"
        aria-label="Notifications"
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

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
              <div className="flex items-center justify-between">
                <h3 className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)]">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {unreadCount} unread
                  </span>
                )}
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-80 overflow-y-auto">
              {notificationList.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 mx-auto text-[var(--muted-foreground)] opacity-50 mb-2" />
                  <p className="text-sm text-[var(--muted-foreground)]">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {notificationList.map((notification) => (
                    <motion.button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      disabled={isLoading}
                      whileHover={{ backgroundColor: "var(--background)" }}
                      className={`w-full px-4 py-3 text-left transition-colors ${notification.read_at === null ? "bg-[var(--primary)]/5" : ""
                        } disabled:opacity-50`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.kind)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm truncate ${notification.read_at === null
                                ? "font-semibold text-[var(--foreground)]"
                                : "font-medium text-[var(--foreground)]"
                                }`}
                            >
                              {notification.title}
                            </p>
                            {notification.read_at === null && (
                              <span className="flex-shrink-0 w-2 h-2 mt-1.5 bg-[var(--primary)] rounded-full" />
                            )}
                          </div>
                          <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mt-0.5">
                            {notification.body || ""}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-1 opacity-70">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </motion.button>
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

const sidebarLinks = [
  { href: "/dashboard", label: "My Courses", icon: BookOpen },
  { href: "/dashboard/submissions", label: "Submissions", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    viewAsStudent,
    setUser,
    enterStudentView,
    exitStudentView,
    logout: logoutStore,
    isLoading,
    setLoading,
  } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          if (params.get("view") === "student") {
            enterStudentView();
          }
        }

        const currentUser = await auth.me();
        setUser(currentUser);

        const primaryPath = getRedirectPath(currentUser);
        if (!viewAsStudent && primaryPath !== "/dashboard") {
          router.replace(primaryPath);
          return;
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          logoutStore();
          router.push("/login");
        }
      }
    }

    checkAuth();
  }, [setUser, logoutStore, router, enterStudentView, viewAsStudent]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await auth.logout();
    } catch {
      // Ignore errors, still logout locally
    }
    logoutStore();
    router.push("/login");
  };

  // Show loading state
  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-lg bg-[var(--primary)] flex items-center justify-center animate-pulse">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <p className="text-[var(--muted-foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Hard-redirect unless user explicitly entered Student View
  if (user) {
    const primaryPath = getRedirectPath(user);
    if (!viewAsStudent && primaryPath !== "/dashboard") {
      return null;
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/95 backdrop-blur-md border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Marconi
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-[var(--foreground)] hover:bg-[var(--card)] rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 z-50 bg-black/50"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[var(--background)] border-r border-[var(--border)] overflow-y-auto"
            >
              <SidebarContent
                pathname={pathname}
                user={user}
                onLogout={handleLogout}
                isLoggingOut={isLoggingOut}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-[var(--card)] border-r border-[var(--border)] overflow-y-auto">
        <SidebarContent
          pathname={pathname}
          user={user}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

interface SidebarContentProps {
  pathname: string;
  user: UserType | null;
  onLogout: () => void;
  isLoggingOut: boolean;
  onClose?: () => void;
}

function SidebarContent({
  pathname,
  user,
  onLogout,
  isLoggingOut,
  onClose,
}: SidebarContentProps) {
  const router = useRouter();
  const { viewAsStudent, exitStudentView } = useAuthStore();
  const primaryPath = user ? getRedirectPath(user) : "/dashboard";

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 flex items-center justify-between border-b border-[var(--border)]">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <div className="w-10 h-10 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
            Marconi
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {/* Desktop notification bell - hidden on mobile since it's in the header */}
          <div className="hidden lg:block">
            <NotificationBell />
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {sidebarLinks.map((link) => {
          const isActive =
            link.href === "/dashboard"
              ? pathname === "/dashboard" ||
              pathname.startsWith("/dashboard/courses") ||
              pathname.startsWith("/dashboard/join")
              : pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                }`}
            >
              <link.icon className="w-5 h-5" />
              <span className="font-medium">{link.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
            <User className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)] truncate">
              {user?.email || "Loading..."}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {viewAsStudent ? "Student View" : "Student"}
            </p>
          </div>
        </div>

        {viewAsStudent && primaryPath !== "/dashboard" && (
          <button
            onClick={() => {
              exitStudentView();
              router.push(primaryPath);
            }}
            className="w-full mb-2 flex items-center gap-3 px-4 py-3 text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-xl transition-all"
          >
            <GraduationCap className="w-5 h-5" />
            <span className="font-medium">Exit Student View</span>
          </button>
        )}

        <button
          onClick={onLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-[var(--secondary)] hover:bg-[var(--secondary)]/10 rounded-xl transition-all disabled:opacity-50"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{isLoggingOut ? "Signing out..." : "Sign out"}</span>
        </button>
      </div>
    </div>
  );
}
