import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generates a PDF from a DOM element
 * @param {string} orderId - The order ID to use in the filename
 * @param {HTMLElement|string} element - The DOM element or element ID to convert to PDF
 * @returns {Promise<boolean>} - True if PDF generation was successful
 */
export const generateOrderPDF = async (orderId, element) => {
  try {
    // If element is a string (ID), get the DOM element
    const targetElement = typeof element === 'string' 
      ? document.getElementById(element)
      : element;
      
    if (!targetElement) {
      console.error('Element not found for PDF generation');
      return false;
    }
    
    // Create canvas from the element
    const canvas = await html2canvas(targetElement, { 
      scale: 2, // Higher scale for better quality
      logging: false,
      useCORS: true, // Enable cross-origin images
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    // Create PDF with A4 dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Convert canvas to image
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    // Add image to first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    // Add new pages if content overflows
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Save the PDF
    pdf.save(`order-${orderId}.pdf`);
    
    return true;
  } catch (error) {
    console.error('PDF generation failed:', error);
    return false;
  }
};