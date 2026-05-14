'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

const Features = () => {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    {
      id: 1,
      title: "Smart Activity Monitoring",
      description: "Track daily routines through electricity usage patterns without invading privacy",
      icon: "📊",
      color: "from-blue-400 to-cyan-400",
      details: [
        "Detects wake-up and sleep patterns",
        "Monitors meal preparation times",
        "Identifies abnormal inactivity",
        "Generates daily activity reports"
      ]
    },
    {
      id: 2,
      title: "AI Companion Avatar",
      description: "Lifelike avatar for conversation, reminders, and emotional support",
      icon: "🤖",
      color: "from-teal-400 to-emerald-400",
      details: [
        "Natural language conversations",
        "Medication and appointment reminders",
        "Memory games and brain exercises",
        "Emotional well-being checks"
      ]
    },
    {
      id: 3,
      title: "Community Connect",
      description: "Safe platform to connect with neighbors and volunteers",
      icon: "👥",
      color: "from-indigo-400 to-blue-400",
      details: [
        "Verified community members",
        "Local event notifications",
        "Skill sharing platform",
        "Group video calls"
      ]
    },
    {
      id: 4,
      title: "Emergency SOS System",
      description: "Instant alert system for emergencies with location tracking",
      icon: "🚨",
      color: "from-red-400 to-orange-400",
      details: [
        "One-touch emergency button",
        "Automatic fall detection",
        "Location sharing with family",
        "Direct connection to nearest hospitals"
      ]
    },
    {
      id: 5,
      title: "Family Dashboard",
      description: "Comprehensive dashboard for family members to monitor and interact",
      icon: "📱",
      color: "from-purple-400 to-pink-400",
      details: [
        "Real-time activity feed",
        "Health metric tracking",
        "Direct video calls",
        "Caregiver coordination"
      ]
    },
    {
      id: 6,
      title: "Health Integration",
      description: "Connect with healthcare providers and track health metrics",
      icon: "🏥",
      color: "from-green-400 to-teal-400",
      details: [
        "Doctor appointment scheduling",
        "Medication tracking",
        "Health report storage",
        "Telemedicine integration"
      ]
    }
  ];

  return (
    <section id="features" className="py-24 bg-gradient-to-b from-white to-orange-50 relative overflow-hidden scroll-mt-16">
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-orange-50 to-transparent" />

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Powerful Features
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to ensure your loved ones are safe, connected, and cared for
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              onMouseEnter={() => setHoveredFeature(feature.id)}
              onMouseLeave={() => setHoveredFeature(null)}
              className="relative"
            >
              <div className={`bg-gradient-to-br ${feature.color} rounded-3xl p-8 h-full shadow-lg hover:shadow-2xl transition-all duration-300`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="text-5xl">{feature.icon}</div>
                  <motion.div
                    animate={{ rotate: hoveredFeature === feature.id ? 360 : 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-white/90 mb-6">
                  {feature.description}
                </p>

                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: hoveredFeature === feature.id ? 'auto' : 0,
                    opacity: hoveredFeature === feature.id ? 1 : 0
                  }}
                  className="overflow-hidden"
                >
                  <ul className="space-y-2">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-white/80">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Feature Demo Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-20 bg-white rounded-3xl p-8 shadow-xl border border-orange-100"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-800 mb-6">
                See It In Action
              </h3>
              <p className="text-gray-600 mb-8">
                Our AI companion provides natural conversations, remembers preferences,
                and offers emotional support - all while monitoring daily patterns discreetly.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  </div>
                  <span className="text-gray-700">Real-time anomaly detection</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  </div>
                  <span className="text-gray-700">Instant family notifications</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  </div>
                  <span className="text-gray-700">Emergency response coordination</span>
                </li>
              </ul>
            </div>

            <div className="relative">
              {/* Mockup Phone */}
              <div className="relative mx-auto w-64 h-[500px] bg-gray-800 rounded-[2rem] p-4 shadow-2xl">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl" />
                <div className="h-full bg-gradient-to-b from-blue-400 to-blue-600 rounded-2xl p-4">
                  <div className="text-center text-white mb-6">
                    <div className="text-sm opacity-80">AI Companion</div>
                    <div className="text-xl font-bold">AshaLink</div>
                  </div>

                  {/* Animated Chat */}
                  <div className="space-y-4">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-white/20 rounded-2xl rounded-bl-none p-3 max-w-[80%]"
                    >
                      Good morning! Ready for your morning walk?
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 }}
                      className="bg-white/30 rounded-2xl rounded-br-none p-3 ml-auto max-w-[80%]"
                    >
                      Yes, let&apos;s go!
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.5 }}
                      className="bg-white/20 rounded-2xl rounded-bl-none p-3 max-w-[80%]"
                    >
                      Great! Don&apos;t forget your walking stick 😊
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;