'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

const CompetitiveEdge = () => {
  const [activeTab, setActiveTab] = useState('technology');

  const edges = {
    technology: {
      title: "Smart Non-Intrusive Monitoring",
      description: "We use electricity consumption patterns as a proxy for activity monitoring, eliminating the need for cameras or wearables.",
      features: [
        "ML algorithms detect daily routines",
        "Anomaly detection for unusual patterns",
        "Privacy-focused approach",
        "Real-time alerts system"
      ],
      icon: "🤖"
    },
    ai: {
      title: "AI-Powered Companion Avatar",
      description: "Our lifelike avatar provides emotional support and companionship, reducing loneliness and cognitive decline.",
      features: [
        "Natural conversation capabilities",
        "Personalized interaction",
        "Memory and context retention",
        "Multilingual support"
      ],
      icon: "👤"
    },
    community: {
      title: "Integrated Community Support",
      description: "Building a network of care where neighbors, relatives, and volunteers can connect and support each other.",
      features: [
        "Verified community members",
        "Local event organization",
        "Resource sharing platform",
        "Emergency volunteer network"
      ],
      icon: "👥"
    }
  };

  return (
    <section id="why-us" className="py-24 bg-white relative overflow-hidden scroll-mt-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-400 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-400 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Our Competitive Edge
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            What makes AshaLink different from traditional elderly care solutions
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-full bg-orange-100 p-2">
            {Object.keys(edges).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${activeTab === tab
                  ? 'bg-white text-orange-600 shadow-lg'
                  : 'text-orange-700 hover:bg-orange-50'
                  }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Active Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-3xl p-8 md:p-12 shadow-xl border border-orange-100">
            <div className="flex items-start gap-6">
              <div className="text-8xl">{edges[activeTab as keyof typeof edges].icon}</div>
              <div>
                <h3 className="text-3xl font-bold text-gray-800 mb-4">
                  {edges[activeTab as keyof typeof edges].title}
                </h3>
                <p className="text-gray-600 text-lg mb-8">
                  {edges[activeTab as keyof typeof edges].description}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {edges[activeTab as keyof typeof edges].features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span className="text-gray-700">{feature}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-20"
        >
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-8">
            How We Compare
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-orange-50">
                  <th className="p-4 text-left rounded-l-2xl">Feature</th>
                  <th className="p-4 text-center">Traditional Solutions</th>
                  <th className="p-4 text-center bg-orange-100 rounded-r-2xl">AshaLink</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Monitoring Method', 'Cameras/Wearables', 'Electricity Patterns'],
                  ['Privacy', 'Low', 'High'],
                  ['Cost', '$$$', '$'],
                  ['Companionship', 'Limited', 'AI Avatar'],
                  ['Community', 'None', 'Integrated'],
                  ['Ease of Use', 'Complex', 'Simple']
                ].map(([feature, traditional, ours], index) => (
                  <tr key={index} className="border-b border-orange-100">
                    <td className="p-4 font-semibold">{feature}</td>
                    <td className="p-4 text-center text-gray-600">{traditional}</td>
                    <td className="p-4 text-center font-semibold text-orange-600 bg-orange-50">
                      {ours}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CompetitiveEdge;