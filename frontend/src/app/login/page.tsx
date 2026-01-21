"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { GraduationCap, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { auth, ApiError } from "@/lib/api";
import { useAuthStore, getRedirectPath } from "@/lib/store";

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

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
      {/* Left Panel - Visual/Archival */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--primary)] relative overflow-hidden border-r border-[var(--primary)]">
        {/* Decorative Grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(white 1px, transparent 1px),
                              linear-gradient(90deg, white 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        
        {/* Archival Stamp */}
        <div className="absolute top-10 right-10 opacity-20 rotate-90 origin-top-right">
           <div className="border border-white p-2 font-[family-name:var(--font-mono)] text-[10px] text-white uppercase tracking-widest">
            Restricted Access
            <br />
            Auth_Level_1
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
             <div className="w-12 h-12 bg-white flex items-center justify-center mb-8 rounded-sm">
                <GraduationCap className="w-6 h-6 text-[var(--primary)]" />
              </div>
            <div className="h-px w-20 bg-white/30 mb-8" />
            
            <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold text-white leading-tight mb-6">
              Authorized <br /> Personnel <br /> Only.
            </h1>

            <p className="text-white/60 text-lg max-w-sm font-light">
              System access is monitored and logged. Ensure credentials are kept secure at all times.
            </p>
          </motion.div>

          <div className="font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest">
            SYS_ID: MARCONI-2026-AUTH
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        {/* Technical Corner Markers */}
        <div className="absolute top-6 left-6 w-4 h-4 border-t border-l border-[var(--primary)]/30" />
        <div className="absolute top-6 right-6 w-4 h-4 border-t border-r border-[var(--primary)]/30" />
        <div className="absolute bottom-6 left-6 w-4 h-4 border-b border-l border-[var(--primary)]/30" />
        <div className="absolute bottom-6 right-6 w-4 h-4 border-b border-r border-[var(--primary)]/30" />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="w-full max-w-sm"
        >
          {/* Mobile Logo */}
          <motion.div variants={fadeInUp} className="lg:hidden mb-12 text-center">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 bg-[var(--primary)] flex items-center justify-center rounded-sm transition-transform group-hover:rotate-6">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div variants={fadeInUp} className="mb-10">
            <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--primary)] uppercase tracking-widest mb-3">
              Authentication Protocol
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold text-[var(--foreground)]">
              Sign In
            </h2>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-4 bg-[var(--secondary)]/5 border-l-2 border-[var(--secondary)] text-[var(--secondary)] text-sm"
            >
              <p className="font-medium">Access Denied</p>
              <p className="opacity-80">{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <motion.form variants={fadeInUp} onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]"
              >
                University ID / Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@makerere.ac.ug"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--border)] rounded-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all font-[family-name:var(--font-mono)] text-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]"
                >
                  Security Key
                </label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-11 pr-12 py-3 bg-white border border-[var(--border)] rounded-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all font-[family-name:var(--font-mono)] text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-4 bg-[var(--primary)] text-white font-bold rounded-sm hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:opacity-70 disabled:cursor-not-allowed transition-all uppercase tracking-widest text-xs"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Initialize Session
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.form>

          {/* Footer */}
          <motion.div variants={fadeInUp} className="mt-12 pt-6 border-t border-[var(--border)] text-center">
             <Link
              href="/"
              className="inline-block mb-4 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
            >
              ← Return to Main Archive
            </Link>
            <p className="text-sm text-[var(--muted-foreground)]">
              No account?{" "}
              <span className="text-[var(--foreground)] font-medium">
                Check your university email for an invite.
              </span>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
