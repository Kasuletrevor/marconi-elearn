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
      className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/90 backdrop-blur-md border-b border-[var(--border)]"
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--foreground)] tracking-tight">
            Marconi<span className="text-[var(--primary)]">.</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="#features"
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            How It Works
          </Link>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-bold bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--primary) 1px, transparent 1px),
                              linear-gradient(90deg, var(--primary) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[var(--primary)]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[var(--secondary)]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-24">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="text-center"
        >
          {/* CTAs */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/login"
              className="group flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-all shadow-lg shadow-[var(--primary)]/20"
            >
              Start Teaching
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#features"
              className="flex items-center gap-2 px-6 py-3 bg-[var(--card)] text-[var(--foreground)] font-bold rounded-lg border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors"
            >
              Explore Features
            </Link>
          </motion.div>

          {/* Code Visualization */}
          <motion.div
            variants={scaleIn}
            className="mt-20 relative mx-auto max-w-2xl"
          >
            <div className="bg-[#1E1E1E] rounded-3xl shadow-2xl overflow-hidden border border-[var(--border)]/10 text-left relative">
              {/* Window Bar */}
              <div className="flex items-center justify-between px-6 py-4 bg-[#252526] border-b border-[#333]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                </div>
                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  Execution_Session
                </div>
              </div>
              
              {/* Code Panel */}
              <div className="p-8 font-[family-name:var(--font-mono)] text-sm leading-relaxed overflow-x-auto bg-[#1E1E1E]">
                <div className="flex opacity-50"><span className="w-8 mr-4 text-right select-none">1</span><span className="text-[#C586C0]">#include</span> <span className="text-[#CE9178]">&lt;iostream&gt;</span></div>
                <div className="flex"><span className="w-8 mr-4 text-right select-none text-gray-600">2</span><span className="text-[#569CD6]">int</span> <span className="text-[#DCDCAA]">main</span>() {'{'}</div>
                <div className="flex"><span className="w-8 mr-4 text-right select-none text-gray-600">3</span>    <span className="text-[#4EC9B0]">Grade</span> session_result;</div>
                <div className="flex"><span className="w-8 mr-4 text-right select-none text-gray-600">4</span>    </div>
                <div className="flex"><span className="w-8 mr-4 text-right select-none text-gray-600">5</span>    <span className="text-[#6A9955]">// Evaluate student submission</span></div>
                <div className="flex"><span className="w-8 mr-4 text-right select-none text-gray-600">6</span>    session_result.<span className="text-[#DCDCAA]">evaluate</span>(SUBMISSION_ID);</div>
                <div className="flex animate-pulse"><span className="w-8 mr-4 text-right select-none text-[var(--primary)] font-bold">&gt;</span>    std::cout &lt;&lt; <span className="text-[#CE9178]">"Status: SUCCESS"</span> &lt;&lt; std::endl;</div>
                <div className="flex"><span className="w-8 mr-4 text-right select-none text-gray-600">8</span>    <span className="text-[#C586C0]">return</span> <span className="text-[#B5CEA8]">0</span>;</div>
                <div className="flex"><span className="w-8 mr-4 text-right select-none text-gray-600">9</span>{'}'}</div>
              </div>

              {/* Status Bar */}
              <div className="bg-[var(--primary)] px-6 py-2 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-white/90 text-[10px] font-bold uppercase tracking-tighter">
                    <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                    Live_Grading
                  </div>
                  <div className="h-3 w-px bg-white/20" />
                  <div className="text-white/70 text-[10px] font-mono">Build: PASSED</div>
                </div>
                <div className="text-white/50 text-[10px] font-mono">100% Coverage</div>
              </div>
            </div>
            
            {/* Soft decorative shadow */}
            <div className="absolute -inset-10 bg-gradient-to-tr from-[var(--primary)]/10 via-transparent to-[var(--secondary)]/10 rounded-full blur-3xl -z-10" />
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeInUp}
            className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {[
              { value: "220+", label: "Students per Course" },
              { value: "< 10s", label: "Auto-Grade Speed" },
              { value: "99.9%", label: "Uptime SLA" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-[var(--primary)]">
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--muted-foreground)] mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: BookOpen,
      title: "Course Management",
      description:
        "Organize your curriculum into modules. Upload resources, set deadlines, manage enrollments—all in one place.",
      color: "var(--primary)",
    },
    {
      icon: Code2,
      title: "Code Submissions",
      description:
        "Students upload C/C++ files or zipped projects. We compile, run, and grade against your hidden test cases.",
      color: "var(--secondary)",
    },
    {
      icon: Terminal,
      title: "Sandboxed Execution",
      description:
        "Student code runs in isolated containers with strict time and memory limits. Safe, secure, scalable.",
      color: "var(--primary)",
    },
    {
      icon: Sparkles,
      title: "AI Code Review",
      description:
        "Optional GPT-4 powered feedback on code quality, style, and best practices. Budget-capped per organization.",
      color: "var(--secondary)",
    },
    {
      icon: Users,
      title: "Role-Based Access",
      description:
        "Lecturers, co-lecturers, TAs, and students—each with precisely scoped permissions and audit trails.",
      color: "var(--primary)",
    },
    {
      icon: FileCode,
      title: "Offline Support",
      description:
        "Students can download assignments as PDF + starter code ZIP. Work offline, submit when ready.",
      color: "var(--secondary)",
    },
  ];

  return (
    <section id="features" className="py-32 relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.span
            variants={fadeInUp}
            className="text-sm font-medium text-[var(--primary)] uppercase tracking-wider"
          >
            Features
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold text-[var(--foreground)] mt-4"
          >
            Everything You Need to Teach Code
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={scaleIn}
              className="group p-8 bg-[var(--card)] rounded-2xl border border-[var(--border)] hover:border-[var(--primary)]/30 hover:shadow-xl hover:shadow-[var(--primary)]/5 transition-all duration-300"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ backgroundColor: `color-mix(in srgb, ${feature.color} 15%, transparent)` }}
              >
                <feature.icon
                  className="w-6 h-6"
                  style={{ color: feature.color }}
                />
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--foreground)] mb-3">
                {feature.title}
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                {feature.description}
              </p>
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
    },
    {
      step: "02",
      title: "Design Assignments",
      description:
        "Write instructions in Markdown, add starter code, and define hidden test cases. Set due dates and late policies.",
    },
    {
      step: "03",
      title: "Students Submit Code",
      description:
        "Students upload their C/C++ solutions. Our system queues, compiles, and executes code in secure sandboxes.",
    },
    {
      step: "04",
      title: "Instant Feedback",
      description:
        "Auto-grading shows pass/fail per test case. Optional AI review provides detailed code quality feedback.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-32 bg-[var(--card)] border-y border-[var(--border)]"
    >
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.span
            variants={fadeInUp}
            className="text-sm font-medium text-[var(--secondary)] uppercase tracking-wider"
          >
            How It Works
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold text-[var(--foreground)] mt-4"
          >
            From Assignment to Grade in Minutes
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="relative"
        >
          {/* Connection line */}
          <div className="hidden lg:block absolute top-24 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-0.5 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--primary)]" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item) => (
              <motion.div
                key={item.step}
                variants={fadeInUp}
                className="relative text-center"
              >
                {/* Step number */}
                <div className="relative z-10 w-12 h-12 mx-auto mb-6 rounded-full bg-[var(--background)] border-2 border-[var(--primary)] flex items-center justify-center">
                  <span className="font-[family-name:var(--font-mono)] text-sm font-bold text-[var(--primary)]">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--foreground)] mb-3">
                  {item.title}
                </h3>
                <p className="text-[var(--muted-foreground)] leading-relaxed">
                  {item.description}
                </p>
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
          className="relative p-12 md:p-16 bg-[var(--primary)] rounded-3xl text-center overflow-hidden"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--secondary)]/20 rounded-full blur-2xl -translate-x-1/2 translate-y-1/2" />

          <motion.div variants={fadeInUp} className="relative z-10">
            <GraduationCap className="w-12 h-12 text-white/80 mx-auto mb-6" />
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Classroom?
            </h2>
            <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
              Join lecturers at Makerere University who are already using
              Marconi to streamline their programming courses.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[var(--primary)] font-bold rounded-xl hover:bg-white/90 transition-colors shadow-xl"
            >
              Get Started Today
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 border-t border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--foreground)]">
              Marconi
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-[var(--muted-foreground)]">
            <span>
              A project of{" "}
              <a
                href="https://emergentai.ug"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:underline"
              >
                EmergentAI
              </a>{" "}
              &{" "}
              <a
                href="https://cit.ac.ug"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:underline"
              >
                Marconi Lab
              </a>
            </span>
          </div>

          {/* Copyright */}
          <div className="text-sm text-[var(--muted-foreground)]">
            &copy; {new Date().getFullYear()} Makerere University
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
