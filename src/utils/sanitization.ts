/**
 * Security utilities for sanitizing user input and preventing XSS attacks
 */

/**
 * Sanitize string content to prevent XSS and DOM clobbering
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous HTML tags and attributes
  const sanitized = input
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove on* event handlers (onclick, onload, etc.)
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol for security (except data:image which is safe)
    .replace(/data:(?!image\/)/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '')
    // Remove object, embed, iframe tags
    .replace(/<(object|embed|iframe)\b[^>]*>.*?<\/\1>/gi, '')
    // Remove form tags
    .replace(/<\/?form\b[^>]*>/gi, '')
    // Remove link tags that could load external resources
    .replace(/<link\b[^>]*>/gi, '')
    // Remove meta tags
    .replace(/<meta\b[^>]*>/gi, '')
    // Remove style tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove XML processing instructions
    .replace(/<\?xml.*?\?>/gi, '')
    // Remove DOCTYPE declarations
    .replace(/<!DOCTYPE.*?>/gi, '');
  
  return sanitized.trim();
}

/**
 * Sanitize SQL content specifically for syntax highlighting
 */
export function sanitizeSqlContent(sql: string | null | undefined): string {
  if (!sql || typeof sql !== 'string') {
    return '';
  }
  
  // SQL should only contain SQL keywords, identifiers, strings, and numbers
  // Remove any HTML tags completely
  const sanitized = sql
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&lt;/g, '<')   // Decode HTML entities
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .trim();
  
  // Additional validation: ensure it looks like SQL
  // Basic SQL pattern check (optional, can be adjusted based on needs)
  const sqlPattern = /^[\w\s\(\)\[\],'"`\-+*/.=<>!;:@#$%^&{}|\\~?\n\r\t]*$/;
  if (!sqlPattern.test(sanitized)) {
    console.warn('Potentially unsafe SQL content detected and sanitized');
    // Return a safe fallback
    return '-- Content removed for security reasons --';
  }
  
  return sanitized;
}

/**
 * Sanitize query plan content - more permissive for legitimate Dremio query plans
 */
export function sanitizeQueryPlan(plan: string | null | undefined): string {
  if (!plan || typeof plan !== 'string') {
    return '';
  }
  
  // For query plans, we need to be less aggressive since they contain legitimate technical content
  // Only remove the most dangerous patterns while preserving Dremio query plan structure
  const sanitized = plan
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove on* event handlers (onclick, onload, etc.)
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '')
    // Remove only the most dangerous tags, preserve query plan structure
    .replace(/<(script|object|embed|iframe)\b[^>]*>.*?<\/\1>/gi, '');
  
  return sanitized.trim();
}

/**
 * Sanitize JSON content for display
 */
export function sanitizeJsonForDisplay(jsonString: string | null | undefined): string {
  if (!jsonString || typeof jsonString !== 'string') {
    return '';
  }
  
  try {
    // Parse and re-stringify to ensure it's valid JSON
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    console.warn('Invalid JSON content provided:', error);
    // Return sanitized string if JSON parsing fails
    return sanitizeString(jsonString);
  }
}

/**
 * Validate and sanitize file paths
 */
export function sanitizeFilePath(path: string | null | undefined): string {
  if (!path || typeof path !== 'string') {
    return '';
  }
  
  // Remove directory traversal attempts and dangerous characters
  return path
    .replace(/\.\./g, '') // Remove directory traversal
    .replace(/[<>:"|?*]/g, '') // Remove dangerous filename characters
    .replace(/^\/+/, '') // Remove leading slashes
    .trim();
}

/**
 * Check if content appears to be malicious
 * More permissive for technical content like query plans
 */
export function isSuspiciousContent(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  // Only flag content that is clearly malicious, not technical content
  const suspiciousPatterns = [
    /<script[^>]*>.*?<\/script>/i,  // Complete script tags with content
    /javascript:\s*[^\/\s]/i,      // javascript: protocol with actual code
    /vbscript:\s*[^\/\s]/i,        // vbscript: protocol with actual code
    /on\w+\s*=\s*["'][^"']*["']/i, // Event handlers with quotes
    /<iframe[^>]*src/i,            // iframes with src attributes
    /document\.currentScript/i,     // DOM clobbering attempt
    /eval\s*\(\s*["'][^"']*["']/i, // eval with string content
    /Function\s*\(\s*["'][^"']*["']/i, // Function constructor with string
    /setTimeout\s*\(\s*["'][^"']*["']/i, // setTimeout with string
    /setInterval\s*\(\s*["'][^"']*["']/i // setInterval with string
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(content));
}

/**
 * Check if query plan content appears to be malicious
 * Very permissive for Dremio query plans which contain technical operators
 */
export function isSuspiciousQueryPlan(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  // Only flag the most obvious malicious content in query plans
  const maliciousPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/i,  // Complete script tags
    /javascript:\s*(?:alert|confirm|prompt|eval)/i, // Obvious JS execution
    /vbscript:\s*(?:msgbox|eval)/i,     // Obvious VBScript execution
    /document\.currentScript\s*=/i,      // DOM clobbering
    /<iframe[^>]*src\s*=\s*["']https?:/i // External iframe loading
  ];
  
  return maliciousPatterns.some(pattern => pattern.test(content));
}