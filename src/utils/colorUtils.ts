/**
 * Utility functions for handling color conversions and validations
 * Specifically for ensuring compatibility with html2canvas and PDF generation
 */

/**
 * Check if a color string contains modern CSS color functions that might not be supported
 */
export function hasUnsupportedColorFunction(colorString: string): boolean {
  const unsupportedFunctions = ['oklch(', 'color(', 'lch(', 'lab(', 'hwb(', 'color-mix('];
  return unsupportedFunctions.some(func => colorString.includes(func));
}

/**
 * Convert modern CSS color functions to fallback colors
 */
export function convertUnsupportedColors(cssText: string): string {
  // Replace oklch colors with fallback hex colors
  let converted = cssText;
  
  // Common oklch patterns and their fallbacks
  const oklchReplacements: Record<string, string> = {
    'oklch(0.98 0.013 106.423)': '#f9fafb', // gray-50
    'oklch(0.96 0.013 106.423)': '#f3f4f6', // gray-100
    'oklch(0.92 0.026 106.423)': '#e5e7eb', // gray-200
    'oklch(0.86 0.039 106.423)': '#d1d5db', // gray-300
    'oklch(0.70 0.052 106.423)': '#9ca3af', // gray-400
    'oklch(0.55 0.052 106.423)': '#6b7280', // gray-500
    'oklch(0.45 0.052 106.423)': '#4b5563', // gray-600
    'oklch(0.35 0.052 106.423)': '#374151', // gray-700
    'oklch(0.25 0.052 106.423)': '#1f2937', // gray-800
    'oklch(0.15 0.052 106.423)': '#111827', // gray-900
  };
  
  // Replace specific oklch values
  Object.entries(oklchReplacements).forEach(([oklch, hex]) => {
    converted = converted.replace(new RegExp(oklch.replace(/[()]/g, '\\$&'), 'g'), hex);
  });
  
  // Generic fallback for any remaining oklch functions
  converted = converted.replace(/oklch\([^)]+\)/g, '#6b7280'); // fallback to gray-500
  converted = converted.replace(/color\([^)]+\)/g, '#6b7280');
  converted = converted.replace(/lch\([^)]+\)/g, '#6b7280');
  converted = converted.replace(/lab\([^)]+\)/g, '#6b7280');
  converted = converted.replace(/hwb\([^)]+\)/g, '#6b7280');
  converted = converted.replace(/color-mix\([^)]+\)/g, '#6b7280');
  
  return converted;
}

/**
 * Convert common Tailwind color classes to their hex equivalents
 */
export const tailwindColorMap: Record<string, string> = {
  // Gray colors
  'bg-gray-50': '#f9fafb',
  'bg-gray-100': '#f3f4f6',
  'bg-gray-200': '#e5e7eb',
  'bg-gray-300': '#d1d5db',
  'bg-gray-400': '#9ca3af',
  'bg-gray-500': '#6b7280',
  'bg-gray-600': '#4b5563',
  'bg-gray-700': '#374151',
  'bg-gray-800': '#1f2937',
  'bg-gray-900': '#111827',
  
  // Blue colors
  'bg-blue-50': '#eff6ff',
  'bg-blue-100': '#dbeafe',
  'bg-blue-200': '#bfdbfe',
  'bg-blue-300': '#93c5fd',
  'bg-blue-400': '#60a5fa',
  'bg-blue-500': '#3b82f6',
  'bg-blue-600': '#2563eb',
  'bg-blue-700': '#1d4ed8',
  'bg-blue-800': '#1e40af',
  'bg-blue-900': '#1e3a8a',
  
  // Green colors
  'bg-green-50': '#f0fdf4',
  'bg-green-100': '#dcfce7',
  'bg-green-200': '#bbf7d0',
  'bg-green-300': '#86efac',
  'bg-green-400': '#4ade80',
  'bg-green-500': '#22c55e',
  'bg-green-600': '#16a34a',
  'bg-green-700': '#15803d',
  'bg-green-800': '#166534',
  'bg-green-900': '#14532d',
  
  // Yellow colors
  'bg-yellow-50': '#fefce8',
  'bg-yellow-100': '#fef3c7',
  'bg-yellow-200': '#fde68a',
  'bg-yellow-300': '#fcd34d',
  'bg-yellow-400': '#fbbf24',
  'bg-yellow-500': '#f59e0b',
  'bg-yellow-600': '#d97706',
  'bg-yellow-700': '#b45309',
  'bg-yellow-800': '#92400e',
  'bg-yellow-900': '#78350f',
  
  // Text colors
  'text-gray-600': '#4b5563',
  'text-gray-700': '#374151',
  'text-gray-800': '#1f2937',
  'text-gray-900': '#111827',
  'text-blue-600': '#2563eb',
  'text-blue-700': '#1d4ed8',
  'text-blue-800': '#1e40af',
  'text-green-600': '#16a34a',
  'text-green-700': '#15803d',
  'text-yellow-800': '#92400e',
  'text-white': '#ffffff',
  'text-black': '#000000',
  
  // Common colors
  'bg-white': '#ffffff',
  'bg-black': '#000000',
};

/**
 * Generate CSS rules for PDF-safe colors
 */
export function generatePDFSafeCSS(): string {
  const rules = Object.entries(tailwindColorMap).map(([className, hexColor]) => {
    const property = className.startsWith('bg-') ? 'background-color' : 'color';
    return `.${className} { ${property}: ${hexColor} !important; }`;
  });
  
  return `
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-scheme: light !important;
    }
    ${rules.join('\n    ')}
    .shadow-sm, .shadow-md, .shadow-lg { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important; }
    .rounded, .rounded-md, .rounded-lg { border-radius: 0.375rem !important; }
    .border { border-width: 1px !important; border-style: solid !important; border-color: #d1d5db !important; }
    
    /* Force basic styling for common elements */
    body { background-color: #ffffff !important; color: #1f2937 !important; }
    div { background-color: inherit !important; }
    pre { background-color: #f9fafb !important; color: #1f2937 !important; }
    code { background-color: #f3f4f6 !important; color: #1f2937 !important; }
    
    /* Remove any CSS custom properties that might cause issues */
    * {
      --tw-bg-opacity: 1 !important;
      --tw-text-opacity: 1 !important;
    }
  `;
}

/**
 * Clean up problematic styles from a cloned document for PDF generation
 */
export function cleanupStylesForPDF(clonedDoc: Document): void {
  // Remove ALL existing stylesheets to start fresh
  const existingStyles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
  existingStyles.forEach(el => {
    el.remove();
  });
  
  // Remove all inline styles that might contain unsupported functions
  const elementsWithStyle = clonedDoc.querySelectorAll('[style]');
  elementsWithStyle.forEach(el => {
    el.removeAttribute('style');
  });
  
  // Remove CSS custom properties and classes that might cause issues
  const allElements = clonedDoc.querySelectorAll('*');
  allElements.forEach(el => {
    // Remove problematic classes
    const classList = Array.from(el.classList);
    classList.forEach(className => {
      if (className.includes('dark:') || className.includes('hover:') || className.includes('focus:')) {
        el.classList.remove(className);
      }
    });
  });
  
  // Add our PDF-safe styles
  const style = clonedDoc.createElement('style');
  style.textContent = generatePDFSafeCSS();
  clonedDoc.head.appendChild(style);
  
  // Force a white background on the body
  if (clonedDoc.body) {
    clonedDoc.body.style.backgroundColor = '#ffffff';
    clonedDoc.body.style.color = '#1f2937';
  }
} 