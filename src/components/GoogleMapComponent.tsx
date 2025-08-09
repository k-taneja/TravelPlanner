import React, { useEffect, useRef, useState } from 'react';
import { initializeGoogleMaps } from '../services/googleMapsService';

interface Activity {
  id: string;
  name: string;
  time: string;
  location: {
    lat: number;
    lng: number;
  };
  duration?: number;
}

interface GoogleMapComponentProps {
  activities: Activity[];
  center: { lat: number; lng: number };
  zoom?: number;
}

export const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
  activities,
  center,
  zoom = 13
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        // Skip Google Maps initialization if API key is not properly configured
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
          console.warn('Google Maps API key not configured, showing fallback UI');
          setError('Google Maps not available - API key not configured');
          setLoading(false);
          return;
        }

        const google = await initializeGoogleMaps();
        
        if (!mapRef.current) return;

        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        setMap(mapInstance);
        setLoading(false);
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Google Maps not available - please configure API key');
        setLoading(false);
      }
    };

    initMap();
  }, [center, zoom]);

  useEffect(() => {
    if (!map || !activities.length) return;

    // Clear existing markers
    // Note: In a real app, you'd want to keep track of markers to clear them properly

    // Add markers for each activity
    activities.forEach((activity, index) => {
      const marker = new google.maps.Marker({
        position: activity.location,
        map,
        title: activity.name,
        label: {
          text: (index + 1).toString(),
          color: 'white',
          fontWeight: 'bold'
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 20,
          fillColor: '#ff497c',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: Inter, sans-serif;">
            <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">${activity.name}</h3>
            <p style="margin: 0; font-size: 12px; color: #666;">
              ${activity.time}${activity.duration ? ` • ${activity.duration}min` : ''}
            </p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    });

    // Fit map to show all markers
    if (activities.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      activities.forEach(activity => {
        bounds.extend(activity.location);
      });
      map.fitBounds(bounds);
    }
  }, [map, activities]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-800 rounded-xl border border-slate-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderColor: '#ff497c' }}></div>
          <p className="text-sm text-slate-300">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-800 rounded-xl border border-slate-600">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm text-slate-300 mb-2">Map View Unavailable</p>
          <p className="text-xs text-slate-500">Google Maps API configuration needed</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full rounded-xl" />;
};