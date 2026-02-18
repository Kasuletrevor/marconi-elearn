"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Terminal, Trash2, Code2 } from "lucide-react";
import Link from "next/link";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { ApiError, PlaygroundLanguage, playground } from "@/lib/api";

const fadeInUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const C_STARTER_CODE = `#include <stdio.h>

int main() {
    printf("Hello, Marc-Elearn!\\n");
    return 0;
}
`;

const CPP_STARTER_CODE = `#include <iostream>

int main() {
    std::cout << "Hello, Marc-Elearn!" << std::endl;
    return 0;
}
`;

function toMonacoLanguage(languageId: string): string {
  const normalized = languageId.trim().toLowerCase();
  if (normalized === "c") return "c";
  if (normalized.includes("cpp") || normalized.includes("c++")) return "cpp";
  return "plaintext";
}

function starterCodeForLanguage(languageId: string): string {
  const monacoLanguage = toMonacoLanguage(languageId);
  if (monacoLanguage === "cpp") return CPP_STARTER_CODE;
  return C_STARTER_CODE;
}

function fileNameForLanguage(languageId: string): string {
  const monacoLanguage = toMonacoLanguage(languageId);
  if (monacoLanguage === "cpp") return "main.cpp";
  if (monacoLanguage === "c") return "main.c";
  const normalized = languageId.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `main.${normalized || "txt"}`;
}

export default function PlaygroundPage() {
  const [code, setCode] = useState(() => starterCodeForLanguage("c"));
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [languages, setLanguages] = useState<PlaygroundLanguage[] | null>(null);
  const [languageId, setLanguageId] = useState("c");

  useEffect(() => {
    let cancelled = false;
    playground
      .listLanguages()
      .then((langs) => {
        if (cancelled) return;
        setLanguages(langs);
        setLanguageId((previousLanguageId) => {
          const selectedLanguage = langs.some((l) => l.id === previousLanguageId)
            ? previousLanguageId
            : langs.length > 0
              ? langs[0].id
              : previousLanguageId;
          setCode((currentCode) => {
            const previousStarterCode = starterCodeForLanguage(previousLanguageId);
            if (currentCode.trim() === "" || currentCode === previousStarterCode) {
              return starterCodeForLanguage(selectedLanguage);
            }
            return currentCode;
          });
          return selectedLanguage;
        });
      })
      .catch(() => {
        if (cancelled) return;
        setLanguages([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const languageLabel = useMemo(() => {
    const match = languages?.find((l) => l.id === languageId);
    if (!match) return languageId.toUpperCase();
    return `${match.id.toUpperCase()} (${match.version})`;
  }, [languages, languageId]);

  const editorLanguage = useMemo(() => toMonacoLanguage(languageId), [languageId]);
  const editorFileName = useMemo(() => fileNameForLanguage(languageId), [languageId]);

  const switchLanguage = (nextLanguageId: string) => {
    const previousStarterCode = starterCodeForLanguage(languageId);
    setLanguageId(nextLanguageId);
    setOutput("");
    setCode((currentCode) => {
      if (currentCode.trim() === "" || currentCode === previousStarterCode) {
        return starterCodeForLanguage(nextLanguageId);
      }
      return currentCode;
    });
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput(""); // Clear previous output

    try {
      const res = await playground.run({
        language_id: languageId,
        source_code: code,
        stdin: "",
      });

      const isCompileFailure = res.outcome === 11;
      const statusLabel = isCompileFailure
        ? "Compile error"
        : res.stderr.trim()
          ? "Runtime error"
          : "Completed";
      const parts: string[] = [];
      parts.push(`Status: ${statusLabel}`);
      parts.push(`Language: ${languageId.toUpperCase()}`);
      parts.push("Compiling...");
      if (res.compile_output.trim()) {
        parts.push(res.compile_output.trimEnd());
      }
      if (isCompileFailure) {
        parts.push("Compilation failed.");
      } else {
        parts.push("Running...");
        if (res.stdout.trim()) parts.push(res.stdout.trimEnd());
        if (res.stderr.trim()) parts.push(res.stderr.trimEnd());
      }
      parts.push(`\nOutcome code: ${res.outcome}`);
      setOutput(parts.join("\n\n"));
    } catch (err) {
      if (err instanceof ApiError) {
        setOutput(`Error (${err.status}): ${err.message}`);
      } else if (err instanceof Error) {
        setOutput(`Error: ${err.message}`);
      } else {
        setOutput("Error: Failed to run code.");
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleClear = () => {
    setCode(starterCodeForLanguage(languageId));
    setOutput("");
  };

  return (
    <div className="max-w-6xl mx-auto p-6 min-h-screen flex flex-col">
      {/* Header */}
      <motion.div 
        variants={fadeInUp} 
        initial="hidden" 
        animate="visible" 
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard"
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <Code2 className="w-6 h-6 text-[var(--primary)]" />
              Code Playground
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Write, compile, and run C/C++ code in the browser.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--secondary)] hover:bg-[var(--secondary)]/10 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isRunning ? (
              <>Running...</>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Run Code
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Editor & Output Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 grid lg:grid-cols-2 gap-4 min-h-[500px]"
      >
        {/* Editor Column */}
        <div className="flex flex-col h-full bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted-foreground)] font-mono">{editorFileName}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted-foreground)]">{languageLabel}</span>
              <select
                value={languageId}
                onChange={(e) => switchLanguage(e.target.value)}
                className="text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              >
                {(languages ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.id.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1">
            <CodeEditor
              value={code}
              onChange={(val) => setCode(val || "")}
              language={editorLanguage}
              className="h-full border-0 rounded-none"
            />
          </div>
        </div>

        {/* Output Column */}
        <div className="flex flex-col h-full bg-[var(--code-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm text-[var(--code-foreground)]">
          <div className="px-4 py-2 border-b border-white/10 bg-[var(--code-surface-alt)] flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--muted-foreground)]" />
            <span className="text-xs font-medium text-[var(--muted-foreground)]">Output</span>
          </div>
          <div className="flex-1 p-4 font-mono text-sm whitespace-pre-wrap overflow-auto">
            {output ? (
              output
            ) : (
              <span className="text-white/30 italic">
                Hit &quot;Run&quot; to see output...
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
