/**
 * Secure syntax highlighter component that prevents DOM clobbering and XSS attacks
 * This is a safer alternative to react-syntax-highlighter with PrismJS
 */

import React from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import { sanitizeSqlContent, isSuspiciousContent } from '@/utils/sanitization';

// Register SQL language with highlight.js (safer than PrismJS)
SyntaxHighlighter.registerLanguage('sql', sql);

interface SafeSyntaxHighlighterProps {
  children: string;
  language?: string;
  customStyle?: React.CSSProperties;
  className?: string;
}

const SafeSyntaxHighlighter: React.FC<SafeSyntaxHighlighterProps> = ({
  children,
  language = 'sql',
  customStyle = {},
  className = ''
}) => {
  // Sanitize the input content
  const sanitizedContent = React.useMemo(() => {
    if (!children || typeof children !== 'string') {
      return '';
    }
    
    // Check for suspicious content
    if (isSuspiciousContent(children)) {
      console.warn('SafeSyntaxHighlighter: Suspicious content detected and blocked');
      return '-- Content blocked for security reasons --';
    }
    
    // Sanitize based on language
    switch (language.toLowerCase()) {
      case 'sql':
        return sanitizeSqlContent(children);
      default:
        // For other languages, use basic sanitization
        return children.replace(/<[^>]*>/g, ''); // Remove HTML tags
    }
  }, [children, language]);
  
  // Additional security: limit content length to prevent DoS
  const truncatedContent = React.useMemo(() => {
    const maxLength = 50000; // 50KB limit
    if (sanitizedContent.length > maxLength) {
      console.warn('SafeSyntaxHighlighter: Content truncated due to size limit');
      return sanitizedContent.substring(0, maxLength) + '\n-- Content truncated for security reasons --';
    }
    return sanitizedContent;
  }, [sanitizedContent]);
  
  // Fallback to plain text if highlighting fails
  const [hasError, setHasError] = React.useState(false);
  
  if (hasError || !truncatedContent) {
    return (
      <pre 
        className={`bg-gray-50 p-4 rounded-md overflow-auto text-gray-800 font-mono text-sm ${className}`}
        style={customStyle}
      >
        <code>{truncatedContent || 'No content to display'}</code>
      </pre>
    );
  }
  
  try {
    return (
      <SyntaxHighlighter
        language={language}
        style={docco}
        customStyle={{
          fontSize: '0.875rem',
          lineHeight: '1.25rem',
          ...customStyle
        }}
        className={className}
        PreTag="div" // Use div instead of pre to prevent some DOM clobbering
        useInlineStyles={true} // Force inline styles to prevent CSS injection
        showLineNumbers={false} // Disable line numbers to reduce attack surface
        showInlineLineNumbers={false}
        wrapLines={true}
        wrapLongLines={true}
        onError={() => setHasError(true)} // Fallback to plain text on error
      >
        {truncatedContent}
      </SyntaxHighlighter>
    );
  } catch (error) {
    console.warn('SafeSyntaxHighlighter: Error during highlighting, falling back to plain text:', error);
    setHasError(true);
    return (
      <pre 
        className={`bg-gray-50 p-4 rounded-md overflow-auto text-gray-800 font-mono text-sm ${className}`}
        style={customStyle}
      >
        <code>{truncatedContent}</code>
      </pre>
    );
  }
};

export default SafeSyntaxHighlighter;