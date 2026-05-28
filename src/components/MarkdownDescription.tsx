"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownDescriptionProps {
  text: string;
  className?: string;
}

export default function MarkdownDescription({ text, className = "" }: MarkdownDescriptionProps) {
  return (
    <div className={`prose prose-sm prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="text-sm text-zinc-400 leading-relaxed mb-3 last:mb-0">{children}</p>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-amber-500/40 pl-4 my-3 italic text-zinc-400">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-200">{children}</strong>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
