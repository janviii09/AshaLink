'use client';

import { useState, useEffect, useRef } from 'react';
import { Pill, Plus, Trash2, Edit, Camera, Clock, MessageCircle, X, AlertTriangle, Send, Bell, BellOff } from 'lucide-react';

/**
 * /dashboard/medicines — Medicine Management Page
 * 
 * This page has 3 main sections:
 * 
 * SECTION A: My Medicines List
 *   - Add/edit/delete medicine cards
 *   - Each medicine has: name, dosage, timing (morning/afternoon/evening/night), purpose, optional notes
 *   - Everything persists in localStorage under key 'user_medicines'
 *   - WHY localStorage? Privacy-first — the user's medicine data stays on their device
 * 
 * SECTION B: AI Medicine Scanner
 *   - Upload or capture a photo of a medicine tablet/strip
 *   - Sends base64 image to /api/medicine-identify → Groq Vision API
 *   - Displays: identified name, purpose, dosage info, warnings
 *   - Includes mandatory medical disclaimer
 * 
 * SECTION C: Ask About My Medicines (RAG)
 *   - Chat-like interface where user types questions about their medicines
 *   - e.g., "What should I take in the morning?"
 *   - Sends query + full medicine list to /api/medicine-rag → Groq LLM
 *   - LLM answers based ONLY on the user's actual medicines (no hallucination)
 */

// ─── Types ───────────────────────────────────────────────────────────

interface Medicine {
    id: string;
    name: string;
    dosage: string;
    timing: string[];
    purpose: string;
    notes: string;
}

interface ScanResult {
    name: string;
    purpose: string;
    dosage: string;
    warnings: string;
    disclaimer: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const TIMING_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Night'];

const EMPTY_MEDICINE: Medicine = {
    id: '',
    name: '',
    dosage: '',
    timing: [],
    purpose: '',
    notes: '',
};

// ─── Component ───────────────────────────────────────────────────────

export default function MedicinesPage() {
    // Medicine list state
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState<Medicine>(EMPTY_MEDICINE);
    const [isEditing, setIsEditing] = useState(false);

    // Scanner state
    const [scanImage, setScanImage] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // RAG chat state
    const [ragQuery, setRagQuery] = useState('');
    const [ragAnswer, setRagAnswer] = useState('');
    const [isAsking, setIsAsking] = useState(false);

    // Reminders state
    const [remindersEnabled, setRemindersEnabled] = useState<Record<string, boolean>>({});

    // ─── Load from localStorage on mount ─────────────────────────────
    useEffect(() => {
        const saved = localStorage.getItem('user_medicines');
        if (saved) {
            try {
                setMedicines(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse medicines from localStorage', e);
            }
        }
        const savedReminders = localStorage.getItem('medicine_reminders');
        if (savedReminders) {
            try {
                setRemindersEnabled(JSON.parse(savedReminders));
            } catch (e) {
                console.error('Failed to parse reminders from localStorage', e);
            }
        }
    }, []);

    // ─── Save to localStorage whenever medicines change ──────────────
    useEffect(() => {
        localStorage.setItem('user_medicines', JSON.stringify(medicines));
    }, [medicines]);

    useEffect(() => {
        localStorage.setItem('medicine_reminders', JSON.stringify(remindersEnabled));
    }, [remindersEnabled]);

    // ─── Medicine CRUD ───────────────────────────────────────────────

    const handleSaveMedicine = () => {
        if (!editingMedicine.name.trim()) return;

        if (isEditing) {
            // Update existing
            setMedicines(prev =>
                prev.map(m => m.id === editingMedicine.id ? editingMedicine : m)
            );
        } else {
            // Add new with a unique ID
            const newMedicine = {
                ...editingMedicine,
                id: Date.now().toString(),
            };
            setMedicines(prev => [...prev, newMedicine]);
        }

        setShowForm(false);
        setEditingMedicine(EMPTY_MEDICINE);
        setIsEditing(false);
    };

    const handleEditMedicine = (medicine: Medicine) => {
        setEditingMedicine(medicine);
        setIsEditing(true);
        setShowForm(true);
    };

    const handleDeleteMedicine = (id: string) => {
        setMedicines(prev => prev.filter(m => m.id !== id));
    };

    const toggleTiming = (timing: string) => {
        setEditingMedicine(prev => ({
            ...prev,
            timing: prev.timing.includes(timing)
                ? prev.timing.filter(t => t !== timing)
                : [...prev.timing, timing],
        }));
    };

    // ─── AI Medicine Scanner ─────────────────────────────────────────

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setScanImage(base64);
            setScanResult(null);
        };
        reader.readAsDataURL(file);
    };

    const handleScanMedicine = async () => {
        if (!scanImage) return;

        setIsScanning(true);
        try {
            const response = await fetch('/api/medicine-identify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: scanImage }),
            });

            const data = await response.json();
            if (response.ok) {
                setScanResult(data);
            } else {
                alert(data.error || 'Failed to identify medicine');
            }
        } catch (error) {
            console.error('Scan error:', error);
            alert('Failed to scan medicine. Please try again.');
        } finally {
            setIsScanning(false);
        }
    };

    // ─── RAG Query ───────────────────────────────────────────────────

    const handleAskQuestion = async () => {
        if (!ragQuery.trim()) return;

        setIsAsking(true);
        setRagAnswer('');
        try {
            const response = await fetch('/api/medicine-rag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: ragQuery,
                    medicines,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setRagAnswer(data.answer);
            } else {
                setRagAnswer(data.error || 'Sorry, I could not process your question.');
            }
        } catch (error) {
            console.error('RAG error:', error);
            setRagAnswer('Something went wrong. Please try again.');
        } finally {
            setIsAsking(false);
        }
    };

    // ─── Reminders ───────────────────────────────────────────────────

    const toggleReminder = async (medicine: Medicine) => {
        const isCurrentlyEnabled = remindersEnabled[medicine.id];

        if (!isCurrentlyEnabled) {
            // Request notification permission
            if ('Notification' in window && Notification.permission !== 'granted') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    alert('Please allow notifications to set reminders.');
                    return;
                }
            }
        }

        setRemindersEnabled(prev => ({
            ...prev,
            [medicine.id]: !isCurrentlyEnabled,
        }));

        if (!isCurrentlyEnabled) {
            // Schedule notifications based on timing
            scheduleReminder(medicine);
        }
    };

    const scheduleReminder = (medicine: Medicine) => {
        // Map timing labels to approximate hours
        const timingHours: Record<string, number> = {
            'Morning': 8,
            'Afternoon': 13,
            'Evening': 18,
            'Night': 21,
        };

        medicine.timing.forEach(timing => {
            const hour = timingHours[timing];
            if (hour === undefined) return;

            const now = new Date();
            const scheduledTime = new Date();
            scheduledTime.setHours(hour, 0, 0, 0);

            // If time already passed today, schedule for tomorrow
            if (scheduledTime <= now) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
            }

            const delay = scheduledTime.getTime() - now.getTime();

            setTimeout(() => {
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`💊 Medicine Reminder`, {
                        body: `Time to take ${medicine.name} (${medicine.dosage}) — ${timing}`,
                        icon: '/favicon.ico',
                    });
                }
            }, delay);
        });
    };

    // ─── Render ──────────────────────────────────────────────────────

    return (
        <div className="container mx-auto px-6 py-8 min-h-screen bg-gray-50">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-green-800 flex items-center gap-3">
                    <Pill className="w-8 h-8" />
                    My Medicines
                </h1>
                <p className="text-gray-500 mt-1">Track your medicines, scan tablets, and set reminders</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ═══════════════════════════════════════════════════════════
            SECTION A: Medicine List
            ═══════════════════════════════════════════════════════════ */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-800">My Medicine List</h2>
                        <button
                            onClick={() => {
                                setEditingMedicine(EMPTY_MEDICINE);
                                setIsEditing(false);
                                setShowForm(true);
                            }}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-5 rounded-xl shadow-md transition-all hover:shadow-lg"
                        >
                            <Plus size={20} />
                            Add Medicine
                        </button>
                    </div>

                    {/* ── Add/Edit Form Modal ──────────────────────────────── */}
                    {showForm && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-800">
                                    {isEditing ? 'Edit Medicine' : 'Add New Medicine'}
                                </h3>
                                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name *</label>
                                    <input
                                        type="text"
                                        value={editingMedicine.name}
                                        onChange={e => setEditingMedicine(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g., Metformin"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dosage *</label>
                                    <input
                                        type="text"
                                        value={editingMedicine.dosage}
                                        onChange={e => setEditingMedicine(prev => ({ ...prev, dosage: e.target.value }))}
                                        placeholder="e.g., 500mg"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Timing *</label>
                                <div className="flex flex-wrap gap-2">
                                    {TIMING_OPTIONS.map(timing => (
                                        <button
                                            key={timing}
                                            onClick={() => toggleTiming(timing)}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${editingMedicine.timing.includes(timing)
                                                ? 'bg-green-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            <Clock size={14} className="inline mr-1" />
                                            {timing}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                                <input
                                    type="text"
                                    value={editingMedicine.purpose}
                                    onChange={e => setEditingMedicine(prev => ({ ...prev, purpose: e.target.value }))}
                                    placeholder="e.g., Blood sugar control"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                                <textarea
                                    value={editingMedicine.notes}
                                    onChange={e => setEditingMedicine(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Any special instructions..."
                                    rows={2}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleSaveMedicine}
                                    disabled={!editingMedicine.name.trim()}
                                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-xl shadow-md transition-all"
                                >
                                    {isEditing ? 'Save Changes' : 'Add Medicine'}
                                </button>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Medicine Cards ──────────────────────────────────── */}
                    {medicines.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
                            <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No medicines added yet</p>
                            <p className="text-gray-400 text-sm mt-1">Click &quot;Add Medicine&quot; to get started</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {medicines.map(medicine => (
                                <div key={medicine.id} className="bg-white rounded-2xl shadow-md border border-gray-200 p-5 hover:shadow-lg transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-800">{medicine.name}</h3>
                                            <p className="text-green-600 font-medium text-sm">{medicine.dosage}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => toggleReminder(medicine)}
                                                className={`p-2 rounded-lg transition-colors ${remindersEnabled[medicine.id]
                                                    ? 'text-green-600 bg-green-50 hover:bg-green-100'
                                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                                    }`}
                                                title={remindersEnabled[medicine.id] ? 'Reminder on' : 'Set reminder'}
                                            >
                                                {remindersEnabled[medicine.id] ? <Bell size={18} /> : <BellOff size={18} />}
                                            </button>
                                            <button
                                                onClick={() => handleEditMedicine(medicine)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteMedicine(medicine.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-3 space-y-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            {medicine.timing.map(t => (
                                                <span key={t} className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                        {medicine.purpose && (
                                            <p className="text-gray-600 text-sm">{medicine.purpose}</p>
                                        )}
                                        {medicine.notes && (
                                            <p className="text-gray-400 text-xs italic">{medicine.notes}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════════
            RIGHT SIDEBAR: Scanner + RAG
            ═══════════════════════════════════════════════════════════ */}
                <div className="space-y-6">
                    {/* ── SECTION B: AI Medicine Scanner ──────────────────── */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                            <Camera size={20} className="text-blue-600" />
                            AI Medicine Scanner
                        </h2>

                        <div className="space-y-4">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                            >
                                {scanImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={scanImage} alt="Scanned medicine" className="max-h-40 mx-auto rounded-lg" />
                                ) : (
                                    <>
                                        <Camera className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-500 text-sm">Click to upload or capture a photo</p>
                                    </>
                                )}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleImageUpload}
                                className="hidden"
                            />

                            {scanImage && (
                                <button
                                    onClick={handleScanMedicine}
                                    disabled={isScanning}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-xl shadow-md transition-all"
                                >
                                    {isScanning ? 'Identifying...' : 'Identify Medicine'}
                                </button>
                            )}

                            {scanResult && (
                                <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                                    <h4 className="font-bold text-blue-800">{scanResult.name}</h4>
                                    <p className="text-sm text-gray-700"><span className="font-medium">Purpose:</span> {scanResult.purpose}</p>
                                    <p className="text-sm text-gray-700"><span className="font-medium">Dosage:</span> {scanResult.dosage}</p>
                                    <p className="text-sm text-gray-700"><span className="font-medium">Warnings:</span> {scanResult.warnings}</p>
                                    <div className="flex items-start gap-2 mt-3 bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                                        <AlertTriangle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
                                        <p className="text-xs text-yellow-800">{scanResult.disclaimer}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── SECTION C: Ask About Medicines (RAG) ────────────── */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                            <MessageCircle size={20} className="text-green-600" />
                            Ask About My Medicines
                        </h2>

                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={ragQuery}
                                    onChange={e => setRagQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
                                    placeholder="e.g., What do I take in the morning?"
                                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm"
                                />
                                <button
                                    onClick={handleAskQuestion}
                                    disabled={isAsking || !ragQuery.trim()}
                                    className="p-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl transition-all"
                                >
                                    <Send size={18} />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {['What do I take in the morning?', 'Any evening medicines?', 'Tell me about my medicines'].map(suggestion => (
                                    <button
                                        key={suggestion}
                                        onClick={() => { setRagQuery(suggestion); }}
                                        className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-green-50 hover:text-green-700 transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>

                            {isAsking && (
                                <div className="flex items-center gap-2 text-green-600 text-sm">
                                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                    Thinking...
                                </div>
                            )}

                            {ragAnswer && (
                                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{ragAnswer}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
