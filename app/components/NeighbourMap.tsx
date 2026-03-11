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
  isVolunteer?: boolean;
  skills?: string[];
}

interface NeighbourMapProps {
  userLat: number;
  userLng: number;
  neighbours: NeighbourPoint[];
  onNeighbourClick?: (neighbour: NeighbourPoint) => void;
}

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function createNeighbourIcon(isVolunteer: boolean) {
  const color = isVolunteer ? '#16a34a' : '#dc2626';
  const badge = isVolunteer ? '<div style="position:absolute;top:-6px;right:-6px;width:12px;height:12px;background:#facc15;border:2px solid white;border-radius:50;font-size:7px;display:flex;align-items:center;justify-content:center;">✓</div>' : '';
  return L.divIcon({
    className: 'neighbour-marker',
    html: `<div style="position:relative;width:18px;height:18px;background:${color};border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${badge}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function NeighbourMap({ userLat, userLng, neighbours, onNeighbourClick }: NeighbourMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current).setView([userLat, userLng], 16);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.marker([userLat, userLng], { icon: defaultIcon })
      .addTo(map)
      .bindPopup('<b>You are here</b>');

    neighbours.forEach((n) => {
      const dist = getDistanceKm(userLat, userLng, n.lat, n.lng);
      const volunteerBadge = n.isVolunteer
        ? '<span style="display:inline-block;background:#16a34a;color:white;font-size:10px;padding:2px 6px;border-radius:8px;margin-top:6px;">✓ Verified Volunteer</span>'
        : '';
      const skillsHtml = n.skills?.length
        ? `<p style="margin:4px 0 0 0;font-size:11px;color:#9ca3af;">${n.skills.join(' • ')}</p>`
        : '';

      const marker = L.marker([n.lat, n.lng], { icon: createNeighbourIcon(!!n.isVolunteer) })
        .addTo(map)
        .bindPopup(
          `<div style="min-width:220px;padding:4px 0;">
            <p style="margin:0 0 4px;font-weight:700;font-size:15px;">${escapeHtml(n.name)}</p>
            ${volunteerBadge}
            <p style="margin:6px 0 4px;font-weight:600;font-size:14px;color:#374151;">
              <a href="tel:${escapeHtml(n.contactNo)}">${escapeHtml(n.contactNo)}</a>
            </p>
            <p style="margin:0;font-weight:600;font-size:13px;color:#6b7280;">${dist.toFixed(2)} km away</p>
            ${skillsHtml}
          </div>`
        );

      if (onNeighbourClick) {
        marker.on('click', () => onNeighbourClick(n));
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [userLat, userLng, neighbours, onNeighbourClick]);

  return <div ref={containerRef} className="w-full h-[480px] rounded-2xl overflow-hidden border border-gray-200 z-0" />;
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

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
