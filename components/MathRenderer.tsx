'use client';

import katex from 'katex';

const MathRenderer = ({ content }: { content: string }) => {
  if (!content) return null;

  // First, handle escaped backslashes properly
  let processedContent = content;
  
  // Split by all possible LaTeX delimiters
  // This regex matches:
  // 1. $$...$$ (display math)
  // 2. \$...\$ where content doesn't contain unescaped $
  // 3. \[...\] (display math LaTeX)
  // 4. \(...\) (inline math LaTeX)
  // 5. \begin{...}...\end{...} (any LaTeX environment)
  
  const parts: Array<{ type: 'math' | 'text', content: string, displayMode: boolean }> = [];
  let currentPos = 0;

  // Regex to find all math sections
  const mathRegex = /(\$\$(?:[^\$]|\$(?!\$))*\$\$|\\\[[\s\S]*?\\\]|\\begin\{[\s\S]*?\}[\s\S]*?\\end\{[^}]*\}|\$(?!\$)[^\$\n]*\$|\\\([\s\S]*?\\\))/g;
  
  let match;
  while ((match = mathRegex.exec(processedContent)) !== null) {
    // Add text before this math
    if (match.index > currentPos) {
      parts.push({
        type: 'text',
        content: processedContent.substring(currentPos, match.index),
        displayMode: false
      });
    }

    const matchedText = match[0];
    let mathContent = matchedText;
    let displayMode = false;

    // Determine delimiter type
    if (matchedText.startsWith('$$') && matchedText.endsWith('$$')) {
      mathContent = matchedText.slice(2, -2);
      displayMode = true;
    } else if (matchedText.startsWith('\\[') && matchedText.endsWith('\\]')) {
      mathContent = matchedText.slice(2, -2);
      displayMode = true;
    } else if (matchedText.startsWith('\\(') && matchedText.endsWith('\\)')) {
      mathContent = matchedText.slice(2, -2);
      displayMode = false;
    } else if (matchedText.startsWith('\\begin{')) {
      mathContent = matchedText;
      displayMode = true;
    } else if (matchedText.startsWith('$') && matchedText.endsWith('$')) {
      mathContent = matchedText.slice(1, -1);
      displayMode = false;
    }

    parts.push({
      type: 'math',
      content: mathContent,
      displayMode
    });

    currentPos = match.index + matchedText.length;
  }

  // Add remaining text
  if (currentPos < processedContent.length) {
    parts.push({
      type: 'text',
      content: processedContent.substring(currentPos),
      displayMode: false
    });
  }

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <span key={index}>
              {part.content.split('\n').map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </span>
          );
        }

        // Math rendering
        try {
          let mathString = part.content;

          // Clean up LaTeX
          mathString = mathString.replace(/\\\\small\s*/g, '');
          mathString = mathString.replace(/\\\\large\s*/g, '');
          mathString = mathString.replace(/\\\\hline/g, '');
          mathString = mathString.replace(/\\\\vspace\{[^}]*\}/g, '');
          mathString = mathString.replace(/\\\\phantom\{[^}]*\}/g, '');
          
          // Fix array format
          if (mathString.includes('\\begin{array}')) {
            // Simplify complex array formatting
            mathString = mathString.replace(/\\begin\{array\}\{[^}]*\}/g, '\\begin{array}{c|c}');
          }

          const html = katex.renderToString(mathString, {
            throwOnError: true,
            displayMode: part.displayMode,
            strict: false,
            maxExpand: 10000,
            trust: true,
          });

          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{ __html: html }}
              className="mx-1"
            />
          );
        } catch (error) {
          // If KaTeX fails, show the raw LaTeX in a styled box
          return (
            <span
              key={index}
              className="bg-yellow-900/30 text-yellow-600 font-mono text-xs px-2 py-1 rounded border border-yellow-700/50 inline-block mx-1"
              title={`LaTeX Error: ${error instanceof Error ? error.message : 'Unknown error'}`}
            >
              {part.content.slice(0, 50)}...
            </span>
          );
        }
      })}
    </span>
  );
};

export default MathRenderer;
