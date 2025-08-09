import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { tripService } from '../services/tripService';
import { pdfService } from '../services/pdfService';
import { UserDrawer } from './UserDrawer';
import { Search, Bell, User, Plane, Calendar, MapPin, Wifi, Clock } from 'lucide-react';

interface DashboardViewProps {
  onPlanNewTrip: () => void;
  onViewItinerary: (tripId: string) => void;
  onSavedDestinations: () => void;
  onOfflineMode: () => void;
  onLogout: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onPlanNewTrip,
  onViewItinerary,
  onSavedDestinations,
  onOfflineMode,
  onLogout
}) => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [showUserDrawer, setShowUserDrawer] = useState(false);

  // Load user trips from database
  useEffect(() => {
    const loadTrips = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userTrips = await tripService.getUserTrips(user.id);
        
        // Transform database trips to UI format
        const transformedTrips = userTrips.map(trip => {
          const startDate = new Date(trip.start_date);
          const endDate = new Date(trip.end_date);
          const today = new Date();
          
          let status = 'upcoming';
          let statusText = '';
          
          if (today > endDate) {
            status = 'completed';
            statusText = 'Trip completed';
          } else if (today >= startDate && today <= endDate) {
            status = 'in-progress';
            statusText = 'Currently traveling';
          } else {
            const daysToGo = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            statusText = `${daysToGo} days to go`;
          }
          
          // Get destination image based on location
          const getDestinationImage = (destination: string) => {
            const images: { [key: string]: string } = {
              'paris': 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=400',
              'tokyo': 'https://images.pexels.com/photos/248195/pexels-photo-248195.jpeg?auto=compress&cs=tinysrgb&w=400',
              'bali': 'https://images.pexels.com/photos/2474690/pexels-photo-2474690.jpeg?auto=compress&cs=tinysrgb&w=400',
              'rome': 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&w=400',
              'barcelona': 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=400',
              'london': 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=400',
              'new york': 'https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=400',
              'dubai': 'https://images.pexels.com/photos/1470405/pexels-photo-1470405.jpeg?auto=compress&cs=tinysrgb&w=400'
            };
            
            const key = destination.toLowerCase();
            for (const [city, image] of Object.entries(images)) {
              if (key.includes(city)) {
                return image;
              }
            }
            // Default travel image
            return 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&cs=tinysrgb&w=400';
          };
          
          return {
            id: trip.id,
            destination: trip.destination,
            dates: `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            status,
            statusText,
            image: getDestinationImage(trip.destination),
            description: `${trip.pace.charAt(0).toUpperCase() + trip.pace.slice(1)} paced adventure`,
            budget: trip.budget,
            totalCost: trip.total_cost
          };
        });
        
        setTrips(transformedTrips);
      } catch (err) {
        console.error('Error loading trips:', err);
        setError('Failed to load trips');
        // Show mock data as fallback for guest users
        setTrips([
          {
            id: 'mock-1',
            destination: "Paris, France",
            dates: "Mar 15 - Mar 18",
            status: "upcoming",
            statusText: "5 days to go",
            image: "https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=400",
            description: "Romantic city of lights awaits"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadTrips();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return '#ff497c';
      case 'in-progress':
        return '#10b981';
      case 'completed':
        return '#6b7280';
      default:
        return '#ff497c';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'UPCOMING';
      case 'in-progress':
        return 'IN PROGRESS';
      case 'completed':
        return 'COMPLETED';
      default:
        return 'UPCOMING';
    }
  };

  const handleDownloadTripPDF = async (trip: any) => {
    setPdfLoading(trip.id);
    try {
      console.log('Generating PDF for trip:', trip);
      
      // Convert trip data to PDF format
      const pdfData = {
        id: trip.id,
        destination: trip.destination,
        start_date: '2025-03-15', // Mock data for demo
        end_date: '2025-03-18',   // Mock data for demo
        budget: trip.budget || 100000,
        totalCost: trip.total_cost || 92,
        pace: trip.pace || 'balanced',
        interests: trip.interests || ['history', 'food', 'art'],
        dayPlans: trip.dayPlans || [
          {
            day_number: 1,
            date: '2025-03-15',
            total_cost: trip.total_cost || 92,
            total_duration: 390,
            activities: [
              {
                time: '09:00',
                name: `Explore ${trip.destination}`,
                type: 'attraction',
                description: `Discover the main attractions of ${trip.destination}`,
                duration: 120,
                cost: 25,
                location_address: `Main Area, ${trip.destination}`,
                why_this: `Perfect introduction to ${trip.destination}`
              },
              {
                time: '12:30',
                name: 'Local Cuisine Experience',
                type: 'food',
                description: `Authentic local food experience in ${trip.destination}`,
                duration: 90,
                cost: 35,
                location_address: `Food District, ${trip.destination}`,
                why_this: 'Experience local flavors and culinary traditions'
              },
              {
                time: '15:00',
                name: 'Cultural Site Visit',
                type: 'history',
                description: `Historical and cultural landmarks of ${trip.destination}`,
                duration: 150,
                cost: 17,
                location_address: `Heritage Area, ${trip.destination}`,
                why_this: 'Rich history and culture matching your interests'
              }
            ]
          }
        ]
      };

      console.log('PDF data prepared:', pdfData);
      await pdfService.generateTripPDF(pdfData);
      console.log('PDF generated successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.';
      alert(errorMessage);
    } finally {
      setPdfLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Fixed Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#ff497c' }}>
                <Plane className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Planora</span>
            </div>

            {/* Right Icons */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowUserDrawer(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-200"
                title="Account Menu"
              >
                <User className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section */}
        <section className="bg-slate-900 py-20 lg:py-32">
          <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(to right, #ff497c, #a855f7)' }}>
                  Your trip, Your way
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
                Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! Our intelligent travel planner creates itineraries that match your budget, time, and interests.<br />
                No stress, no endless searches – just effortless, personalized travel planning.
              </p>
              <button
                onClick={onPlanNewTrip}
                className="relative inline-flex items-center justify-center px-12 py-4 text-lg font-semibold text-white bg-transparent border-2 rounded-full transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 group"
                style={{ 
                  borderColor: '#ff497c',
                  '--tw-ring-color': '#ff497c'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ff497c'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span>PLAN A TRIP</span>
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300" style={{ backgroundImage: 'linear-gradient(to right, #ff497c, #a855f7)' }}></div>
              </button>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <section className="bg-gray-50 px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-7xl mx-auto">
            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#ff497c' }}></div>
                <p className="text-gray-600">Loading your trips...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-12">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={onPlanNewTrip}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                  >
                    Create Your First Trip
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && trips.length === 0 && (
              <div className="text-center py-12">
                <div className="bg-white rounded-2xl p-8 max-w-md mx-auto shadow-sm border border-gray-100">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plane className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No trips yet</h3>
                  <p className="text-gray-600 mb-6">Start planning your first adventure!</p>
                  <button
                    onClick={onPlanNewTrip}
                    className="px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                    style={{ backgroundColor: '#ff497c' }}
                  >
                    Plan Your First Trip
                  </button>
                </div>
              </div>
            )}
            {/* Trip Cards Grid */}
            {!loading && !error && trips.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.map((trip) => (
                  <div
                    key={trip.id}
                    onClick={() => onViewItinerary(trip.id.toString())}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group transform hover:-translate-y-1"
                  >
                    <div className="relative h-48">
                      <img
                        src={trip.image}
                        alt={trip.destination}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                      
                      {/* Status Badge */}
                      <div className="absolute top-4 left-4">
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: getStatusColor(trip.status) }}
                        >
                          {getStatusLabel(trip.status)}
                        </span>
                      </div>
                      
                      {/* Trip Info Overlay */}
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <h3 className="font-bold text-lg mb-1">{trip.destination}</h3>
                        <p className="text-sm opacity-90 mb-2">{trip.description}</p>
                      </div>
                    </div>
                    
                    {/* Card Footer */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">{trip.dates}</p>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" style={{ color: getStatusColor(trip.status) }} />
                            <span className="text-sm font-medium" style={{ color: getStatusColor(trip.status) }}>
                              {trip.statusText}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewItinerary(trip.id.toString());
                          }}
                          className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-200"
                        >
                          View Details
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadTripPDF(trip);
                          }}
                          disabled={pdfLoading === trip.id}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                            pdfLoading === trip.id
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {pdfLoading === trip.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                          ) : (
                            'PDF'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* User Drawer */}
      <UserDrawer 
        isOpen={showUserDrawer}
        onClose={() => setShowUserDrawer(false)}
        onSignOut={onLogout}
      />
    </div>
  );
};