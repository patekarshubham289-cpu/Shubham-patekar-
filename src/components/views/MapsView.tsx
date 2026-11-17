import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { NearbyPlace } from '../../types';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import {
  MapPin,
  Phone,
  Navigation,
  Search,
  LocateFixed,
  Star,
  Globe,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

type FacilityCategory = 'All' | 'Hospital' | 'Pharmacy' | 'Clinic' | 'Diagnostic' | 'Blood Bank';

const MapViewportSync: React.FC<{ center: { lat: number; lng: number } }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (map && center) {
      map.panTo(center);
    }
  }, [map, center]);
  return null;
};

export const MapsView: React.FC = () => {
  const { getAuthToken, showToast } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<FacilityCategory>('All');
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 19.0760,
    lng: 72.8777,
  });
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [hasUserLocation, setHasUserLocation] = useState<boolean>(false);
  const [manualQuery, setManualQuery] = useState<string>('');
  const [activeSearchLabel, setActiveSearchLabel] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const userCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const API_KEY =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
    '';

  const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

  const fetchNearbyPlaces = useCallback(
    async (opts: { lat?: number; lng?: number; textQuery?: string; category?: FacilityCategory }) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const token = await getAuthToken();
        const cat = opts.category ?? selectedCategory;
        const res = await fetch('/api/places/nearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            lat: opts.lat,
            lng: opts.lng,
            textQuery: opts.textQuery,
            category: cat,
            radiusMeters: 8000,
          }),
        });

        const data = await res.json();

        // Case A Tier-2 quota check
        if (
          res.status === 429 ||
          data?.status === 'RESOURCE_EXHAUSTED' ||
          data?.code === 'RESOURCE_EXHAUSTED' ||
          String(data?.error || '').includes('RESOURCE_EXHAUSTED')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }

        if (!res.ok) {
          throw new Error(data.error || 'Unable to fetch nearby medical facilities.');
        }

        const fetched: NearbyPlace[] = Array.isArray(data.places) ? data.places : [];
        setPlaces(fetched);
        setSelectedPlace(null);

        if (data.center?.lat && data.center?.lng) {
          setMapCenter({ lat: data.center.lat, lng: data.center.lng });
        } else if (fetched[0]) {
          setMapCenter({ lat: fetched[0].lat, lng: fetched[0].lng });
        }
      } catch (err: any) {
        const msg = err?.message || 'Unable to reach location services.';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    },
    [getAuthToken, selectedCategory]
  );

  const requestDeviceLocation = useCallback(
    (categoryOverride?: FacilityCategory) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setGpsStatus('denied');
        setErrorMsg('Browser geolocation is unavailable. Enter a city or neighborhood below to search.');
        return;
      }

      setGpsStatus('requesting');
      setErrorMsg(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          };
          userCoordsRef.current = coords;
          setHasUserLocation(true);
          setGpsStatus('granted');
          setMapCenter(coords);
          setActiveSearchLabel(`Current GPS (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})`);
          fetchNearbyPlaces({
            lat: coords.lat,
            lng: coords.lng,
            category: categoryOverride ?? selectedCategory,
          });
        },
        () => {
          setGpsStatus('denied');
          setHasUserLocation(false);
          setErrorMsg(
            'Location permission was denied or timed out. Search by city, neighborhood, or ZIP code below.'
          );
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    },
    [fetchNearbyPlaces, selectedCategory]
  );

  useEffect(() => {
    requestDeviceLocation('All');
    // Only auto-trigger GPS lookup on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategoryChange = (cat: FacilityCategory) => {
    setSelectedCategory(cat);
    if (manualQuery.trim()) {
      fetchNearbyPlaces({ textQuery: manualQuery.trim(), category: cat });
    } else if (userCoordsRef.current) {
      fetchNearbyPlaces({
        lat: userCoordsRef.current.lat,
        lng: userCoordsRef.current.lng,
        category: cat,
      });
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    setActiveSearchLabel(manualQuery.trim());
    fetchNearbyPlaces({ textQuery: manualQuery.trim(), category: selectedCategory });
  };

  const categories: FacilityCategory[] = [
    'All',
    'Hospital',
    'Pharmacy',
    'Clinic',
    'Diagnostic',
    'Blood Bank',
  ];

  return (
    <div className="space-y-5 pb-24 text-white">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#181818] via-[#1c1825] to-[#181818] border border-purple-500/30 space-y-3 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <MapPin className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/30">
                GOOGLE MAPS &amp; PLACES API
              </span>
              <h1 className="text-2xl font-black text-white">Nearby Medical Facilities</h1>
              <p className="text-xs text-neutral-300">
                Live hospitals, pharmacies, clinics &amp; blood banks from Google Places — zero synthetic locations
              </p>
            </div>
          </div>

          <button
            onClick={() => requestDeviceLocation()}
            disabled={gpsStatus === 'requesting' || loading}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
          >
            <LocateFixed className="w-4 h-4" />
            {gpsStatus === 'requesting' ? 'Locating GPS...' : 'Use My GPS'}
          </button>
        </div>

        {/* Manual Area Search Fallback & Override */}
        <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="Search Indian city, locality or PIN code (e.g. Andheri West Mumbai, Koramangala Bengaluru, 411001 Pune)..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            type="submit"
            disabled={!manualQuery.trim() || loading}
            className="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-white/10 transition disabled:opacity-50"
          >
            Search Area
          </button>
        </form>

        {/* Quick Indian City Presets when GPS is off or testing */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
            Quick Search:
          </span>
          {['Mumbai', 'Pune', 'Bengaluru', 'New Delhi'].map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => {
                setManualQuery(city);
                setActiveSearchLabel(city);
                fetchNearbyPlaces({ textQuery: city, category: selectedCategory });
              }}
              className="px-2.5 py-1 rounded-lg bg-neutral-900/70 hover:bg-neutral-800 border border-white/10 text-[11px] font-semibold text-purple-300 transition"
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-purple-500 text-white shadow-md'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Error / Permission Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
          {gpsStatus === 'denied' && (
            <button
              onClick={() => requestDeviceLocation()}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-bold text-xs flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry GPS
            </button>
          )}
        </div>
      )}

      {/* Map Container & Results */}
      <div className="p-4 rounded-3xl bg-[#181818] border border-white/10 space-y-4 shadow-2xl">
        <div className="relative w-full h-[400px] rounded-2xl overflow-hidden border border-white/10 bg-neutral-900">
          {hasValidKey ? (
            <APIProvider apiKey={API_KEY} version="weekly" libraries={['marker']} language="en">
              <GoogleMap
                defaultCenter={mapCenter}
                defaultZoom={13}
                gestureHandling="greedy"
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
              >
                <MapViewportSync center={mapCenter} />
                {hasUserLocation && userCoordsRef.current && (
                  <AdvancedMarker position={userCoordsRef.current} title="Your Location">
                    <Pin background="#10B981" glyphColor="#FFF" borderColor="#047857" />
                  </AdvancedMarker>
                )}

                {places.map((place) => (
                  <AdvancedMarker
                    key={place.id}
                    position={{ lat: place.lat, lng: place.lng }}
                    onClick={() => setSelectedPlace(place)}
                  >
                    <Pin background="#8B5CF6" glyphColor="#FFF" borderColor="#6D28D9" />
                  </AdvancedMarker>
                ))}

                {selectedPlace && (
                  <InfoWindow
                    position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                    onCloseClick={() => setSelectedPlace(null)}
                  >
                    <div className="p-2 text-black text-xs space-y-1 max-w-[220px]">
                      <p className="font-extrabold">{selectedPlace.name}</p>
                      <p className="text-[10px] text-gray-600">{selectedPlace.address}</p>
                      {selectedPlace.distanceKm !== null && (
                        <p className="font-bold text-purple-700">{selectedPlace.distanceKm} km away</p>
                      )}
                      {selectedPlace.directionsUri && (
                        <a
                          href={selectedPlace.directionsUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-[11px] font-bold text-emerald-700 underline pt-0.5"
                        >
                          Open Google Maps Directions
                        </a>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </APIProvider>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-neutral-900 to-purple-950/20">
              <MapPin className="w-12 h-12 text-purple-400 mb-2" />
              <h3 className="text-base font-extrabold text-white">Interactive Map Initializing</h3>
              <p className="text-xs text-neutral-400 max-w-md mt-1">
                Interactive map canvas activates once Google Maps runtime credentials are available in this environment.
              </p>
            </div>
          )}
        </div>

        {/* Active Search Status */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-neutral-400 font-semibold">
            {loading
              ? 'Querying Google Places API...'
              : `Showing ${places.length} facilities${activeSearchLabel ? ` near ${activeSearchLabel}` : ''}`}
          </span>
          {places.length > 0 && (
            <button
              onClick={() =>
                manualQuery.trim()
                  ? fetchNearbyPlaces({ textQuery: manualQuery.trim() })
                  : userCoordsRef.current
                  ? fetchNearbyPlaces({ lat: userCoordsRef.current.lat, lng: userCoordsRef.current.lng })
                  : requestDeviceLocation()
              }
              className="text-purple-400 hover:underline font-bold flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          )}
        </div>

        {/* Places List Cards */}
        {loading ? (
          <div className="py-10 text-center text-xs text-purple-300 animate-pulse">
            Loading live medical facilities from Google Places...
          </div>
        ) : places.length === 0 ? (
          <div className="p-8 rounded-2xl bg-neutral-900 border border-white/5 text-center space-y-2">
            <p className="text-sm font-bold text-white">No facilities loaded yet.</p>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Grant location access via &quot;Use My GPS&quot; or enter a city/neighborhood in the search bar above.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {places.map((place) => (
              <div
                key={place.id}
                onClick={() => {
                  setSelectedPlace(place);
                  setMapCenter({ lat: place.lat, lng: place.lng });
                }}
                className="p-4 rounded-2xl bg-neutral-900 border border-white/5 hover:border-purple-500/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                      {place.category}
                    </span>
                    {place.openNow === true && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        Open Now
                      </span>
                    )}
                    {place.openNow === false && (
                      <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-300 text-[10px] font-bold border border-red-500/30">
                        Currently Closed
                      </span>
                    )}
                    {place.rating !== null && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" /> {place.rating} ({place.reviewCount})
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white truncate">{place.name}</h4>
                  <p className="text-xs text-neutral-400 flex items-center gap-1 flex-wrap">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span>{place.address}</span>
                    {place.distanceKm !== null && (
                      <span className="text-purple-400 font-bold"> • {place.distanceKm} km away</span>
                    )}
                  </p>
                </div>

                <div
                  className="flex items-center gap-2 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {place.phone && (
                    <a
                      href={`tel:${place.phone}`}
                      className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" /> Call
                    </a>
                  )}

                  {place.websiteUri && (
                    <a
                      href={place.websiteUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Globe className="w-3.5 h-3.5 text-cyan-400" /> Website
                    </a>
                  )}

                  <a
                    href={
                      place.directionsUri ||
                      place.googleMapsUri ||
                      `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      showToast(`Opening Google Maps directions to ${place.name}`, 'info')
                    }
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md transition"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Directions
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-neutral-500 text-center pt-2 border-t border-white/5">
          Facility information is powered by Google Maps Platform for informational location lookup only (in emergencies dial 112 / 108 / 102 / 911 directly) and is governed by the Google Maps Terms of Service &amp; Google Privacy Policy.
        </p>
      </div>
    </div>
  );
};
