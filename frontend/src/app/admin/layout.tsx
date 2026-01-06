"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Building2,
  Users,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  ClipboardList,
} from "lucide-react";
import { auth, ApiError } from "@/lib/api";
import { useAuthStore, getRedirectPath, isOrgAdmin } from "@/lib/store";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const sidebarLinks = [
  { href: "/admin", label: "Overview", icon: Building2 },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/audit", label: "Activity Log", icon: ClipboardList },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, logout: logoutStore, isLoading } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check auth and role on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await auth.me();
        setUser(currentUser);
        
        // Redirect if not org admin
        if (!isOrgAdmin(currentUser)) {
          router.push(getRedirectPath(currentUser));
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          logoutStore();
          router.push("/login");
        }
      }
    }

    checkAuth();
  }, [setUser, logoutStore, router]);

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

  // Show loading state or redirect if not authorized
  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-lg bg-[var(--primary)] flex items-center justify-center animate-pulse">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <p className="text-[var(--muted-foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (user && !isOrgAdmin(user)) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/95 backdrop-blur-md border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Admin
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-[var(--foreground)] hover:bg-[var(--card)] rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
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
  user: { id: number; email: string } | null;
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
  const { enterStudentView } = useAuthStore();
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 flex items-center justify-between border-b border-[var(--border)]">
        <Link href="/admin" className="flex items-center gap-3" onClick={onClose}>
          <div className="w-10 h-10 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] block">
              Marconi
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">
              Organization Admin
            </span>
          </div>
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

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href || 
            (link.href !== "/admin" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
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

        {/* Quick Link to Student View */}
        <div className="pt-4 mt-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => {
              enterStudentView();
              onClose?.();
              router.push("/dashboard");
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--background)] hover:text-[var(--foreground)] transition-all"
          >
            <GraduationCap className="w-5 h-5" />
            <span className="font-medium">Student View</span>
          </button>
        </div>
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
            <p className="text-xs text-[var(--muted-foreground)]">Org Admin</p>
          </div>
        </div>
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
