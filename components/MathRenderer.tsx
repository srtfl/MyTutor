'use client';

import katex from 'katex';

// Unicode replacements for common LaTeX commands outside $...$
const LATEX_TO_UNICODE: Record<string, string> = {
  times: '×', div: '÷', pm: '±', mp: '∓', cdot: '·',
  leq: '≤', geq: '≥', neq: '≠', approx: '≈', equiv: '≡',
  sum: 'Σ', prod: 'Π', int: '∫', infty: '∞',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π',
  rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ',
  chi: 'χ', psi: 'ψ', omega: 'ω',
  rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐',
  uparrow: '↑', downarrow: '↓', leftrightarrow: '↔',
  in: '∈', subset: '⊂', cup: '∪', cap: '∩',
  forall: '∀', exists: '∃', nabla: '∇', partial: '∂',
  sqrt: '√', ldots: '…', cdots: '⋯', vdots: '⋮',
  // Strip these entirely (no visible output)
  hline: '', vline: '', small: '', large: '', normalsize: '',
  textbf: '', textrm: '', text: '', bf: '', rm: '',
};

const MathRenderer = ({ content }: { content: string }) => {
  if (!content) return null;

  // ── STEP 1: Unescape double backslashes (database stores \\times as \\\\times) ──
  let processed = content
    .replace(/\\\\/g, '\\')   // \\times → \times
    .replace(/\\n/g, '\n');   // \\n → newline

  // ── STEP 2: Completely strip \begin{...}...\end{...} environments ──
  // These are always malformed AI-generated LaTeX — just remove them cleanly
  processed = processed.replace(/\\begin\{[^}]*\}[\s\S]*?\\end\{[^}]*\}/g, '');

  // ── STEP 3: Split by $...$ and $$...$$ for KaTeX rendering ──
  const parts: Array<{ type: 'math' | 'text'; content: string; displayMode: boolean }> = [];
  let currentPos = 0;

  // Only match properly delimited math — $...$ and $$...$$
  const mathRegex = /(\$\$(?:[^\$]|\$(?!\$))*\$\$|\$(?!\$)[^\$\n]+\$)/g;
  let match;

  while ((match = mathRegex.exec(processed)) !== null) {
    if (match.index > currentPos) {
      parts.push({
        type: 'text',
        content: processed.substring(currentPos, match.index),
        displayMode: false,
      });
    }

    const raw = match[0];
    if (raw.startsWith('$$') && raw.endsWith('$$')) {
      parts.push({ type: 'math', content: raw.slice(2, -2), displayMode: true });
    } else {
      parts.push({ type: 'math', content: raw.slice(1, -1), displayMode: false });
    }
    currentPos = match.index + raw.length;
  }

  if (currentPos < processed.length) {
    parts.push({ type: 'text', content: processed.substring(currentPos), displayMode: false });
  }

  // ── STEP 4: Clean plain text — replace \commands with Unicode symbols ──
  const cleanText = (text: string): string => {
    let result = text;

    // Replace known math commands with Unicode
    result = result.replace(/\\([a-zA-Z]+)\s*/g, (_, cmd) => {
      if (cmd in LATEX_TO_UNICODE) return LATEX_TO_UNICODE[cmd];
      return ''; // Strip unknown commands silently
    });

    // Remove stray backslashes and curly braces
    result = result.replace(/[\\{}]/g, ' ');

    // Remove column spec artifacts like @{>>} @c etc.
    result = result.replace(/@\{[^}]*\}/g, '');
    result = result.replace(/c@/g, '');

    // Clean up whitespace
    result = result.replace(/\s+/g, ' ').trim();

    // Handle **bold** markdown
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    return result;
  };

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          const html = cleanText(part.content);
          if (!html) return null;
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        }

        // Try KaTeX rendering for $...$ content
        try {
          const html = katex.renderToString(part.content, {
            throwOnError: true,
            displayMode: part.displayMode,
            strict: false,
            maxExpand: 10000,
            trust: true,
          });
          return (
            <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="mx-0.5" />
          );
        } catch {
          // KaTeX failed — render as cleaned plain text fallback
          const fallback = cleanText(part.content);
          return <span key={index} className="text-zinc-300">{fallback}</span>;
        }
      })}
    </span>
  );
};

export default MathRenderer;
