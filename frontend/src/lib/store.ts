import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "./api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  viewAsStudent: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  enterStudentView: () => void;
  exitStudentView: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      viewAsStudent: false,
      setUser: (user) => set({ user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      enterStudentView: () => set({ viewAsStudent: true }),
      exitStudentView: () => set({ viewAsStudent: false }),
      logout: () => set({ user: null, isLoading: false, viewAsStudent: false }),
    }),
    {
      name: "marconi-auth",
      partialize: (state) => ({ user: state.user, viewAsStudent: state.viewAsStudent }),
    }
  )
);

/**
 * Determines the appropriate redirect path based on user's roles.
 * Priority: superadmin > org admin > course staff > student
 */
export function getRedirectPath(user: User): string {
  // Superadmin -> platform ops dashboard
  if (user.is_superadmin) {
    return "/superadmin";
  }

  // Org admin -> organization management dashboard
  if (user.org_admin_of.length > 0) {
    return "/admin";
  }

  // Course staff (owner, co_lecturer, ta) -> staff dashboard
  const staffRoles = ["owner", "co_lecturer", "ta"];
  const hasStaffRole = user.course_roles.some((cr) =>
    staffRoles.includes(cr.role)
  );
  if (hasStaffRole) {
    return "/staff";
  }

  // Default: student dashboard
  return "/dashboard";
}

/**
 * Check if user has any staff role (owner, co_lecturer, ta) for any course
 */
export function isStaff(user: User | null): boolean {
  if (!user) return false;
  const staffRoles = ["owner", "co_lecturer", "ta"];
  return user.course_roles.some((cr) => staffRoles.includes(cr.role));
}

/**
 * Check if user is org admin for any organization
 */
export function isOrgAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.org_admin_of.length > 0;
}

/**
 * Check if user is superadmin
 */
export function isSuperadmin(user: User | null): boolean {
  if (!user) return false;
  return user.is_superadmin;
}

/**
 * Get all course IDs where user has a staff role
 */
export function getStaffCourseIds(user: User | null): number[] {
  if (!user) return [];
  const staffRoles = ["owner", "co_lecturer", "ta"];
  return user.course_roles
    .filter((cr) => staffRoles.includes(cr.role))
    .map((cr) => cr.course_id);
}

/**
 * Get user's role for a specific course
 */
export function getCourseRole(
  user: User | null,
  courseId: number
): "owner" | "co_lecturer" | "ta" | "student" | null {
  if (!user) return null;
  const courseRole = user.course_roles.find((cr) => cr.course_id === courseId);
  return courseRole?.role ?? null;
}
