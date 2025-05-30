import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cleanupStylesForPDF } from '../utils/colorUtils';

interface ExportPDFButtonProps {
  selectedLeftQueryId: string;
  selectedRightQueryId: string;
  selectedSection: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export default function ExportPDFButton({
  selectedLeftQueryId,
  selectedRightQueryId,
  selectedSection,
  contentRef
}: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const generatePDF = async () => {
    if (!contentRef.current) {
      alert('No content to export');
      return;
    }

    setIsExporting(true);
    
    try {
      // Create canvas with minimal configuration to avoid CSS parsing issues
      const canvas = await html2canvas(contentRef.current, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
        foreignObjectRendering: false,
        imageTimeout: 0,
        ignoreElements: (element) => {
          // Skip elements that might cause issues
          return element.tagName === 'SCRIPT' || 
                 element.tagName === 'STYLE' ||
                 element.classList.contains('no-pdf');
        },
        onclone: (clonedDoc) => {
          try {
            // Use the enhanced cleanup function
            cleanupStylesForPDF(clonedDoc);
          } catch (error) {
            console.warn('Style cleanup failed, continuing with basic cleanup:', error);
            // Fallback: just remove all styles
            const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
            styles.forEach(el => el.remove());
          }
        }
      });

      const imgData = canvas.toDataURL('image/png', 0.8);
      
      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Add header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Query Profile Comparison Report', 20, 20);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Source: ${selectedLeftQueryId}`, 20, 35);
      pdf.text(`Target: ${selectedRightQueryId}`, 20, 45);
      pdf.text(`Section: ${selectedSection}`, 20, 55);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 65);
      
      // Add line separator
      pdf.setLineWidth(0.5);
      pdf.line(20, 70, 190, 70);
      
      position = 80;

      // Add the comparison content
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - position;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + (pageHeight - position);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `query-comparison-${selectedLeftQueryId}-vs-${selectedRightQueryId}-${selectedSection}-${timestamp}.pdf`;
      
      // Save the PDF
      pdf.save(filename);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Try an even simpler fallback approach
      try {
        console.log('Trying ultra-simple fallback PDF generation...');
        
        // Create a simple clone without any CSS processing
        const simpleCanvas = await html2canvas(contentRef.current, {
          scale: 0.8,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: false,
          allowTaint: true,
          foreignObjectRendering: false,
          onclone: (clonedDoc) => {
            // Ultra-simple cleanup: just remove all styles and set basic colors
            const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
            styles.forEach(el => el.remove());
            
            const allElements = clonedDoc.querySelectorAll('*');
            allElements.forEach(el => {
              el.removeAttribute('style');
              el.removeAttribute('class');
            });
            
            // Set basic styling
            if (clonedDoc.body) {
              clonedDoc.body.style.backgroundColor = '#ffffff';
              clonedDoc.body.style.color = '#000000';
              clonedDoc.body.style.fontFamily = 'Arial, sans-serif';
            }
          }
        });

        const imgData = simpleCanvas.toDataURL('image/png', 0.8);
        
        // Calculate dimensions
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (simpleCanvas.height * imgWidth) / simpleCanvas.width;
        
        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Add header
        pdf.setFontSize(16);
        pdf.text('Query Profile Comparison Report', 20, 20);
        pdf.setFontSize(10);
        pdf.text(`Source: ${selectedLeftQueryId}`, 20, 30);
        pdf.text(`Target: ${selectedRightQueryId}`, 20, 35);
        pdf.text(`Section: ${selectedSection}`, 20, 40);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
        
        // Add the content
        pdf.addImage(imgData, 'PNG', 0, 50, imgWidth, imgHeight);
        
        // Generate filename
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const filename = `query-comparison-${selectedLeftQueryId}-vs-${selectedRightQueryId}-${selectedSection}-${timestamp}.pdf`;
        
        // Save the PDF
        pdf.save(filename);
        
      } catch (fallbackError) {
        console.error('Even the fallback PDF generation failed:', fallbackError);
        alert('Failed to generate PDF. This might be due to browser compatibility issues with modern CSS features. Please try refreshing the page and trying again.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={isExporting || !selectedLeftQueryId || !selectedRightQueryId}
      className={`
        inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200
        ${isExporting 
          ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
          : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
        }
        ${(!selectedLeftQueryId || !selectedRightQueryId) 
          ? 'opacity-50 cursor-not-allowed' 
          : ''
        }
      `}
    >
      {isExporting ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Generating PDF...
        </>
      ) : (
        <>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export PDF
        </>
      )}
    </button>
  );
} 