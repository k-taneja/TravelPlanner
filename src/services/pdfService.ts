import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface TripPDFData {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  totalCost: number;
  pace: string;
  interests: string[];
  dayPlans: Array<{
    day_number: number;
    date: string;
    total_cost: number;
    total_duration: number;
    activities: Array<{
      time: string;
      name: string;
      type: string;
      description: string;
      duration: number;
      cost: number;
      location_address: string;
      why_this: string;
    }>;
  }>;
}

export const pdfService = {
  async generateTripPDF(tripData: TripPDFData): Promise<void> {
    try {
      // Create new PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Helper function to wrap text
      const wrapText = (text: string, maxWidth: number, fontSize: number) => {
        pdf.setFontSize(fontSize);
        return pdf.splitTextToSize(text, maxWidth);
      };

      // Header with branding
      pdf.setFillColor(255, 73, 124); // #ff497c
      pdf.rect(0, 0, pageWidth, 30, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Planora', margin, 20);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Your Personalized Travel Itinerary', margin, 26);

      yPosition = 45;

      // Trip Title
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      const titleLines = wrapText(tripData.destination, contentWidth, 20);
      titleLines.forEach((line: string) => {
        pdf.text(line, margin, yPosition);
        yPosition += 8;
      });
      yPosition += 5;

      // Trip Overview
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Trip Overview', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      };

      const overviewData = [
        `Dates: ${formatDate(tripData.startDate)} - ${formatDate(tripData.endDate)}`,
        `Budget: ₹${tripData.budget.toLocaleString('en-IN')}`,
        `Total Cost: ₹${(tripData.totalCost * 83).toLocaleString('en-IN')}`,
        `Travel Pace: ${tripData.pace.charAt(0).toUpperCase() + tripData.pace.slice(1)}`,
        `Interests: ${tripData.interests.join(', ')}`
      ];

      overviewData.forEach(item => {
        checkPageBreak(6);
        pdf.text(item, margin, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Daily Itinerary
      tripData.dayPlans.forEach((day, dayIndex) => {
        checkPageBreak(20);

        // Day header
        pdf.setFillColor(248, 250, 252); // Light gray background
        pdf.rect(margin, yPosition - 5, contentWidth, 15, 'F');
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        
        const dayTitle = `Day ${day.day_number} - ${new Date(day.date).toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'long', 
          day: 'numeric' 
        })}`;
        pdf.text(dayTitle, margin + 5, yPosition + 5);
        
        // Day summary
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        const daySummary = `${Math.floor((day.total_duration || 0) / 60)}h ${(day.total_duration || 0) % 60}m • ₹${(day.total_cost || 0).toLocaleString('en-IN')}`;
        pdf.text(daySummary, margin + 5, yPosition + 10);
        
        yPosition += 20;

        // Activities
        day.activities.forEach((activity, activityIndex) => {
          checkPageBreak(25);

          // Activity time and name
          pdf.setTextColor(255, 73, 124); // Brand color
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          
          const formatTime = (time: string) => {
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
          };

          pdf.text(formatTime(activity.time), margin, yPosition);
          
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          const activityNameLines = wrapText(activity.name, contentWidth - 30, 12);
          activityNameLines.forEach((line: string, lineIndex: number) => {
            pdf.text(line, margin + 25, yPosition + (lineIndex * 5));
          });
          yPosition += Math.max(5, activityNameLines.length * 5);

          // Activity details
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(60, 60, 60);
          
          const descriptionLines = wrapText(activity.description, contentWidth - 25, 10);
          descriptionLines.forEach((line: string) => {
            checkPageBreak(4);
            pdf.text(line, margin + 25, yPosition);
            yPosition += 4;
          });

          // Activity metadata
          pdf.setTextColor(100, 100, 100);
          pdf.setFontSize(9);
          const metadata = `${activity.duration}min • ₹${activity.cost?.toLocaleString('en-IN') || '0'} • ${activity.type}`;
          pdf.text(metadata, margin + 25, yPosition);
          yPosition += 4;

          // Location
          if (activity.location_address) {
            const locationLines = wrapText(`📍 ${activity.location_address}`, contentWidth - 25, 9);
            locationLines.forEach((line: string) => {
              checkPageBreak(4);
              pdf.text(line, margin + 25, yPosition);
              yPosition += 4;
            });
          }

          // Why this activity
          if (activity.why_this) {
            checkPageBreak(8);
            pdf.setTextColor(255, 73, 124);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Why this?', margin + 25, yPosition);
            yPosition += 4;
            
            pdf.setTextColor(60, 60, 60);
            pdf.setFont('helvetica', 'normal');
            const whyLines = wrapText(activity.why_this, contentWidth - 25, 9);
            whyLines.forEach((line: string) => {
              checkPageBreak(4);
              pdf.text(line, margin + 25, yPosition);
              yPosition += 4;
            });
          }

          yPosition += 8; // Space between activities
        });

        yPosition += 5; // Space between days
      });

      // Footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Generated by Planora • Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        pdf.text(
          new Date().toLocaleDateString('en-IN'),
          pageWidth - margin,
          pageHeight - 10,
          { align: 'right' }
        );
      }

      // Generate filename
      const startDate = new Date(tripData.startDate);
      const formattedDate = startDate.toISOString().split('T')[0];
      const sanitizedDestination = tripData.destination.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Planora_${sanitizedDestination}_${formattedDate}.pdf`;

      // Save the PDF
      pdf.save(filename);

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  },

  async generateFromElement(elementId: string, filename: string): Promise<void> {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Element not found');
      }

      // Capture the element as canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(filename);

    } catch (error) {
      console.error('Error generating PDF from element:', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  }
};