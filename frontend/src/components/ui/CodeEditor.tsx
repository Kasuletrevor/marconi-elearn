"use client";

import React from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Loader2 } from "lucide-react";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  readOnly?: boolean;
  height?: string | number;
  theme?: "vs-dark" | "light";
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = "cpp",
  readOnly = false,
  height = "100%",
  theme = "vs-dark",
  className = "",
}: CodeEditorProps) {
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // You can configure the editor here
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', monospace",
      padding: { top: 16, bottom: 16 },
      readOnly: readOnly,
    });
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border border-[var(--border)] bg-[#1e1e1e] ${className}`} style={{ height }}>
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={onChange}
        theme={theme}
        onMount={handleEditorDidMount}
        loading={
          <div className="flex items-center justify-center h-full text-[var(--muted-foreground)]">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading editor...</span>
          </div>
        }
        options={{
          readOnly,
          domReadOnly: readOnly,
          contextmenu: !readOnly,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          lineHeight: 24,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
}
