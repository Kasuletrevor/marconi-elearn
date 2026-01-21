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
    <div className="min-h-screen bg-[var(--background)] relative">
      {/* Background patterns */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `linear-gradient(var(--primary) 1px, transparent 1px),
                            linear-gradient(90deg, var(--primary) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-[var(--primary)] flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold">
              Marconi.
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell enabled={notificationsEnabled} />
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-[var(--foreground)] hover:bg-[var(--card)] border border-transparent hover:border-[var(--border)] rounded-sm transition-all"
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
              className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
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
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white border-r border-[var(--border)] z-10">
        <SidebarContent
          pathname={pathname}
          user={user}
          notificationsEnabled={notificationsEnabled}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen relative z-0">
        <div className="p-6 lg:p-10">{children}</div>
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
    <div className="flex flex-col h-full relative">
      {/* Archival metadata at top */}
      <div className="absolute top-0 right-0 p-2 font-[family-name:var(--font-mono)] text-[8px] text-[var(--primary)]/20 uppercase tracking-tighter select-none pointer-events-none">
        Ref: PORTAL-26
      </div>

      {/* Logo */}
      <div className="p-8 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <div className="w-9 h-9 bg-[var(--primary)] flex items-center justify-center rounded-sm transition-transform hover:rotate-6">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)] tracking-tight">
              Marconi<span className="text-[var(--primary)]">.</span>
            </span>
          </Link>
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
      <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
        <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest mb-4 px-2">
          Main Console
        </div>
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
              className={`flex items-center gap-4 px-4 py-3 rounded-sm transition-all border ${isActive
                ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--background)] hover:text-[var(--foreground)] border-transparent"
                }`}
            >
              <link.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[var(--primary)]/60"}`} />
              <span className={`text-sm tracking-tight ${isActive ? "font-bold" : "font-medium"}`}>
                {link.label.toUpperCase()}
              </span>
              {isActive && <div className="w-1 h-1 bg-white rounded-full ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-6 border-t border-[var(--border)] bg-[var(--background)]/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 border border-[var(--border)] bg-white flex items-center justify-center rounded-sm">
            <User className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)] uppercase tracking-tighter">
              Session_User
            </p>
            <p className="text-sm font-bold text-[var(--foreground)] truncate leading-none mt-1">
              {user?.email?.split('@')[0] || "Loading..."}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          {viewAsStudent && primaryPath !== "/dashboard" && (
            <button
              onClick={() => {
                exitStudentView();
                router.push(primaryPath);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-[var(--primary)] hover:bg-white border border-transparent hover:border-[var(--primary)]/20 rounded-sm transition-all text-xs font-bold font-[family-name:var(--font-mono)] uppercase tracking-widest"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Exit View</span>
            </button>
          )}

          <button
            onClick={onLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-[var(--muted-foreground)] hover:text-[var(--secondary)] hover:bg-white border border-transparent hover:border-[var(--secondary)]/20 rounded-sm transition-all text-xs font-bold font-[family-name:var(--font-mono)] uppercase tracking-widest disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoggingOut ? "Ending..." : "Disconnect"}</span>
          </button>
        </div>
        
        {/* Version label */}
        <div className="mt-6 text-center">
          <span className="font-[family-name:var(--font-mono)] text-[8px] text-[var(--muted-foreground)]/40 uppercase">
            Build: 2026.01.21-R3
          </span>
        </div>
      </div>
    </div>
  );
}
