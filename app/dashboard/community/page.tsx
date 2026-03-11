'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Users, MapPin, Loader2, AlertCircle, Check, Clock, Plus, Trash2, X,
  ShieldCheck, Heart, ShoppingCart, Stethoscope, MessageCircle, Phone, Bell, UserPlus
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

const HELP_TYPES: { key: HelpType; label: string; icon: React.ReactNode; color: string; message: string }[] = [
  { key: 'groceries', label: 'Groceries', icon: <ShoppingCart className="w-4 h-4" />, color: 'bg-green-100 text-green-700', message: 'needs help getting groceries' },
  { key: 'medical', label: 'Medical', icon: <Stethoscope className="w-4 h-4" />, color: 'bg-red-100 text-red-700', message: 'needs medical assistance' },
  { key: 'companionship', label: 'Companionship', icon: <Heart className="w-4 h-4" />, color: 'bg-pink-100 text-pink-700', message: 'is feeling lonely and wants company' },
  { key: 'emergency', label: 'Emergency', icon: <AlertCircle className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700', message: 'needs urgent help' },
];

const SKILL_OPTIONS = ['First Aid', 'Cooking', 'Driving', 'Errands', 'Emotional Support', 'Medical Knowledge'];

// ─── Default neighbours ──────────────────────────────────────────
const DEFAULT_NEIGHBOURS: StoredNeighbour[] = [
  { id: 'n-0', name: 'Ramesh Kumar', contactNo: '9876543210', isVolunteer: true, skills: ['Driving', 'Errands'] },
  { id: 'n-1', name: 'Priya Sharma', contactNo: '9123456789', isVolunteer: true, skills: ['First Aid', 'Cooking'] },
  { id: 'n-2', name: 'Vikram Singh', contactNo: '9988776655', isVolunteer: false, skills: [] },
  { id: 'n-3', name: 'Anita Devi', contactNo: '9765432109', isVolunteer: true, skills: ['Emotional Support'] },
  { id: 'n-4', name: 'Suresh Patel', contactNo: '9654321098', isVolunteer: false, skills: [] },
];

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ══════════════════════════════════════════════════════════════════
export default function CommunityPage() {
  // ─── Location ─────────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // ─── Neighbours ───────────────────────────────────────────────
  const [storedNeighbours, setStoredNeighbours] = useState<StoredNeighbour[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNeighbour, setNewNeighbour] = useState({ name: '', contactNo: '', isVolunteer: false, skills: [] as string[] });

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
    const saved = localStorage.getItem('community_neighbours');
    setStoredNeighbours(saved ? JSON.parse(saved) : DEFAULT_NEIGHBOURS);
    const cg = localStorage.getItem('caregiver_settings');
    if (cg) setCaregiverSettings(JSON.parse(cg));
  }, []);

  useEffect(() => {
    if (storedNeighbours.length > 0) localStorage.setItem('community_neighbours', JSON.stringify(storedNeighbours));
  }, [storedNeighbours]);

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

  // ═══ Help popup timer ═════════════════════════════════════════
  const scheduleHelp = useCallback(() => {
    if (helpTimerRef.current) clearTimeout(helpTimerRef.current);
    helpTimerRef.current = setTimeout(() => {
      if (mapNeighbours.length === 0 || !userLocation) return;
      const n = mapNeighbours[Math.floor(Math.random() * mapNeighbours.length)];
      const type = HELP_TYPES[Math.floor(Math.random() * HELP_TYPES.length)];
      setHelpPopup({
        neighbour: n,
        distanceKm: getDistanceKm(userLocation.lat, userLocation.lng, n.lat, n.lng),
        helpType: type.key,
        message: type.message,
      });
      setPopupResponse(null);
    }, 8000);
  }, [mapNeighbours, userLocation]);

  useEffect(() => {
    if (userLocation && mapNeighbours.length > 0) scheduleHelp();
    return () => { if (helpTimerRef.current) clearTimeout(helpTimerRef.current); };
  }, [userLocation, mapNeighbours.length, scheduleHelp]);

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

  // ═══ Handlers ═════════════════════════════════════════════════
  const handleAcceptHelp = () => {
    setPopupResponse('accepted');
    if (helpPopup) {
      notifyCaregiver('help_accepted', `${helpPopup.neighbour.name} ${helpPopup.message}. A volunteer has accepted the request.`);
    }
    setTimeout(() => { setHelpPopup(null); setPopupResponse(null); scheduleHelp(); }, 2500);
  };

  const handleDeclineHelp = () => {
    setPopupResponse('busy');
    if (helpPopup && helpPopup.helpType === 'emergency') {
      notifyCaregiver('help_requested', `${helpPopup.neighbour.name} ${helpPopup.message}. No volunteer was available.`);
    }
    setTimeout(() => { setHelpPopup(null); setPopupResponse(null); scheduleHelp(); }, 2500);
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

  // ═══ Render ═══════════════════════════════════════════════════
  return (
    <div className="container mx-auto px-6 py-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Know Your Neighbour</h1>
            <p className="text-sm text-gray-500">{storedNeighbours.length} neighbours · {storedNeighbours.filter(n => n.isVolunteer).length} verified volunteers</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCaregiverModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors text-sm font-medium">
            <Bell className="w-4 h-4" /> Caregiver
          </button>
          <button onClick={() => setShowVolunteerModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors text-sm font-medium">
            <ShieldCheck className="w-4 h-4" /> Volunteer
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* ── Info Banner ── */}
      <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-rose-50 border border-orange-100 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Your community, your safety net</h2>
            <p className="text-gray-600 text-sm">
              <span className="inline-flex align-middle w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm mr-1" /> = verified volunteer ·
              <span className="inline-flex align-middle w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm mx-1" /> = neighbour ·
              Tap any dot to see details. Caregivers get SMS alerts when help is needed.
            </p>
          </div>
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {locationLoading && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 mb-6">
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

      {/* ── Caregiver Notification Toast ── */}
      {notifyStatus !== 'idle' && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${notifyStatus === 'sending' ? 'bg-orange-50 text-orange-700' : notifyStatus === 'sent' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {notifyStatus === 'sending' && <><Loader2 className="w-4 h-4 animate-spin" /> Notifying caregiver…</>}
          {notifyStatus === 'sent' && <><Check className="w-4 h-4" /> Caregiver notified via SMS</>}
          {notifyStatus === 'error' && <><AlertCircle className="w-4 h-4" /> Failed to notify caregiver</>}
        </div>
      )}

      {/* ── Map ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-gray-800">Neighbours near you</h2>
        </div>
        {userLocation && <NeighbourMap userLat={userLocation.lat} userLng={userLocation.lng} neighbours={mapNeighbours} />}
      </div>

      {/* ── Neighbour List ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Neighbours</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {storedNeighbours.map(n => (
            <div key={n.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${n.isVolunteer ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {n.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{n.name}</span>
                    {n.isVolunteer && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{n.contactNo}{n.skills.length > 0 && ` · ${n.skills.join(', ')}`}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <a href={`tel:${n.contactNo}`} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors" title="Call">
                  <Phone className="w-4 h-4" />
                </a>
                <button onClick={() => handleDeleteNeighbour(n.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors" title="Remove">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Help Popup ═══ */}
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
                  Neighbour needs help
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
                      <button onClick={handleAcceptHelp} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors text-sm">
                        <Check className="w-4 h-4" /> Accept
                      </button>
                      <button onClick={handleDeclineHelp} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-400 text-white font-semibold hover:bg-gray-500 transition-colors text-sm">
                        <Clock className="w-4 h-4" /> Sorry, busy
                      </button>
                    </div>
                  </>
                ) : popupResponse === 'accepted' ? (
                  <p className="text-green-700 font-semibold text-center py-2">✅ Thank you! Caregiver has been notified.</p>
                ) : (
                  <p className="text-gray-600 font-medium text-center py-2">No problem. {helpPopup.helpType === 'emergency' ? 'Caregiver has been alerted.' : 'Stay safe!'}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Add Neighbour Modal ═══ */}
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
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" placeholder="e.g. Meera Nair" value={newNeighbour.name} onChange={e => setNewNeighbour({ ...newNeighbour, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" placeholder="e.g. 9876543210" value={newNeighbour.contactNo} onChange={e => setNewNeighbour({ ...newNeighbour, contactNo: e.target.value })} />
              </div>
              <button onClick={handleAddNeighbour} className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-rose-600 transition-all">
                Add Neighbour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Volunteer Signup Modal ═══ */}
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
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" value={volunteerForm.name} onChange={e => setVolunteerForm({ ...volunteerForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" value={volunteerForm.contactNo} onChange={e => setVolunteerForm({ ...volunteerForm, contactNo: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skills (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {SKILL_OPTIONS.map(skill => (
                    <button key={skill} type="button" onClick={() => toggleSkill(skill, volunteerForm.skills, (s) => setVolunteerForm({ ...volunteerForm, skills: s }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${volunteerForm.skills.includes(skill) ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleVolunteerSignup} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all">
                Register as Volunteer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Caregiver Settings Modal ═══ */}
      {showCaregiverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Bell className="w-5 h-5 text-amber-500" /> Caregiver Notifications</h3>
              <button onClick={() => setShowCaregiverModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Set up the son/daughter/caregiver who should be notified via SMS when something happens — emergency help, mood drops, or inactivity.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Elder&apos;s Name</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" placeholder="e.g. Maa" value={caregiverSettings.elderName} onChange={e => setCaregiverSettings({ ...caregiverSettings, elderName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caregiver Name</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" placeholder="e.g. Rahul (Son)" value={caregiverSettings.name} onChange={e => setCaregiverSettings({ ...caregiverSettings, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caregiver Phone (with country code)</label>
                <input type="tel" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" placeholder="e.g. +919876543210" value={caregiverSettings.phone} onChange={e => setCaregiverSettings({ ...caregiverSettings, phone: e.target.value })} />
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
                <strong>When will they be notified?</strong>
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  <li>A volunteer accepts a help request</li>
                  <li>An emergency help request goes unanswered</li>
                  <li>Mood drops below threshold (from AI companion)</li>
                  <li>Extended inactivity detected</li>
                </ul>
              </div>
              <button onClick={() => setShowCaregiverModal(false)} className="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold hover:bg-amber-600 transition-all">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
