"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GraduationCap, Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { auth, ApiError } from "@/lib/api";

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await auth.forgotPassword({ email });
      setSent(true);
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
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--code-surface)] lg:flex lg:w-1/2">
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
                Marc-Elearn
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-white leading-tight mb-4">
              Forgot your
              <br />
              password?
            </h1>

            <p className="max-w-md text-lg text-white/70">
              No worries. Enter your email and we&apos;ll send you a link to reset your password.
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
              <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--foreground)]">
                Marc-Elearn
              </span>
            </Link>
          </motion.div>

          {sent ? (
            <>
              <motion.div variants={fadeInUp} className="mb-8 text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)] mb-2">
                  Check your email
                </h2>
                <p className="text-[var(--muted-foreground)]">
                  If an account exists with <strong>{email}</strong>, we&apos;ve sent a password reset link.
                  The link expires in 1 hour.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp} className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </motion.div>
            </>
          ) : (
            <>
              {/* Header */}
              <motion.div variants={fadeInUp} className="mb-8">
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)] mb-2">
                  Reset password
                </h2>
                <p className="text-[var(--muted-foreground)]">
                  Enter the email address associated with your account
                </p>
              </motion.div>

              {/* Error */}
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--primary)] text-white font-medium rounded-xl hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>

              {/* Back to Login */}
              <motion.div variants={fadeInUp} className="mt-8 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
