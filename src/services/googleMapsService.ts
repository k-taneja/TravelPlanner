import { Loader } from '@googlemaps/js-api-loader';
import { supabase } from '../lib/supabase';

// Google Maps API key is configured in Supabase Edge Functions

let googleMapsLoader: Loader | null = null;
let isLoaded = false;
let cachedApiKey: string | null = null;

export const initializeGoogleMaps = async () => {
  // Try to get API key from Supabase Edge Function
  let apiKey: string;
  
  try {
    // Use cached key if available
    if (cachedApiKey) {
      apiKey = cachedApiKey;
    } else {
      // Get API key from Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('google-maps-config');
      
      if (error || !data?.available) {
        // Fallback to environment variable
        apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
          console.warn('Google Maps API key not available, maps will not function');
          throw new Error('Google Maps API key not configured');
        }
      } else {
        apiKey = data.apiKey;
        cachedApiKey = apiKey; // Cache for future use
      }
    }
  } catch (error) {
    console.error('Error getting Google Maps config:', error);
    // Final fallback to environment variable
    apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      console.warn('Google Maps API key not available, maps will not function');
      throw new Error('Google Maps API key not configured');
    }
  }

  if (isLoaded) {
    return window.google;
  }

  if (!googleMapsLoader) {
    googleMapsLoader = new Loader({
      apiKey: apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry']
    });
  }

  try {
    const google = await googleMapsLoader.load();
    isLoaded = true;
    return google;
  } catch (error) {
    console.error('Error loading Google Maps:', error);
    throw error;
  }
};

export const geocodeAddress = async (address: string) => {
  const google = await initializeGoogleMaps();
  const geocoder = new google.maps.Geocoder();

  return new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results) {
        resolve(results);
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
};

export const getPlaceDetails = async (placeId: string) => {
  const google = await initializeGoogleMaps();
  const service = new google.maps.places.PlacesService(document.createElement('div'));

  return new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
    service.getDetails(
      {
        placeId,
        fields: ['name', 'formatted_address', 'geometry', 'photos', 'rating', 'reviews']
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(place);
        } else {
          reject(new Error(`Place details failed: ${status}`));
        }
      }
    );
  });
};

export const searchNearbyPlaces = async (
  location: google.maps.LatLng,
  radius: number,
  type: string
) => {
  const google = await initializeGoogleMaps();
  const service = new google.maps.places.PlacesService(document.createElement('div'));

  return new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
    service.nearbySearch(
      {
        location,
        radius,
        type: type as any
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else {
          reject(new Error(`Nearby search failed: ${status}`));
        }
      }
    );
  });
};