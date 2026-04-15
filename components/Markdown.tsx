import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  // ── Block elements ──────────────────────────────────────────
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-slate-100 mt-4 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-bold text-slate-100 mt-3 mb-1.5 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1 first:mt-0">{children}</h3>
  ),
  hr: () => <hr className="border-[#2a3349] my-3" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-indigo-500/50 pl-3 my-2 text-slate-400 italic">
      {children}
    </blockquote>
  ),

  // ── Lists ───────────────────────────────────────────────────
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-4 my-2 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-4 my-2 space-y-0.5">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed text-slate-300">{children}</li>
  ),

  // ── Inline ──────────────────────────────────────────────────
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-100">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-300">{children}</em>
  ),
  del: ({ children }) => (
    <del className="line-through text-slate-500">{children}</del>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
    >
      {children}
    </a>
  ),

  // ── Code ────────────────────────────────────────────────────
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      const lang = className?.replace("language-", "") ?? "";
      return (
        <div className="my-2 rounded-lg overflow-hidden border border-[#2a3349]">
          {lang && (
            <div className="px-3 py-1 bg-[#0f1117] border-b border-[#2a3349] text-[10px] font-mono text-slate-500 uppercase tracking-wide">
              {lang}
            </div>
          )}
          <pre className="overflow-x-auto bg-[#0a0d14] px-4 py-3">
            <code className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre">
              {children}
            </code>
          </pre>
        </div>
      );
    }
    return (
      <code className="px-1.5 py-0.5 rounded bg-[#0f1117] border border-[#2a3349] text-xs font-mono text-indigo-300">
        {children}
      </code>
    );
  },
  // suppress the default pre wrapper — handled inside code above
  pre: ({ children }) => <>{children}</>,

  // ── Tables (GFM) ────────────────────────────────────────────
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-[#2a3349]">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[#1e2535] text-xs text-slate-400 uppercase">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-[#2a3349]">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-[#1e2535]/50 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 font-medium text-slate-300">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-slate-400">{children}</td>
  ),
};

interface MarkdownProps {
  content: string;
  className?: string;
}

export default function Markdown({ content, className = "" }: MarkdownProps) {
  return (
    <div className={`text-sm text-slate-300 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
