'use client';

import { useState, useEffect } from 'react';
import { Phone, AlertCircle, MapPin, Volume2, Plus, Trash2, X } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

const DEFAULT_CONTACTS: Contact[] = [
  { id: '1', name: 'Rahul', relationship: 'Son', phone: '+91-7988638601' },
];

export default function SosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isPlayingSiren, setIsPlayingSiren] = useState(false);

  // Contact State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', relationship: '', phone: '' });

  // Siren Audio Context
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);

  // Load contacts from localStorage
  useEffect(() => {
    const savedContacts = localStorage.getItem('sos_contacts');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    } else {
      setContacts(DEFAULT_CONTACTS);
    }
  }, []);

  // Save contacts to localStorage
  useEffect(() => {
    if (contacts.length > 0) { // Avoid overwriting with empty array on initial render if logic was complex, but here it's fine
      localStorage.setItem('sos_contacts', JSON.stringify(contacts));
    }
  }, [contacts]);

  const toggleSiren = () => {
    if (isPlayingSiren) {
      // Stop Siren
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
      // Start Siren
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // Start at 440Hz

      // Siren effect: oscillate frequency
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 2; // 2Hz siren speed
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 300; // Modulate by +/- 300Hz

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

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const message = `HELP! I am in an emergency. My location is: ${mapsLink}`;

        // Open WhatsApp with pre-filled message
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to retrieve your location. Please check permissions.');
      }
    );
  };

  const handleSOSClick = async () => {
    setIsModalOpen(true);
    // Stop siren if playing when SOS is clicked
    if (isPlayingSiren) toggleSiren();

    setIsLoading(true);
    setRequestStatus('idle');

    // Collect all phone numbers
    const phoneNumbers = contacts.map(c => c.phone.replace(/\D/g, '')); // simple sanitize

    try {
      const response = await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumbers: phoneNumbers.length > 0 ? phoneNumbers : ['+917988638601'], // Fallback
        }),
      });

      if (response.ok) {
        setRequestStatus('success');
      } else {
        const errorData = await response.json();
        console.error('SOS API Error:', errorData);
        setRequestStatus('error');
      }
    } catch (error) {
      console.error('SOS call failed:', error);
      setRequestStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = () => {
    if (!newContact.name || !newContact.phone) {
      alert("Please fill in Name and Phone Number.");
      return;
    }
    const contact: Contact = {
      id: Date.now().toString(),
      name: newContact.name,
      relationship: newContact.relationship,
      phone: newContact.phone,
    };
    setContacts([...contacts, contact]);
    setNewContact({ name: '', relationship: '', phone: '' });
    setIsAddContactModalOpen(false);
  };

  const handleDeleteContact = (id: string) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      setContacts(contacts.filter(c => c.id !== id));
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 pb-24">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">SOS & Emergency</h1>

      {/* Main SOS Section */}
      <div className="flex flex-col items-center justify-center mb-10">
        <button
          onClick={handleSOSClick}
          className="w-48 h-48 rounded-full bg-red-600 shadow-lg shadow-red-500/50 flex flex-col items-center justify-center text-white hover:bg-red-700 transition-transform active:scale-95 animate-pulse"
        >
          <span className="text-4xl font-extrabold mb-2">SOS</span>
          <span className="text-sm font-medium opacity-90">Tap for Help</span>
        </button>
        <p className="mt-4 text-gray-500 text-sm font-medium">
          Pressing this will notify your emergency contacts immediately.
        </p>
      </div>

      {/* Emergency Contacts */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-red-500" />
          Emergency Contacts
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{contact.name} {contact.relationship && `(${contact.relationship})`}</h3>
                  <p className="text-sm text-gray-500">{contact.phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`tel:${contact.phone}`} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors" title="Call">
                  <Phone className="w-5 h-5" />
                </a>
                <button
                  onClick={() => handleDeleteContact(contact.id)}
                  className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          {/* Add Contact Button */}
          <button
            onClick={() => setIsAddContactModalOpen(true)}
            className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex items-center justify-center gap-2 text-gray-500 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-all min-h-[88px]"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Contact</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={toggleSiren}
            className={`p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 transition-all ${isPlayingSiren
              ? 'bg-red-50 border-red-200 animate-pulse'
              : 'bg-white hover:bg-gray-50 active:bg-gray-100'
              }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPlayingSiren ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
              }`}>
              <Volume2 className={`w-6 h-6 ${isPlayingSiren ? 'animate-bounce' : ''}`} />
            </div>
            <span className={`font-medium ${isPlayingSiren ? 'text-red-700' : 'text-gray-700'}`}>
              {isPlayingSiren ? 'Stop Siren' : 'Play Siren'}
            </span>
          </button>
          <button
            onClick={handleShareLocation}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <MapPin className="w-6 h-6" />
            </div>
            <span className="font-medium text-gray-700">Share Location</span>
          </button>
        </div>
      </div>

      {/* SOS Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200">
            {isLoading ? (
              <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            ) : requestStatus === 'error' ? (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-green-600" />
              </div>
            )}

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {isLoading ? 'Notifying Contacts...' : requestStatus === 'error' ? 'Connection Failed' : 'Request Sent'}
            </h3>
            <p className="text-gray-600 mb-6">
              {isLoading
                ? 'Please wait while we connect.'
                : requestStatus === 'error'
                  ? 'Could not reach emergency services. Please try calling directly.'
                  : 'Emergency contacts are being notified'}
            </p>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {isAddContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add New Contact</h3>
              <button
                onClick={() => setIsAddContactModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                  placeholder="e.g. Dr. Smith"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship (Optional)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                  placeholder="e.g. Doctor"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                  placeholder="e.g. +91 1234567890"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                />
              </div>

              <button
                onClick={handleAddContact}
                className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-rose-600 transition-colors mt-4"
              >
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
