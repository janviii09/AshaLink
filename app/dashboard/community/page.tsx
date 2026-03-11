'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Users, MapPin, Loader2, AlertCircle, Check, Clock, Plus, Trash2, X,
  ShieldCheck, Heart, ShoppingCart, Stethoscope, MessageCircle, Phone, Bell, UserPlus, Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NeighbourPoint } from '../../components/NeighbourMap';

const NeighbourMap = dynamic(() => import('../../components/NeighbourMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
    </div>
  ),
});

// ─── Types ───────────────────────────────────────────────────────
interface StoredNeighbour {
  id: string;
  name: string;
  contactNo: string;
  relationship?: string;
  isVolunteer: boolean;
  skills: string[];
}

interface CaregiverSettings {
  name: string;
  phone: string;
  elderName: string;
}

type HelpType = 'groceries' | 'medical' | 'companionship' | 'emergency';

interface HelpRequest {
  neighbour: NeighbourPoint;
  distanceKm: number;
  helpType: HelpType;
  message: string;
}

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

const HELP_TYPES: { key: HelpType; label: string; icon: React.ReactNode; color: string; message: string }[] = [
  { key: 'groceries', label: 'Groceries', icon: <ShoppingCart className="w-4 h-4" />, color: 'bg-green-100 text-green-700', message: 'needs help getting groceries' },
  { key: 'medical', label: 'Medical', icon: <Stethoscope className="w-4 h-4" />, color: 'bg-red-100 text-red-700', message: 'needs medical assistance' },
  { key: 'companionship', label: 'Companionship', icon: <Heart className="w-4 h-4" />, color: 'bg-pink-100 text-pink-700', message: 'is feeling lonely and wants company' },
  { key: 'emergency', label: 'Emergency', icon: <AlertCircle className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700', message: 'needs urgent help' },
];

const SKILL_OPTIONS = ['First Aid', 'Cooking', 'Driving', 'Errands', 'Emotional Support', 'Medical Knowledge'];

// ─── Default Data ──────────────────────────────────────────
const DEFAULT_NEIGHBOURS: StoredNeighbour[] = [
  { id: 'n-0', name: 'Ramesh Kumar', contactNo: '9876543210', isVolunteer: true, skills: ['Driving', 'Errands'] },
  { id: 'n-1', name: 'Priya Sharma', contactNo: '9123456789', isVolunteer: true, skills: ['First Aid', 'Cooking'] },
  { id: 'n-2', name: 'Vikram Singh', contactNo: '9988776655', isVolunteer: false, skills: [] },
  { id: 'n-3', name: 'Anita Devi', contactNo: '9765432109', isVolunteer: true, skills: ['Emotional Support'] },
  { id: 'n-4', name: 'Suresh Patel', contactNo: '9654321098', isVolunteer: false, skills: [] },
];

const DEFAULT_CONTACTS: Contact[] = [
  { id: '1', name: 'Rahul', relationship: 'Son', phone: '+91-7988638601' },
];

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ══════════════════════════════════════════════════════════════════
export default function SafetyCenterPage() {
  // ─── Location ─────────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // ─── Neighbours ───────────────────────────────────────────────
  const [storedNeighbours, setStoredNeighbours] = useState<StoredNeighbour[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNeighbour, setNewNeighbour] = useState({ name: '', contactNo: '', isVolunteer: false, skills: [] as string[] });

  // ─── Emergency Contacts ───────────────────────────────────────
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', relationship: '', phone: '' });

  // ─── SOS & Siren ──────────────────────────────────────────────
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [isSOSLoading, setIsSOSLoading] = useState(false);
  const [sosRequestStatus, setSosRequestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isPlayingSiren, setIsPlayingSiren] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);
  const [isSendingLocation, setIsSendingLocation] = useState(false);

  // ─── Help Requests ────────────────────────────────────────────
  const [helpPopup, setHelpPopup] = useState<HelpRequest | null>(null);
  const [popupResponse, setPopupResponse] = useState<'accepted' | 'busy' | null>(null);
  const helpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Caregiver ────────────────────────────────────────────────
  const [caregiverSettings, setCaregiverSettings] = useState<CaregiverSettings>({ name: '', phone: '', elderName: '' });
  const [showCaregiverModal, setShowCaregiverModal] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // ─── Volunteer Signup ─────────────────────────────────────────
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [volunteerForm, setVolunteerForm] = useState({ name: '', contactNo: '', skills: [] as string[] });

  // ═══ Load from localStorage ═══════════════════════════════════
  useEffect(() => {
    const savedNeighbours = localStorage.getItem('community_neighbours');
    setStoredNeighbours(savedNeighbours ? JSON.parse(savedNeighbours) : DEFAULT_NEIGHBOURS);

    const savedContacts = localStorage.getItem('sos_contacts');
    setContacts(savedContacts ? JSON.parse(savedContacts) : DEFAULT_CONTACTS);

    const cg = localStorage.getItem('caregiver_settings');
    if (cg) setCaregiverSettings(JSON.parse(cg));
  }, []);

  useEffect(() => {
    if (storedNeighbours.length > 0) localStorage.setItem('community_neighbours', JSON.stringify(storedNeighbours));
  }, [storedNeighbours]);

  useEffect(() => {
    if (contacts.length > 0) localStorage.setItem('sos_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    if (caregiverSettings.phone) localStorage.setItem('caregiver_settings', JSON.stringify(caregiverSettings));
  }, [caregiverSettings]);

  // ═══ Geolocation ══════════════════════════════════════════════
  useEffect(() => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported.'); setLocationLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationLoading(false); },
      (err) => { setLocationError(err.message); setLocationLoading(false); setUserLocation({ lat: 28.6139, lng: 77.209 }); }
    );
  }, []);

  // ═══ Map neighbours (add position offsets) ════════════════════
  const mapNeighbours: NeighbourPoint[] = useMemo(() => {
    if (!userLocation) return [];
    return storedNeighbours.map((n, i) => ({
      ...n,
      lat: userLocation.lat + (Math.sin(i * 1.2) * 0.003),
      lng: userLocation.lng + (Math.cos(i * 1.7) * 0.003),
    }));
  }, [userLocation, storedNeighbours]);

  // ═══ Help popup simulator ═════════════════════════════════════
  const simulateHelpRequest = useCallback(() => {
    if (mapNeighbours.length === 0 || !userLocation) {
      alert("Need to add neighbours or enable location first to simulate a request.");
      return;
    }
    const n = mapNeighbours[Math.floor(Math.random() * mapNeighbours.length)];
    const type = HELP_TYPES[Math.floor(Math.random() * HELP_TYPES.length)];
    setHelpPopup({
      neighbour: n,
      distanceKm: getDistanceKm(userLocation.lat, userLocation.lng, n.lat, n.lng),
      helpType: type.key,
      message: type.message,
    });
    setPopupResponse(null);
  }, [mapNeighbours, userLocation]);

  // ═══ Notify caregiver ═════════════════════════════════════════
  const notifyCaregiver = async (eventType: string, details: string) => {
    if (!caregiverSettings.phone) return;
    setNotifyStatus('sending');
    try {
      const res = await fetch('/api/notify-caregiver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caregiverPhone: caregiverSettings.phone,
          elderName: caregiverSettings.elderName || 'Your loved one',
          eventType,
          details,
        }),
      });
      setNotifyStatus(res.ok ? 'sent' : 'error');
    } catch {
      setNotifyStatus('error');
    }
    setTimeout(() => setNotifyStatus('idle'), 3000);
  };

  // ═══ SOS Logic ════════════════════════════════════════════════
  const handleSOSClick = async () => {
    setIsSOSModalOpen(true);
    if (isPlayingSiren) toggleSiren();
    setIsSOSLoading(true);
    setSosRequestStatus('idle');

    const phoneNumbers = contacts.map(c => c.phone.replace(/[^\d+]/g, ''));

    try {
      const response = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumbers: phoneNumbers.length > 0 ? phoneNumbers : ['+917355485383'],
        }),
      });

      if (response.ok) {
        setSosRequestStatus('success');
      } else {
        const errorData = await response.json();
        console.error('SOS API Error details:', errorData);
        setSosRequestStatus('error');
      }
    } catch (error) {
      console.error('SOS call failed:', error);
      setSosRequestStatus('error');
    } finally {
      setIsSOSLoading(false);
    }
  };

  const toggleSiren = () => {
    if (isPlayingSiren) {
      if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
        setOscillator(null);
      }
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
      }
      setIsPlayingSiren(false);
    } else {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 2;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 300;

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();

      setAudioContext(ctx);
      setOscillator(osc);
      setIsPlayingSiren(true);
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsSendingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

        const phoneNumbers = contacts.map(c => c.phone.replace(/[^\d+]/g, ''));
        const targetNumbers = phoneNumbers.length > 0 ? phoneNumbers : ['+917355485383'];

        try {
          const response = await fetch('/api/sos-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phoneNumbers: targetNumbers,
              locationUrl: mapsLink
            }),
          });

          if (response.ok) {
            alert(`✅ Live location sent instantly via SMS to ${targetNumbers.length} emergency contact(s)!`);
          } else {
            const err = await response.json();
            alert(`⚠️ Failed to send location: ${err.error}`);
          }
        } catch (error) {
          console.error('Error sending location SMS:', error);
          alert('⚠️ Network error while sending location SMS.');
        } finally {
          setIsSendingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to retrieve your location. Please check browser permissions.');
        setIsSendingLocation(false);
      }
    );
  };

  // ═══ Contact Handlers ═════════════════════════════════════════
  const handleAddContact = () => {
    if (!newContact.name || !newContact.phone) { alert("Please fill in Name and Phone Number."); return; }
    setContacts([...contacts, { id: Date.now().toString(), ...newContact }]);
    setNewContact({ name: '', relationship: '', phone: '' });
    setIsAddContactModalOpen(false);
  };

  const handleDeleteContact = (id: string) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      setContacts(contacts.filter(c => c.id !== id));
    }
  };

  // ═══ Neighbour Handlers ═══════════════════════════════════════
  const handleAcceptHelp = () => {
    setPopupResponse('accepted');
    if (helpPopup) notifyCaregiver('help_accepted', `${helpPopup.neighbour.name} ${helpPopup.message}. A volunteer has accepted the request.`);
    setTimeout(() => { setHelpPopup(null); setPopupResponse(null); }, 2500);
  };

  const handleDeclineHelp = () => {
    setPopupResponse('busy');
    if (helpPopup && helpPopup.helpType === 'emergency') notifyCaregiver('help_requested', `${helpPopup.neighbour.name} ${helpPopup.message}. No volunteer was available.`);
    setTimeout(() => { setHelpPopup(null); setPopupResponse(null); }, 2500);
  };

  const handleAddNeighbour = () => {
    if (!newNeighbour.name || !newNeighbour.contactNo) { alert('Name and phone required'); return; }
    setStoredNeighbours([...storedNeighbours, { id: `n-${Date.now()}`, ...newNeighbour }]);
    setNewNeighbour({ name: '', contactNo: '', isVolunteer: false, skills: [] });
    setShowAddModal(false);
  };

  const handleDeleteNeighbour = (id: string) => {
    setStoredNeighbours(storedNeighbours.filter(n => n.id !== id));
  };

  const handleVolunteerSignup = () => {
    if (!volunteerForm.name || !volunteerForm.contactNo) { alert('Name and phone required'); return; }
    const existing = storedNeighbours.find(n => n.contactNo === volunteerForm.contactNo);
    if (existing) {
      setStoredNeighbours(storedNeighbours.map(n => n.id === existing.id ? { ...n, isVolunteer: true, skills: volunteerForm.skills, name: volunteerForm.name } : n));
    } else {
      setStoredNeighbours([...storedNeighbours, { id: `v-${Date.now()}`, name: volunteerForm.name, contactNo: volunteerForm.contactNo, isVolunteer: true, skills: volunteerForm.skills }]);
    }
    setVolunteerForm({ name: '', contactNo: '', skills: [] });
    setShowVolunteerModal(false);
  };

  const toggleSkill = (skill: string, formSkills: string[], setSkills: (s: string[]) => void) => {
    setSkills(formSkills.includes(skill) ? formSkills.filter(s => s !== skill) : [...formSkills, skill]);
  };

  const helpMeta = helpPopup ? HELP_TYPES.find(h => h.key === helpPopup.helpType)! : null;

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="container mx-auto px-6 py-8 pb-24">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Safety Center</h1>
            <p className="text-sm text-gray-500">Emergency SOS, Contacts & Community Map</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={simulateHelpRequest} className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors text-sm font-medium">
            <Bell className="w-4 h-4" /> Simulate Request
          </button>
          <button onClick={() => setShowCaregiverModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors text-sm font-medium">
            <Bell className="w-4 h-4" /> Caregiver
          </button>
          <button onClick={() => setShowVolunteerModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors text-sm font-medium">
            <Heart className="w-4 h-4" /> Become Volunteer
          </button>
        </div>
      </div>

      {/* ── TOP SECTION: SOS & Quick Actions ── */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">

        {/* Main SOS Button */}
        <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
          <button
            onClick={handleSOSClick}
            className="w-48 h-48 rounded-full bg-red-600 shadow-lg shadow-red-500/50 flex flex-col items-center justify-center text-white hover:bg-red-700 transition-transform active:scale-95 animate-pulse"
          >
            <span className="text-4xl font-extrabold mb-2">SOS</span>
            <span className="text-sm font-medium opacity-90">Tap to Call & Text</span>
          </button>
          <p className="mt-6 text-gray-500 text-sm font-medium text-center">
            Instantly alerts your emergency contacts via Call & SMS.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Immediate Safety Actions
          </h2>
          <div className="grid grid-cols-2 gap-4 h-full">
            <button
              onClick={toggleSiren}
              className={`p-6 rounded-2xl shadow-sm border flex flex-col items-center justify-center gap-3 transition-all ${isPlayingSiren
                ? 'bg-red-50 border-red-200 animate-pulse'
                : 'bg-white border-gray-100 hover:bg-gray-50 active:bg-gray-100'
                }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isPlayingSiren ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                }`}>
                <Volume2 className={`w-7 h-7 ${isPlayingSiren ? 'animate-bounce' : ''}`} />
              </div>
              <span className={`font-semibold text-lg ${isPlayingSiren ? 'text-red-700' : 'text-gray-700'}`}>
                {isPlayingSiren ? 'Stop Loud Siren' : 'Play Loud Siren'}
              </span>
              <p className="text-xs text-gray-500 text-center">Play a loud alarm to attract attention</p>
            </button>
            <button
              onClick={handleShareLocation}
              disabled={isSendingLocation}
              className={`p-6 rounded-2xl shadow-sm border flex flex-col items-center justify-center gap-3 transition-colors ${isSendingLocation ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-100 hover:bg-gray-50 active:bg-gray-100'
                }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isSendingLocation ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-600'
                }`}>
                {isSendingLocation ? (
                  <div className="w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MapPin className="w-7 h-7" />
                )}
              </div>
              <span className={`font-semibold text-lg ${isSendingLocation ? 'text-gray-500' : 'text-gray-700'}`}>
                {isSendingLocation ? 'Sending Location...' : 'Share Live Location'}
              </span>
              <p className="text-xs text-gray-500 text-center">SMS your GPS link to contacts instantly</p>
            </button>
          </div>
        </div>

      </div>

      {/* ── MIDDLE SECTION: Emergency Contacts ── */}
      <div className="mb-8 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Phone className="w-5 h-5 text-red-500" />
            My Emergency Contacts
          </h2>
          <button onClick={() => setIsAddContactModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 text-sm font-medium hover:bg-orange-100">
            <Plus className="w-4 h-4" /> Add New
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-semibold text-gray-800 truncate">{contact.name} {contact.relationship && `(${contact.relationship})`}</h3>
                  <p className="text-sm text-gray-500">{contact.phone}</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0 ml-2">
                <a href={`tel:${contact.phone}`} className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors" title="Call">
                  <Phone className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleDeleteContact(contact.id)}
                  className="p-2 text-red-400 hover:bg-red-100 rounded-full transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {contacts.length === 0 && (
            <div className="col-span-fulltext-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
              No emergency contacts added yet. Adding one is highly recommended!
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM SECTION: Community Map ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Map */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-800">My Community Grid</h2>
              </div>
              <p className="text-xs text-gray-500 hidden sm:block">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 mr-1" /> Volunteers
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 ml-3 mr-1" /> Neighbours
              </p>
            </div>

            {locationLoading && (
              <div className="flex items-center justify-center gap-3 p-8 rounded-xl bg-orange-50 text-orange-800">
                <Loader2 className="w-6 h-6 animate-spin" /> Fetching location…
              </div>
            )}
            {locationError && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 mb-4">
                <AlertCircle className="w-5 h-5 shrink-0" /> {locationError} Showing default map view.
              </div>
            )}
            {userLocation && <NeighbourMap userLat={userLocation.lat} userLng={userLocation.lng} neighbours={mapNeighbours} />}
          </div>
        </div>

        <div className="lg:col-span-1">
          {/* Neighbour List */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">My Neighbours</h2>
              <button onClick={() => setShowAddModal(true)} className="text-orange-500 hover:text-orange-600">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {storedNeighbours.map(n => (
                <div key={n.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${n.isVolunteer ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {n.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-gray-800 text-sm">{n.name}</span>
                        {n.isVolunteer && <ShieldCheck className="w-3.5 h-3.5 text-green-600 ml-1" />}
                      </div>
                      <p className="text-[11px] text-gray-500">{n.contactNo}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <a href={`tel:${n.contactNo}`} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Phone className="w-4 h-4" /></a>
                    <button onClick={() => handleDeleteNeighbour(n.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Help Popup (Simulation) ═══ */}
      <AnimatePresence>
        {helpPopup && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-6 right-6 z-50 w-full max-w-sm"
          >
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-200 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5">
                <span className="flex items-center gap-2 text-white font-bold text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Neighbour needs help!
                </span>
              </div>
              <div className="p-4 space-y-3">
                {popupResponse === null ? (
                  <>
                    <div className="flex items-center gap-2">
                      {helpPopup.neighbour.isVolunteer && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      )}
                      {helpMeta && (
                        <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${helpMeta.color}`}>
                          {helpMeta.icon} {helpMeta.label}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm">
                      <span className="font-semibold text-gray-900">{helpPopup.neighbour.name}</span>{' '}
                      ({helpPopup.distanceKm.toFixed(2)} km away) {helpPopup.message}.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{helpPopup.neighbour.contactNo}</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleAcceptHelp} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors text-sm">
                        <Check className="w-4 h-4" /> Accept
                      </button>
                      <button onClick={handleDeclineHelp} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-400 text-white font-semibold hover:bg-gray-500 transition-colors text-sm">
                        <Clock className="w-4 h-4" /> Sorry, busy
                      </button>
                    </div>
                  </>
                ) : popupResponse === 'accepted' ? (
                  <p className="text-green-700 font-semibold text-center py-2">✅ Caregiver has been notified!</p>
                ) : (
                  <p className="text-gray-600 font-medium text-center py-2">{helpPopup.helpType === 'emergency' ? 'Alert passed to others.' : 'Stay safe!'}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Caregiver Notification Toast ═══ */}
      {notifyStatus !== 'idle' && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`p-4 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-3 ${notifyStatus === 'sending' ? 'bg-orange-50 text-orange-700 border-orange-200' : notifyStatus === 'sent' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {notifyStatus === 'sending' && <><Loader2 className="w-5 h-5 animate-spin" /> Sending SMS to caregiver…</>}
            {notifyStatus === 'sent' && <><Check className="w-5 h-5" /> Caregiver SMS sent successfully</>}
            {notifyStatus === 'error' && <><AlertCircle className="w-5 h-5" /> Failed to notify caregiver</>}
          </div>
        </div>
      )}

      {/* ═══ SOS Confirmation Modal ═══ */}
      {isSOSModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200">
            {isSOSLoading ? (
              <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            ) : sosRequestStatus === 'error' ? (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-green-600" />
              </div>
            )}

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {isSOSLoading ? 'Notifying Contacts...' : sosRequestStatus === 'error' ? 'Connection Failed' : 'Requests Sent'}
            </h3>
            <p className="text-gray-600 mb-6">
              {isSOSLoading
                ? 'Please wait while we dispatch Calls and SMS.'
                : sosRequestStatus === 'error'
                  ? 'Could not reach emergency services. Please try calling directly.'
                  : 'Emergency contacts have been called and texted.'}
            </p>
            <button onClick={() => setIsSOSModalOpen(false)} className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ═══ Other Modals (Add Contact, Add Neighbour, Volunteer, Caregiver) ═══ */}

      {/* Add Contact Modal */}
      {isAddContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add Emergency Contact</h3>
              <button onClick={() => setIsAddContactModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. Dr. Smith" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship (Optional)</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. Doctor" value={newContact.relationship} onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. +91 1234567890" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
              </div>
              <button onClick={handleAddContact} className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3 rounded-xl font-semibold hover:from-orange-600 mt-2">
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Neighbour Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><UserPlus className="w-5 h-5 text-orange-500" /> Add Neighbour</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. Meera Nair" value={newNeighbour.name} onChange={e => setNewNeighbour({ ...newNeighbour, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. 9876543210" value={newNeighbour.contactNo} onChange={e => setNewNeighbour({ ...newNeighbour, contactNo: e.target.value })} />
              </div>
              <button onClick={handleAddNeighbour} className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3 rounded-xl font-semibold hover:from-orange-600 transition-all">
                Add Neighbour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Volunteer Signup Modal */}
      {showVolunteerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-green-600" /> Become a Volunteer</h3>
              <button onClick={() => setShowVolunteerModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Verified volunteers appear as green dots on the map and are prioritized for help requests.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none" value={volunteerForm.name} onChange={e => setVolunteerForm({ ...volunteerForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none" value={volunteerForm.contactNo} onChange={e => setVolunteerForm({ ...volunteerForm, contactNo: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                <div className="flex flex-wrap gap-2">
                  {SKILL_OPTIONS.map(skill => (
                    <button key={skill} type="button" onClick={() => toggleSkill(skill, volunteerForm.skills, (s) => setVolunteerForm({ ...volunteerForm, skills: s }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${volunteerForm.skills.includes(skill) ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleVolunteerSignup} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 mt-2">
                Register as Volunteer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caregiver Settings Modal */}
      {showCaregiverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Bell className="w-5 h-5 text-amber-500" /> Caregiver Notifications</h3>
              <button onClick={() => setShowCaregiverModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Set up the son/daughter/caregiver who should be notified when community help is requested for an emergency, or when mood drops.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Elder&apos;s Name</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="e.g. Maa" value={caregiverSettings.elderName} onChange={e => setCaregiverSettings({ ...caregiverSettings, elderName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caregiver Name</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="e.g. Rahul" value={caregiverSettings.name} onChange={e => setCaregiverSettings({ ...caregiverSettings, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caregiver Phone</label>
                <input type="tel" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="e.g. +919876543210" value={caregiverSettings.phone} onChange={e => setCaregiverSettings({ ...caregiverSettings, phone: e.target.value })} />
              </div>
              <button onClick={() => setShowCaregiverModal(false)} className="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold hover:bg-amber-600 mt-2">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
