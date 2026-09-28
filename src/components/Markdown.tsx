import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "@uiw/react-markdown-preview/markdown.css";

// Renders like @uiw/react-md-editor's Markdown (same classes and CSS), without the editor
// and its syntax highlighter, which are ~240 KB of compressed JS the public pages don't need.
export default function Markdown({ source, style }: { source?: string; style?: CSSProperties }) {
  return (
    <div className="wmde-markdown wmde-markdown-color" style={style}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}
