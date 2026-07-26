import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import {
  MapPin,
  Hospital,
  Pill,
  Droplet,
  Activity,
  Ambulance,
  Phone,
  Navigation,
  Star,
  Clock,
  ShieldCheck
} from 'lucide-react';

export const MapsView: React.FC = () => {
  const { nearbyPlaces, showToast } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  const API_KEY =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    '';

  const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

  const categories = ['All', 'Hospital', 'Pharmacy', 'Blood Bank', 'Diagnostic', 'Ambulance'];

  const filteredPlaces = nearbyPlaces.filter(
    p => selectedCategory === 'All' || p.category === selectedCategory
  );

  const handleDirections = (place: any) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
    window.open(url, '_blank');
    showToast(`Opening Google Maps turn-by-turn navigation to ${place.name}`, 'info');
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#181818] via-[#1c1825] to-[#181818] border border-purple-500/30 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <MapPin className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/30">
              REAL-TIME GPS LOCATOR
            </span>
            <h1 className="text-2xl font-black text-white">Nearby Medical Services</h1>
            <p className="text-xs text-neutral-300">
              Find 24/7 super speciality hospitals, pharmacies, blood banks & ambulances
            </p>
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
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

      {/* Map Container & Interactive View */}
      <div className="p-4 rounded-3xl bg-[#181818] border border-white/10 space-y-4 shadow-2xl">
        <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border border-white/10 bg-neutral-900">
          
          {hasValidKey ? (
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                defaultCenter={{ lat: 37.7749, lng: -122.4194 }}
                defaultZoom={13}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
              >
                {filteredPlaces.map((place) => (
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
                    <div className="p-2 text-black text-xs space-y-1">
                      <p className="font-extrabold">{selectedPlace.name}</p>
                      <p className="text-[10px] text-gray-600">{selectedPlace.address}</p>
                      <p className="font-bold text-purple-700">{selectedPlace.distanceKm} km away</p>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-neutral-900 to-purple-950/20">
              <MapPin className="w-12 h-12 text-purple-400 mb-2 animate-bounce" />
              <h3 className="text-base font-extrabold text-white">Interactive Medical Locator Active</h3>
              <p className="text-xs text-neutral-400 max-w-md mt-1">
                Showing real-time distance calculations for emergency hospitals & pharmacies nearby.
              </p>
              <p className="text-[10px] text-amber-400 mt-2 font-semibold">
                (Google Maps API Key secret optional - Full distance list available below)
              </p>
            </div>
          )}

        </div>

        {/* Places List Cards */}
        <div className="space-y-3 pt-2">
          {filteredPlaces.map((place) => (
            <div
              key={place.id}
              className="p-4 rounded-2xl bg-neutral-900 border border-white/5 hover:border-purple-500/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                    {place.category}
                  </span>
                  {place.isOpen24 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                      Open 24/7
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-white">{place.name}</h4>
                <p className="text-xs text-neutral-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500" /> {place.address} • <span className="text-purple-400 font-bold">{place.distanceKm} km away</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${place.phone}`}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> Call
                </a>

                <button
                  onClick={() => handleDirections(place)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md transition"
                >
                  <Navigation className="w-3.5 h-3.5" /> Navigate
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>

    </div>
  );
};
