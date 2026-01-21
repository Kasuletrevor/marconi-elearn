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
  Code,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { auth, ApiError, type User as UserType } from "@/lib/api";
import { useAuthStore, getRedirectPath } from "@/lib/store";

interface DashboardLayoutProps {
  children: React.ReactNode;
}
const sidebarLinks = [
  { href: "/dashboard", label: "My Courses", icon: BookOpen },
  { href: "/playground", label: "Playground", icon: Code },
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
    logout: logoutStore,
    isLoading,
  } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

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
      } finally {
        setHasCheckedAuth(true);
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

  const notificationsEnabled = Boolean(user) && hasCheckedAuth;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/95 backdrop-blur-md border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold">
              Marconi
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell enabled={notificationsEnabled} />
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
                notificationsEnabled={notificationsEnabled}
                onLogout={handleLogout}
                isLoggingOut={isLoggingOut}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-[var(--card)] border-r border-[var(--border)]">
        <SidebarContent
          pathname={pathname}
          user={user}
          notificationsEnabled={notificationsEnabled}
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
  notificationsEnabled: boolean;
  onLogout: () => void;
  isLoggingOut: boolean;
  onClose?: () => void;
}

function SidebarContent({
  pathname,
  user,
  notificationsEnabled,
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
          <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--foreground)]">
            Marconi
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {/* Desktop notification bell - hidden on mobile since it's in the header */}
          <div className="hidden lg:block">
            <NotificationBell enabled={notificationsEnabled} align="left" />
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
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
