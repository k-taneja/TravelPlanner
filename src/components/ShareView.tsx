import React, { useState } from 'react';
import { ArrowLeft, Share2, MessageCircle, Download, Copy, Check, AlertCircle, FileText } from 'lucide-react';
import { pdfService } from '../services/pdfService';

interface ShareViewProps {
  onBack: () => void;
}

export const ShareView: React.FC<ShareViewProps> = ({ onBack }) => {
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      // Mock trip data for demo
      const mockTripData = {
        id: 'demo-trip',
        destination: 'Paris, France',
        startDate: '2025-03-15',
        endDate: '2025-03-18',
        budget: 100000,
        totalCost: 92,
        pace: 'balanced',
        interests: ['history', 'food', 'art'],
        dayPlans: [
          {
            day_number: 1,
            date: '2025-03-15',
            total_cost: 92,
            total_duration: 390,
            activities: [
              {
                time: '09:00',
                name: 'Eiffel Tower Visit',
                type: 'attraction',
                description: 'Iconic iron tower with city views',
                duration: 120,
                cost: 25,
                location_address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris',
                why_this: 'Most iconic landmark in Paris, best views in the morning with fewer crowds'
              },
              {
                time: '12:30',
                name: 'Café de Flore Lunch',
                type: 'food',
                description: 'Historic café with French cuisine',
                duration: 90,
                cost: 35,
                location_address: '172 Boulevard Saint-Germain, 75006 Paris',
                why_this: 'Famous literary café, perfect for experiencing Parisian culture'
              },
              {
                time: '15:00',
                name: 'Louvre Museum',
                type: 'attraction',
                description: 'World\'s largest art museum',
                duration: 180,
                cost: 17,
                location_address: 'Rue de Rivoli, 75001 Paris',
                why_this: 'Must-see art collection including Mona Lisa, afternoon has shorter lines'
              }
            ]
          }
        ]
      };

      await pdfService.generateTripPDF(mockTripData);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 flex items-center">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200 mr-3"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Share Feature</h1>
        </div>
      </div>

      <div className="px-6 py-8">
        {/* PDF Download Feature */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center mb-4">
            <FileText className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-lg font-bold text-gray-900">Download Your Itinerary</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Get a beautifully formatted PDF of your complete travel itinerary. Perfect for offline access during your trip.
          </p>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className={`w-full p-4 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 font-semibold ${
              pdfLoading
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[0.98]'
            }`}
          >
            {pdfLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                <span>Download PDF Itinerary</span>
              </>
            )}
          </button>
          <div className="mt-4 bg-blue-50 rounded-lg p-3">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm">PDF Features:</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Complete day-by-day itinerary</li>
              <li>• Activity details and timings</li>
              <li>• Budget breakdown and costs</li>
              <li>• Location addresses for easy navigation</li>
              <li>• Optimized for mobile and print</li>
            </ul>
          </div>
        </div>

        {/* Share Options Notice */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-orange-500" />
          </div>
          <h3 className="text-lg font-bold text-orange-900 mb-2">Online Sharing Coming Soon</h3>
          <p className="text-orange-700 text-sm">
            Social sharing features are being optimized. For now, download your PDF to share with friends and family.
          </p>
        </div>
      </div>
    </div>
  );
};