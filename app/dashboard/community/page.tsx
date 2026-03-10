'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Users, MapPin, Loader2, AlertCircle, Check, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NeighbourPoint } from '../../components/NeighbourMap';

const NeighbourMap = dynamic(() => import('../../components/NeighbourMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
    </div>
  ),
});

// Mock neighbours with names and contact numbers (positions generated around user)
const MOCK_NEIGHBOUR_NAMES = [
  { name: 'Ramesh Kumar', contactNo: '9876543210' },
  { name: 'Priya Sharma', contactNo: '9123456789' },
  { name: 'Vikram Singh', contactNo: '9988776655' },
  { name: 'Anita Devi', contactNo: '9765432109' },
  { name: 'Suresh Patel', contactNo: '9654321098' },
  { name: 'Meera Nair', contactNo: '9543210987' },
  { name: 'Rajesh Gupta', contactNo: '9432109876' },
  { name: 'Kavita Reddy', contactNo: '9321098765' },
];

function getNeighboursNearUser(userLat: number, userLng: number): NeighbourPoint[] {
  const offset = () => (Math.random() - 0.5) * 0.006;
  return MOCK_NEIGHBOUR_NAMES.map((n, i) => ({
    id: `n-${i}`,
    name: n.name,
    contactNo: n.contactNo,
    lat: userLat + offset(),
    lng: userLng + offset(),
  }));
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CommunityPage() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [neighbourNeedsPopup, setNeighbourNeedsPopup] = useState<{
    neighbour: NeighbourPoint;
    distanceKm: number;
  } | null>(null);
  const [popupResponse, setPopupResponse] = useState<'accepted' | 'busy' | null>(null);
  const neighbourNeedsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(null);
        setLocationLoading(false);
      },
      (err) => {
        setLocationError(err.message || 'Could not get your location.');
        setLocationLoading(false);
        // Fallback to a default location (e.g. India) so map still shows
        setUserLocation({ lat: 28.6139, lng: 77.209 });
      }
    );
  }, []);

  const neighbours = useMemo(() => {
    if (!userLocation) return [];
    return getNeighboursNearUser(userLocation.lat, userLocation.lng);
  }, [userLocation]);

  // Pop "Your neighbour needs help" every 5 sec (next only after user picks Accept or Sorry busy)
  useEffect(() => {
    if (!userLocation || neighbours.length === 0) return;
    const scheduleNext = () => {
      return setTimeout(() => {
        const neighbour = neighbours[Math.floor(Math.random() * neighbours.length)];
        const distanceKm = getDistanceKm(userLocation.lat, userLocation.lng, neighbour.lat, neighbour.lng);
        setNeighbourNeedsPopup({ neighbour, distanceKm });
        setPopupResponse(null);
      }, 5000);
    };
    neighbourNeedsTimeoutRef.current = scheduleNext();
    return () => {
      if (neighbourNeedsTimeoutRef.current) clearTimeout(neighbourNeedsTimeoutRef.current);
    };
  }, [userLocation, neighbours]);

  const handlePopupAccept = () => {
    setPopupResponse('accepted');
    setTimeout(() => {
      setNeighbourNeedsPopup(null);
      setPopupResponse(null);
      if (userLocation && neighbours.length > 0) {
        neighbourNeedsTimeoutRef.current = setTimeout(() => {
          const neighbour = neighbours[Math.floor(Math.random() * neighbours.length)];
          const distanceKm = getDistanceKm(userLocation.lat, userLocation.lng, neighbour.lat, neighbour.lng);
          setNeighbourNeedsPopup({ neighbour, distanceKm });
          setPopupResponse(null);
        }, 5000);
      }
    }, 2200);
  };

  const handlePopupBusy = () => {
    setPopupResponse('busy');
    setTimeout(() => {
      setNeighbourNeedsPopup(null);
      setPopupResponse(null);
      if (userLocation && neighbours.length > 0) {
        neighbourNeedsTimeoutRef.current = setTimeout(() => {
          const neighbour = neighbours[Math.floor(Math.random() * neighbours.length)];
          const distanceKm = getDistanceKm(userLocation.lat, userLocation.lng, neighbour.lat, neighbour.lng);
          setNeighbourNeedsPopup({ neighbour, distanceKm });
          setPopupResponse(null);
        }, 5000);
      }
    }, 2200);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-8 h-8 text-blue-500" />
        <h1 className="text-2xl font-bold text-gray-800">Know Your Neighbour</h1>
      </div>
      <div className="mb-6 p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-blue-50 via-sky-50 to-teal-50 border-l-4 border-blue-500 border border-blue-100/80 shadow-md max-w-2xl">
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg">
            <MapPin className="w-7 h-7 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 gradient-text tracking-tight">
              Your neighbours are right on the map
            </h2>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed font-medium">
              Tap a nearby <span className="inline-flex align-middle w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-md ml-0.5 mr-1" /> dot to instantly see{' '}
              <span className="text-blue-600 font-semibold">who&apos;s closest and ready to help</span>
              {' '}— <span className="text-teal-600 font-semibold">because every second matters.</span>
            </p>
          </div>
        </div>
      </div>

      {locationLoading && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 mb-6">
          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
          <span>Fetching your location…</span>
        </div>
      )}

      {locationError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 mb-6">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{locationError} Showing default map view.</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-800">Neighbours near you</h2>
        </div>
        {userLocation && (
          <NeighbourMap
            userLat={userLocation.lat}
            userLng={userLocation.lng}
            neighbours={neighbours}
          />
        )}
      </div>

      {/* Popup: top-right, "Your neighbour needs help" every 5 sec until user picks Accept or Sorry busy */}
      <AnimatePresence>
        {neighbourNeedsPopup && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-6 right-6 z-50 w-full max-w-sm sm:max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-200 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5">
                <span className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  Your neighbour needs help
                </span>
              </div>
              <div className="p-4 space-y-3">
                {popupResponse === null ? (
                  <>
                    <p className="text-gray-700 text-sm font-medium">
                      <span className="font-semibold text-gray-900">{neighbourNeedsPopup.neighbour.name}</span>
                      {' '}({neighbourNeedsPopup.distanceKm.toFixed(2)} km away) may need assistance.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>Contact: {neighbourNeedsPopup.neighbour.contactNo}</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handlePopupAccept}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors text-sm"
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={handlePopupBusy}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-400 text-white font-semibold hover:bg-gray-500 transition-colors text-sm"
                      >
                        <Clock className="w-4 h-4" />
                        Sorry, busy this time
                      </button>
                    </div>
                  </>
                ) : popupResponse === 'accepted' ? (
                  <p className="text-green-700 font-semibold text-center py-2">
                    Thank you for helping! You&apos;re a great neighbour.
                  </p>
                ) : (
                  <p className="text-gray-600 font-medium text-center py-2">
                    No problem, thanks anyway! Stay safe.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
