"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Code2,
  GraduationCap,
  Users,
  Sparkles,
  ArrowRight,
  Terminal,
  FileCode,
} from "lucide-react";
import Link from "next/link";

/* ============================================
   ANIMATION VARIANTS
   ============================================ */
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

/* ============================================
   COMPONENTS
   ============================================ */

function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]"
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-[var(--primary)] flex items-center justify-center rounded-sm transition-transform group-hover:rotate-6">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--foreground)] tracking-tight">
            Marconi<span className="text-[var(--primary)]">.</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-10">
          <Link
            href="#features"
            className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
          >
            Capabilities
          </Link>
          <Link
            href="#how-it-works"
            className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
          >
            Workflow
          </Link>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest font-bold text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/login"
            className="px-5 py-2 text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-widest bg-[var(--primary)] text-white rounded-sm hover:bg-[var(--primary-hover)] transition-all"
          >
            Access Portal
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Graph paper pattern */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(var(--primary) 1px, transparent 1px),
                              linear-gradient(90deg, var(--primary) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(var(--primary) 0.5px, transparent 0.5px),
                              linear-gradient(90deg, var(--primary) 0.5px, transparent 0.5px)`,
            backgroundSize: "8px 8px",
          }}
        />
        
        {/* Large Archival Stamp */}
        <div className="absolute top-40 right-10 rotate-12 opacity-5 select-none pointer-events-none">
          <div className="border-4 border-[var(--primary)] p-4 rounded-xl text-[var(--primary)] font-bold text-6xl uppercase tracking-widest">
            MAKERERE
            <br />
            ARCHIVE
          </div>
        </div>

        {/* Archival Annotations */}
        <div className="absolute top-1/4 left-10 hidden lg:block">
          <div className="flex items-start gap-2">
            <div className="w-px h-12 bg-[var(--primary)]/30 mt-1" />
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-tighter text-[var(--primary)]/40 vertical-text">
              Ref. Code: M-2026-X
            </span>
          </div>
        </div>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 w-full">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid lg:grid-cols-[1.2fr,0.8fr] gap-12 items-center"
        >
          <div className="text-left">
            {/* Badge */}
            <motion.div variants={fadeInUp} className="mb-6 flex items-center gap-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded text-xs font-bold text-[var(--secondary)] uppercase tracking-widest">
                System Ver. 1.0.4
              </span>
              <div className="h-px w-12 bg-[var(--border)]" />
              <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)] uppercase">
                Established 2024
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeInUp}
              className="font-[family-name:var(--font-display)] text-6xl md:text-8xl font-bold text-[var(--foreground)] leading-[0.95] tracking-tight mb-8"
            >
              Where Code Meets
              <br />
              <span className="italic text-[var(--primary)]">Academic</span>
              <br />
              <span className="relative">
                Excellence
                <svg className="absolute -bottom-2 left-0 w-full h-2 text-[var(--secondary)]/40" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 25 0, 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.div variants={fadeInUp} className="relative max-w-lg mb-12">
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-[var(--primary)]/10" />
              <p className="text-lg md:text-xl text-[var(--muted-foreground)] leading-relaxed pl-4 font-light italic">
                A modern learning platform built for programming courses. Distribute
                assignments, collect C/C++ submissions, and deliver instant
                AI-powered feedback at university scale.
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center gap-6"
            >
              <Link
                href="/login"
                className="group relative px-8 py-4 bg-[var(--primary)] text-white font-medium rounded transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative flex items-center gap-2">
                  Access Portal
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              <Link
                href="#features"
                className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors border-b border-transparent hover:border-[var(--primary)] pb-1"
              >
                view_technical_specs
              </Link>
            </motion.div>
          </div>

          <div className="relative">
            {/* Visual Element: Archival Card Stack */}
            <motion.div
              variants={scaleIn}
              className="relative aspect-square"
            >
              <div className="absolute inset-0 bg-[var(--card)] border border-[var(--border)] rounded-sm rotate-3 shadow-sm" />
              <div className="absolute inset-0 bg-white border border-[var(--border)] rounded-sm -rotate-3 shadow-md p-8 flex flex-col justify-between overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-[var(--primary)]/5 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-[var(--primary)]" />
                  </div>
                  <div className="text-right">
                    <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)]">LOG_ID: 882-991</div>
                    <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)]">TIME: 21.01.2026</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="h-px bg-gradient-to-r from-[var(--border)] to-transparent" />
                  <div className="font-[family-name:var(--font-display)] text-2xl font-semibold">CS101: Introduction to Computer Systems</div>
                  <div className="flex gap-2">
                    <div className="px-2 py-1 bg-[var(--primary)]/5 text-[var(--primary)] text-[10px] font-bold rounded uppercase">C++ Core</div>
                    <div className="px-2 py-1 bg-[var(--secondary)]/5 text-[var(--secondary)] text-[10px] font-bold rounded uppercase">Assignment 04</div>
                  </div>
                </div>

                <div className="mt-8 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--muted-foreground)]">Grading Completion</span>
                    <span className="font-bold">94.2%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--muted)] rounded-full overflow-hidden">
                    <div className="h-full w-[94.2%] bg-[var(--primary)]" />
                  </div>
                </div>

                {/* Decorative Grid on Card */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 opacity-[0.03]"
                  style={{
                    backgroundImage: `radial-gradient(var(--primary) 1px, transparent 1px)`,
                    backgroundSize: "8px 8px"
                  }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      code: "MOD-01",
      icon: BookOpen,
      title: "Course Management",
      description:
        "Organize your curriculum into modules. Upload resources, set deadlines, manage enrollments—all in one place.",
      color: "var(--primary)",
    },
    {
      code: "EXE-02",
      icon: Code2,
      title: "Code Submissions",
      description:
        "Students upload C/C++ files or zipped projects. We compile, run, and grade against your hidden test cases.",
      color: "var(--secondary)",
    },
    {
      code: "SBX-03",
      icon: Terminal,
      title: "Sandboxed Execution",
      description:
        "Student code runs in isolated containers with strict time and memory limits. Safe, secure, scalable.",
      color: "var(--primary)",
    },
    {
      code: "AI-04",
      icon: Sparkles,
      title: "AI Code Review",
      description:
        "Optional GPT-4 powered feedback on code quality, style, and best practices. Budget-capped per organization.",
      color: "var(--secondary)",
    },
    {
      code: "RBAC-05",
      icon: Users,
      title: "Role-Based Access",
      description:
        "Lecturers, co-lecturers, TAs, and students—each with precisely scoped permissions and audit trails.",
      color: "var(--primary)",
    },
    {
      code: "OFF-06",
      icon: FileCode,
      title: "Offline Support",
      description:
        "Students can download assignments as PDF + starter code ZIP. Work offline, submit when ready.",
      color: "var(--secondary)",
    },
  ];

  return (
    <section id="features" className="py-32 relative border-t border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20"
        >
          <div className="max-w-2xl">
            <motion.span
              variants={fadeInUp}
              className="font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--primary)] uppercase tracking-[0.3em]"
            >
              Technical Specifications
            </motion.span>
            <motion.h2
              variants={fadeInUp}
              className="font-[family-name:var(--font-display)] text-5xl md:text-6xl font-bold text-[var(--foreground)] mt-4"
            >
              Everything You Need <br /> to <span className="italic">Teach Code</span>
            </motion.h2>
          </div>
          <motion.div variants={fadeInUp} className="hidden md:block">
            <div className="p-4 border border-[var(--border)] bg-white/50 backdrop-blur-sm rounded-sm text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-tight text-[var(--muted-foreground)]">
              System Capabilities Matrix // V.26
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--border)] border border-[var(--border)]"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={scaleIn}
              className="group relative p-10 bg-[var(--background)] hover:bg-white transition-all duration-500 overflow-hidden"
            >
              {/* Feature Code Label */}
              <div className="absolute top-4 right-4 font-[family-name:var(--font-mono)] text-[10px] text-[var(--primary)]/20 group-hover:text-[var(--primary)]/60 transition-colors">
                {feature.code}
              </div>

              {/* Icon */}
              <div
                className="w-14 h-14 border border-[var(--border)] flex items-center justify-center mb-8 relative z-10 transition-transform group-hover:scale-110"
                style={{ backgroundColor: `color-mix(in srgb, ${feature.color} 5%, white)` }}
              >
                <feature.icon
                  className="w-6 h-6"
                  style={{ color: feature.color }}
                />
              </div>

              <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--foreground)] mb-4">
                {feature.title}
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed text-sm">
                {feature.description}
              </p>

              {/* Decorative Corner */}
              <div className="absolute bottom-0 right-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-2 right-2 w-4 h-px bg-[var(--primary)]" />
                <div className="absolute bottom-2 right-2 w-px h-4 bg-[var(--primary)]" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      title: "Create Your Course",
      description:
        "Set up your course structure with modules, resources, and assignment templates. Invite students via secure, single-use links.",
      meta: "Setup Phase",
    },
    {
      step: "02",
      title: "Design Assignments",
      description:
        "Write instructions in Markdown, add starter code, and define hidden test cases. Set due dates and late policies.",
      meta: "Instructional Design",
    },
    {
      step: "03",
      title: "Students Submit Code",
      description:
        "Students upload their C/C++ solutions. Our system queues, compiles, and executes code in secure sandboxes.",
      meta: "Execution & Testing",
    },
    {
      step: "04",
      title: "Instant Feedback",
      description:
        "Auto-grading shows pass/fail per test case. Optional AI review provides detailed code quality feedback.",
      meta: "Assessment Delivery",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-32 bg-white/50 border-y border-[var(--border)] relative overflow-hidden"
    >
      {/* Decorative measure lines */}
      <div className="absolute left-0 top-0 bottom-0 w-8 border-r border-[var(--border)] hidden lg:flex flex-col justify-between py-10 items-center">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="w-2 h-px bg-[var(--border)]" />
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-24"
        >
          <motion.span
            variants={fadeInUp}
            className="font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--secondary)] uppercase tracking-[0.3em]"
          >
            Workflow Architecture
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="font-[family-name:var(--font-display)] text-5xl md:text-6xl font-bold text-[var(--foreground)] mt-4"
          >
            From Assignment <br /> to <span className="italic">Grade in Minutes</span>
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="relative max-w-4xl mx-auto"
        >
          {/* Vertical connection line */}
          <div className="absolute left-6 lg:left-1/2 top-0 bottom-0 w-px bg-[var(--border)] -translate-x-1/2" />

          <div className="space-y-24">
            {steps.map((item, index) => (
              <motion.div
                key={item.step}
                variants={fadeInUp}
                className={`relative flex items-center gap-12 ${
                  index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                }`}
              >
                {/* Step number circle */}
                <div className="absolute left-6 lg:left-1/2 -translate-x-1/2 z-10 w-12 h-12 rounded-full bg-white border border-[var(--primary)] flex items-center justify-center shadow-sm">
                  <span className="font-[family-name:var(--font-mono)] text-sm font-bold text-[var(--primary)]">
                    {item.step}
                  </span>
                </div>

                {/* Content */}
                <div className={`flex-1 pl-16 lg:pl-0 ${index % 2 === 0 ? "lg:text-right lg:pr-16" : "lg:text-left lg:pl-16"}`}>
                  <div className="inline-block px-2 py-1 bg-[var(--muted)] text-[var(--muted-foreground)] font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-tighter mb-4">
                    {item.meta}
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--foreground)] mb-4">
                    {item.title}
                  </h3>
                  <p className="text-[var(--muted-foreground)] leading-relaxed text-lg font-light">
                    {item.description}
                  </p>
                </div>

                {/* Visual placeholder for desktop */}
                <div className="hidden lg:block flex-1" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-32">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="relative p-12 md:p-20 bg-[var(--primary)] text-center overflow-hidden border-8 border-[var(--primary)] outline outline-1 outline-[var(--primary)] outline-offset-4"
        >
          {/* Decorative archival details */}
          <div className="absolute top-4 left-4 font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-[0.2em]">
            Form: M-TRANS-2026
          </div>
          <div className="absolute bottom-4 right-4 font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-[0.2em]">
            Authorized Access Only
          </div>

          <motion.div variants={fadeInUp} className="relative z-10">
            <div className="w-20 h-20 bg-white/10 mx-auto mb-8 flex items-center justify-center rotate-45 border border-white/20">
              <GraduationCap className="w-10 h-10 text-white -rotate-45" />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Ready to Transform Your <span className="italic">Classroom?</span>
            </h2>
            <p className="text-white/70 text-lg mb-12 max-w-xl mx-auto font-light">
              Join lecturers at Makerere University who are already using
              Marconi to streamline their programming courses and deliver
              world-class education.
            </p>
            <Link
              href="/login"
              className="group inline-flex items-center gap-4 px-10 py-5 bg-white text-[var(--primary)] font-bold rounded-sm hover:bg-white/90 transition-all shadow-2xl"
            >
              INITIALIZE PORTAL ACCESS
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-16 border-t border-[var(--border)] bg-[var(--background)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-[1fr,2fr] gap-12 items-start">
          {/* Logo & Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--primary)] flex items-center justify-center rounded-sm">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)] tracking-tight">
                Marconi<span className="text-[var(--primary)]">.</span>
              </span>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-xs">
              A modern Learning Management System designed for the rigors of
              computer science education at Makerere University.
            </p>
          </div>

          {/* Credits & Legal */}
          <div className="flex flex-col md:items-end justify-between h-full gap-8">
            <div className="flex flex-wrap gap-8 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-widest text-[var(--muted-foreground)]">
              <a href="#" className="hover:text-[var(--primary)] transition-colors">Documentation</a>
              <a href="#" className="hover:text-[var(--primary)] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[var(--primary)] transition-colors">Terms of Service</a>
              <a href="https://emergentai.ug" target="_blank" className="hover:text-[var(--primary)] transition-colors text-[var(--primary)]">EmergentAI</a>
            </div>
            
            <div className="flex flex-col md:items-end gap-2">
              <div className="text-xs text-[var(--muted-foreground)]">
                &copy; {new Date().getFullYear()} Makerere University // College of Computing and Information Sciences
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)]/50 font-[family-name:var(--font-mono)] uppercase">
                System Build: 2026.01.21.R3
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================
   PAGE EXPORT
   ============================================ */

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </main>
  );
}
