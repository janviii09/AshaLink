'use client';

import { useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface NeighbourPoint {
  id: string;
  name: string;
  contactNo: string;
  lat: number;
  lng: number;
}

interface NeighbourMapProps {
  userLat: number;
  userLng: number;
  neighbours: NeighbourPoint[];
}

// Fix default marker icons in Leaflet with Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const redMarkerIcon = L.divIcon({
  className: 'neighbour-marker',
  html: `<div style="
    width: 16px;
    height: 16px;
    background: #dc2626;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function NeighbourMap({ userLat, userLng, neighbours }: NeighbourMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current).setView([userLat, userLng], 16);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // User location marker (blue/primary)
    L.marker([userLat, userLng], { icon: defaultIcon })
      .addTo(map)
      .bindPopup('<b>You are here</b>');

    // Neighbour markers (red points)
    neighbours.forEach((n) => {
      const dist = getDistanceKm(userLat, userLng, n.lat, n.lng);
      L.marker([n.lat, n.lng], { icon: redMarkerIcon })
        .addTo(map)
        .bindPopup(
          `<div style="min-width: 220px; padding: 4px 0;">
            <p style="margin: 0 0 8px 0; font-weight: 700; font-size: 15px;">${escapeHtml(n.name)}</p>
            <p style="margin: 0 0 6px 0; font-weight: 600; font-size: 14px; color: #374151;">
              <a href="tel:${escapeHtml(n.contactNo)}">${escapeHtml(n.contactNo)}</a>
            </p>
            <p style="margin: 0; font-weight: 600; font-size: 13px; color: #6b7280;">${dist.toFixed(2)} km away</p>
          </div>`
        );
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [userLat, userLng, neighbours]);

  return <div ref={containerRef} className="w-full h-[480px] rounded-2xl overflow-hidden border border-gray-200 z-0" />;
}

function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
