import React, { useState, useEffect } from 'react';
import { Loader2, MapPin, Route, Calendar, Plane, User } from 'lucide-react';
import { travelQuotes } from '../data/mockData';

interface LoadingScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete, onBack }) => {
  const [progress, setProgress] = useState(0);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [stage, setStage] = useState(0);

  const stages = [
    { text: 'Gathering spots...', icon: MapPin },
    { text: 'Optimizing routes...', icon: Route },
    { text: 'Finalizing plan...', icon: Calendar }
  ];

  useEffect(() => {
    const duration = 4000; // 4 seconds total
    const interval = 50;
    const increment = 100 / (duration / interval);

    const progressTimer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + increment;
        
        // Update stage based on progress
        if (newProgress > 33 && stage === 0) setStage(1);
        if (newProgress > 66 && stage === 1) setStage(2);
        
        if (newProgress >= 100) {
          clearInterval(progressTimer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return newProgress;
      });
    }, interval);

    // Rotate quotes
    const quoteTimer = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % travelQuotes.length);
    }, 2000);

    return () => {
      clearInterval(progressTimer);
      clearInterval(quoteTimer);
    };
  }, [onComplete, stage]);

  const CurrentStageIcon = stages[stage].icon;

  return (
    <div className="min-h-screen bg-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Fixed Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={onBack}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
            >
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#ff497c' }}>
                <Plane className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Planora</span>
            </button>

            {/* Right Icons */}
            <div className="flex items-center space-x-3">
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-200">
                <User className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Loading Content */}
      <div className="pt-16 min-h-screen flex flex-col items-center justify-center px-6">
      {/* Main Animation */}
      <div className="text-center mb-12">
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse border border-white/20">
            <CurrentStageIcon className="h-12 w-12 text-white animate-bounce" style={{ color: '#ff497c' }} />
          </div>
          <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: '#ff497c' }} />
        </div>

        <h2 className="text-2xl font-bold text-white mb-4">
          {stages[stage].text}
        </h2>
        
        <div className="w-64 bg-white/20 rounded-full h-3 mx-auto mb-6">
          <div 
            className="h-3 rounded-full transition-all duration-300 ease-out shadow-sm"
            style={{ backgroundColor: '#ff497c', width: `${progress}%` }}
          />
        </div>

        <p className="text-lg text-white/90 max-w-xs mx-auto leading-relaxed">
          "{travelQuotes[currentQuote]}"
        </p>
      </div>

      {/* Bottom Tips */}
      <div className="absolute bottom-8 left-6 right-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <p className="text-white/70 text-sm text-center">
            💡 Tip: Your itinerary will be saved offline for easy access during your trip
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};