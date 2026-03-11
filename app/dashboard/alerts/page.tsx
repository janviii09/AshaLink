'use client';

import { Bell, BellRing, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export default function AlertsPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Alerts & Notifications</h1>
          <p className="text-sm text-gray-500">Stay updated on important events</p>
        </div>
      </div>

      {/* Sample alerts */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">High Usage Alert</h3>
              <span className="text-xs text-gray-400">10 min ago</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Electricity usage above normal threshold detected at 8:00 PM.</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">Critical</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Unusual Activity Pattern</h3>
              <span className="text-xs text-gray-400">1 hour ago</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">No activity detected for 4 hours during daytime. This may indicate inactivity.</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Warning</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Medicine Reminder Set</h3>
              <span className="text-xs text-gray-400">2 hours ago</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Reminder for Metformin (500mg) scheduled for 8:00 AM daily.</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">Info</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Companion Check-in Complete</h3>
              <span className="text-xs text-gray-400">3 hours ago</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Daily companion check-in completed. Mood score: 7.2/10 — looking good!</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Resolved</span>
          </div>
        </div>
      </div>
    </div>
  );
}
