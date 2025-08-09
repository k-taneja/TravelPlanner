import { Loader } from '@googlemaps/js-api-loader';

// Google Maps API key configuration with proper fallbacks

let googleMapsLoader: Loader | null = null;
let isLoaded = false;

export const initializeGoogleMaps = async () => {
  // Get API key from environment variable (configured in Bolt.new)
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    console.error('Google Maps API key not configured in environment variables');
    throw new Error('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your environment variables.');
  }

  if (isLoaded) {
    return window.google;
  }

  if (!googleMapsLoader) {
    googleMapsLoader = new Loader({
      apiKey: apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry'],
      // Add additional configuration for better error handling
      language: 'en',
      region: 'US'
    });
  }

  try {
    console.log('Loading Google Maps API...');
    const google = await googleMapsLoader.load();
    isLoaded = true;
    console.log('Google Maps API loaded successfully');
    return google;
  } catch (error) {
    console.error('Error loading Google Maps API:', error);
    
    // Provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes('InvalidKeyMapError')) {
        throw new Error('Invalid Google Maps API key. Please check your API key configuration.');
      } else if (error.message.includes('RefererNotAllowedMapError')) {
        throw new Error('Domain not allowed for this API key. Please check your API key restrictions.');
      } else if (error.message.includes('QuotaExceededError')) {
        throw new Error('Google Maps API quota exceeded. Please check your usage limits.');
      }
    }
    
    throw new Error(`Google Maps API failed to load: ${error}`);
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