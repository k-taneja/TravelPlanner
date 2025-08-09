import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { TripWizard } from './components/TripWizard';
import { LoadingScreen } from './components/LoadingScreen';
import { ItineraryView } from './components/ItineraryView';
import { MapView } from './components/MapView';
import { ShareView } from './components/ShareView';
import { SettingsPage } from './components/SettingsPage';
import { OfflineView } from './components/OfflineView';
import { BottomNavigation } from './components/BottomNavigation';
import { ResetPasswordView } from './components/ResetPasswordView';
import { AppScreen } from './types';

function App() {
  const { user, loading: authLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('login');
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Auto-login if user is authenticated
  useEffect(() => {
    if (!authLoading && user && currentScreen === 'login') {
      setCurrentScreen('dashboard');
    }
  }, [user, authLoading, currentScreen]);

  // Check for password reset in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    if (type === 'recovery') {
      setShowResetPassword(true);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = () => {
    setCurrentScreen('dashboard');
  };

  const handleResetPasswordComplete = () => {
    setShowResetPassword(false);
    setCurrentScreen('dashboard');
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleBackToLogin = () => {
    setShowResetPassword(false);
    setCurrentScreen('login');
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handlePlanNewTrip = () => {
    setCurrentScreen('wizard');
  };

  const handleViewItineraries = () => {
    // This would show a list of itineraries
    console.log('Navigate to itineraries list');
  };

  const handleViewItinerary = (tripId: string) => {
    setCurrentTripId(tripId);
    setCurrentScreen('itinerary');
  };

  const handleSavedDestinations = () => {
    // This would navigate to a saved destinations screen
    console.log('Navigate to saved destinations');
  };

  const handleOfflineMode = () => {
    setCurrentScreen('offline');
  };

  const handleWizardComplete = (data: any) => {
    if (typeof data === 'string') {
      // data is tripId
      setCurrentTripId(data);
    }
    setCurrentScreen('loading');
  };

  const handleLoadingComplete = () => {
    setCurrentScreen('itinerary');
  };

  const handleBackToHome = () => {
    setCurrentScreen('dashboard');
  };

  const handleEditTrip = () => {
    setCurrentScreen('wizard');
  };

  const handleShowMap = () => {
    setCurrentScreen('map');
  };

  const handleBackToItinerary = () => {
    setCurrentScreen('dashboard');
  };

  const handleLogout = async () => {
    if (user) {
      const { signOut } = await import('./hooks/useAuth');
      // In a real app, you'd call signOut() here
    }
    setCurrentScreen('login');
  };

  const handleScreenChange = (screen: AppScreen) => {
    // Check if user is offline and trying to access online features
    if (!isOnline && ['map', 'share'].includes(screen)) {
      setCurrentScreen('offline');
      return;
    }
    setCurrentScreen(screen);
  };

  const handleOpenSettings = () => {
    setCurrentScreen('settings');
  };

  // For preview - show itinerary directly
  // Commented out for login page preview
  // if (currentScreen === 'login') {
  //   setCurrentScreen('itinerary');
  // }

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Show password reset screen if needed
  if (showResetPassword) {
    return (
      <ResetPasswordView 
        onComplete={handleResetPasswordComplete}
        onBack={handleBackToLogin}
      />
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginView onLogin={handleLogin} />;
      
      case 'dashboard':
        return (
          <DashboardView 
            onPlanNewTrip={handlePlanNewTrip}
            onViewItinerary={handleViewItinerary}
            onSavedDestinations={handleSavedDestinations}
            onOfflineMode={handleOfflineMode}
            onLogout={handleLogout}
            onSettings={handleOpenSettings}
          />
        );
      
      case 'wizard':
        return (
          <TripWizard 
            onComplete={handleWizardComplete}
            onBack={handleBackToHome}
          />
        );
      
      case 'loading':
        return <LoadingScreen onComplete={handleLoadingComplete} onBack={handleBackToHome} />;
      
      case 'itinerary':
        return (
          <ItineraryView 
            tripId={currentTripId}
            onEditTrip={handleEditTrip}
            onShowMap={handleShowMap}
            onBack={handleBackToHome}
            onLogout={handleLogout}
          />
        );
      
      case 'map':
        return <MapView onBack={handleBackToItinerary} tripData={null} />;
      
      case 'share':
        return <ShareView onBack={handleBackToItinerary} />;
      
      case 'settings':
        return <SettingsPage onBack={handleBackToItinerary} />;
      
      case 'offline':
        return <OfflineView onBack={handleBackToItinerary} />;
      
      default:
        return <LoginView onLogin={handleLogin} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {renderScreen()}
    </div>
  );
}

export default App;