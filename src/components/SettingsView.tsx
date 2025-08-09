import React from 'react';
import { ArrowLeft, Shield, Trash2, MessageSquare, HelpCircle } from 'lucide-react';

interface SettingsViewProps {
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
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
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="px-6 py-8 space-y-8">
        {/* Privacy Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Privacy & Data
          </h2>
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Store Trip Data</h3>
                  <p className="text-sm text-gray-600">Save your trips for offline access</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          <div className="space-y-3">
            <button className="w-full bg-white rounded-xl p-4 border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md">
              <div className="flex items-center">
                <Trash2 className="h-5 w-5 mr-3 text-gray-400" />
                <span className="font-medium text-gray-900">Delete Current Trip</span>
              </div>
            </button>
            <button className="w-full bg-white rounded-xl p-4 border border-red-200 flex items-center justify-between hover:bg-red-50 transition-all duration-200 shadow-sm hover:shadow-md">
              <div className="flex items-center">
                <Trash2 className="h-5 w-5 mr-3 text-red-500" />
                <span className="font-medium text-red-600">Delete Account</span>
              </div>
            </button>
          </div>
        </div>

        {/* Support */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Support</h2>
          <div className="space-y-3">
            <button className="w-full bg-white rounded-xl p-4 border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md">
              <div className="flex items-center">
                <HelpCircle className="h-5 w-5 mr-3 text-gray-400" />
                <span className="font-medium text-gray-900">Help Center</span>
              </div>
            </button>
            <button className="w-full bg-white rounded-xl p-4 border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md">
              <div className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-3 text-gray-400" />
                <span className="font-medium text-gray-900">Send Feedback</span>
              </div>
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="text-center text-gray-500 text-sm">
          <p>Planora v1.0.0</p>
          <p>Made with ❤️ for travelers</p>
        </div>
      </div>
    </div>
  );
};