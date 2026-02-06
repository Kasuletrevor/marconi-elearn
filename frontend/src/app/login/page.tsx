"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Code2,
  Users,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { auth, ApiError } from "@/lib/api";
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

const loginCodePreview = [
  "#include <iostream>",
  "int main() {",
  "  std::cout << \"Marconi\";",
  "  return 0;",
  "}",
];

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const user = await auth.login({ email, password });
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

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Left Panel - Decorative */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[var(--primary)] via-[#11487E] to-[#0A2B4A] lg:flex lg:w-1/2">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute -left-20 top-1/4 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -right-20 bottom-1/4 h-96 w-96 rounded-full bg-[var(--secondary)]/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `linear-gradient(white 1px, transparent 1px),
                                linear-gradient(90deg, white 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Content */}
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
              <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
                Marconi
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-white leading-tight mb-4">
              Welcome back to
              <br />
              your classroom.
            </h1>

            <p className="text-white/60 text-lg max-w-md">
              Students move faster with clear submission feedback, while staff
              runs consistent assignment-level grading and review.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/20 bg-white/10 p-3">
                <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-white/70">
                  <Code2 className="h-3.5 w-3.5" />
                  Student Flow
                </p>
                <p className="text-sm text-white">Submit -&gt; grade -&gt; improve</p>
              </div>
              <div className="rounded-lg border border-white/20 bg-white/10 p-3">
                <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-white/70">
                  <Users className="h-3.5 w-3.5" />
                  Staff Flow
                </p>
                <p className="text-sm text-white">Assign -&gt; test -&gt; review</p>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-6 rounded-xl border border-white/20 bg-[#081726]/70 p-4"
            >
              <div className="mb-3 flex items-center justify-between text-xs text-white/70">
                <span className="font-semibold uppercase tracking-wide">Grading preview</span>
                <span className="rounded bg-white/10 px-2 py-1">SUB-4821</span>
              </div>
              <pre className="rounded-lg border border-white/10 bg-[#0B1F31] p-3 text-[11px] leading-5 text-slate-200">
                {loginCodePreview.map((line, idx) => (
                  <div key={`${line}-${idx}`} className="font-[family-name:var(--font-mono)]">
                    <span className="mr-2 select-none text-slate-500">{String(idx + 1).padStart(2, "0")}</span>
                    {line}
                  </div>
                ))}
              </pre>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs text-white/80">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  test_io_format
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 text-amber-300" />
                  queue 12s
                </span>
              </div>
            </motion.div>
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
              <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--foreground)]">
                Marconi
              </span>
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div variants={fadeInUp} className="mb-8">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)] mb-2">
              Sign in
            </h2>
            <p className="text-[var(--muted-foreground)]">
              Enter your credentials to access your account
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
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--foreground)] mb-2"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.ac.ug"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                />
              </div>
            </div>

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
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-12 pr-12 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
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
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.form>

          {/* Footer */}
          <motion.div variants={fadeInUp} className="mt-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              First time here?{" "}
              <span className="text-[var(--foreground)]">
                Use your invite link to set up your account.
              </span>
            </p>
          </motion.div>

          {/* Back to Home */}
          <motion.div variants={fadeInUp} className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-[var(--primary)] hover:underline"
            >
              Back to home
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
