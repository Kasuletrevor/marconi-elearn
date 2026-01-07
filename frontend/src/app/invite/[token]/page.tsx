"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Building2,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { auth, invites, ApiError, type InvitePreview } from "@/lib/api";
import { useAuthStore, getRedirectPath } from "@/lib/store";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = use(params);
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [inviteInfo, setInviteInfo] = useState<InvitePreview | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    async function fetchInviteInfo() {
      try {
        const info = await invites.preview(token);
        setInviteInfo(info);
      } catch (err) {
        if (err instanceof ApiError) {
          setInviteError(err.detail);
        } else {
          setInviteError("Failed to load invite information");
        }
      } finally {
        setIsFetching(false);
      }
    }

    fetchInviteInfo();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const user = await auth.acceptInvite({ token, password });
      setUser(user);
      router.push(getRedirectPath(user));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isFetching) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin mx-auto mb-4" />
          <p className="text-[var(--muted-foreground)]">Loading invite...</p>
        </motion.div>
      </div>
    );
  }

  // Invalid/expired/used invite
  if (inviteError || (inviteInfo && inviteInfo.status !== "valid")) {
    const message =
      inviteError ||
      (inviteInfo?.status === "expired"
        ? "This invite has expired."
        : "This invite has already been used.");
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--secondary)]/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-[var(--secondary)]" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)] mb-3">
            Invalid Invite
          </h1>
          <p className="text-[var(--muted-foreground)] mb-8">{message}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-medium rounded-xl hover:bg-[var(--primary-hover)] transition-colors"
          >
            Go to Home
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  const isCourseInvite = inviteInfo?.course_id != null;

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--primary)] relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[var(--secondary)]/10 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `linear-gradient(white 1px, transparent 1px),
                                linear-gradient(90deg, white 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
                Marconi
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-white leading-tight mb-4">
              You&apos;re invited to
              <br />
              {isCourseInvite ? "join a course." : "join the staff team."}
            </h1>

            <p className="text-white/60 text-lg max-w-md">
              {isCourseInvite
                ? "Set up your password to complete your enrollment and start learning."
                : "Set up your password to activate your staff account and start managing courses."}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <motion.div variants={fadeInUp} className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
                Marconi
              </span>
            </Link>
          </motion.div>

          {/* Invite Info Card */}
          {inviteInfo && (
            <motion.div
              variants={fadeInUp}
              className="mb-8 p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                  {isCourseInvite ? (
                    <BookOpen className="w-5 h-5 text-[var(--primary)]" />
                  ) : (
                    <Building2 className="w-5 h-5 text-[var(--primary)]" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">
                    {isCourseInvite
                      ? "You're being enrolled in"
                      : "You're being added to"}
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)]">
                    {isCourseInvite
                      ? inviteInfo.course_title || "A course"
                      : inviteInfo.organization_name || "an organization"}
                  </p>
                  {isCourseInvite && inviteInfo.organization_name && (
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                      {inviteInfo.organization_name}
                    </p>
                  )}
                  {isCourseInvite && inviteInfo.course_code && (
                    <p className="mt-2 inline-flex items-center rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)]">
                      {inviteInfo.course_code}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                <span className="text-sm text-[var(--muted-foreground)]">
                  Invite ready to activate
                </span>
              </div>
            </motion.div>
          )}

          {/* Header */}
          <motion.div variants={fadeInUp} className="mb-6">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)] mb-2">
              Set your password
            </h2>
            <p className="text-[var(--muted-foreground)]">
              Create a secure password to complete your account setup
            </p>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-lg"
            >
              <p className="text-sm text-[var(--secondary)]">{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <motion.form variants={fadeInUp} onSubmit={handleSubmit} className="space-y-5">
            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--foreground)] mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full pl-12 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[var(--foreground)] mb-2"
              >
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                  className="w-full pl-12 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--primary)] text-white font-medium rounded-xl hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Complete Setup
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.form>

          {/* Footer */}
          <motion.div variants={fadeInUp} className="mt-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              Already have an account?{" "}
              <Link href="/login" className="text-[var(--primary)] hover:underline">
                Sign in
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
