'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

const ProblemStatement = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  const problems = [
    {
      title: "The Silent Crisis",
      description: "With 15 million elderly living alone in India, loneliness and lack of timely care have become silent killers affecting their physical and mental health.",
      icon: "👵",
      stats: "15M+ elderly living alone"
    },
    {
      title: "Remote Care Challenges",
      description: "Children living abroad or in different cities struggle to monitor their parents' daily routines and ensure their safety and well-being.",
      icon: "🌍",
      stats: "80% of children worry daily"
    },
    {
      title: "Emergency Response Gaps",
      description: "Delayed response during emergencies like falls or health crises can lead to tragic consequences when immediate help is needed.",
      icon: "🚨",
      stats: "60% delayed emergency response"
    }
  ];

  return (
    <section id="problem" ref={sectionRef} className="py-24 bg-gradient-to-b from-orange-50 to-white relative overflow-hidden scroll-mt-16">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-white to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white to-transparent" />

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            The Problem We&apos;re Solving
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Modern life often separates families, leaving elderly parents vulnerable.
            Traditional monitoring systems are intrusive and don&apos;t provide meaningful companionship.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-100"
            >
              <div className="text-6xl mb-6">{problem.icon}</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">{problem.title}</h3>
              <p className="text-gray-600 mb-6">{problem.description}</p>
              <div className="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full font-semibold">
                {problem.stats}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Animated Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="mt-20 bg-gradient-to-r from-orange-500 to-rose-500 rounded-2xl p-8 text-white shadow-xl"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-blue-100">Accuracy in detecting anomalies</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-100">Real-time monitoring</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">30s</div>
              <div className="text-blue-100">Average SOS response time</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">10k+</div>
              <div className="text-blue-100">Lives impacted</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProblemStatement;