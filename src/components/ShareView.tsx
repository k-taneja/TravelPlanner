import React, { useState } from 'react';
import { ArrowLeft, Share2, MessageCircle, Download, Copy, Check, AlertCircle } from 'lucide-react';

interface ShareViewProps {
  onBack: () => void;
}

export const ShareView: React.FC<ShareViewProps> = ({ onBack }) => {
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
        {/* Feature Disabled Notice */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-orange-900 mb-2">Share Feature Temporarily Disabled</h2>
          <p className="text-orange-700 mb-6">
            The trip sharing feature has been temporarily disabled for system optimization. 
            Your trips remain private and secure.
          </p>
          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <h3 className="font-semibold text-gray-900 mb-2">Alternative Options:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Take screenshots of your itinerary</li>
              <li>• Copy trip details manually</li>
              <li>• Export feature coming soon</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};