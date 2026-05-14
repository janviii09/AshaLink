'use client';

import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

interface HeroProps {
  onGetStartedClick?: () => void;
}

const Hero = ({ onGetStartedClick }: HeroProps) => {
  const slides = [
    {
      id: 1,
      title: "Caring for Elders, Powered by AI",
      subtitle: "Monitoring electricity usage to ensure their safety and well-being",
      image: "https://images.unsplash.com/photo-1581579431539-d2871c7d673c?auto=format&fit=crop&w=1920",
      gradient: "linear-gradient(to right, rgba(234,88,12,0.85), rgba(244,63,94,0.7))"
    },
    {
      id: 2,
      title: "Real-time Elderly Monitoring",
      subtitle: "Smart technology for peace of mind",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1920",
      gradient: "linear-gradient(to right, rgba(234,88,12,0.8), rgba(251,146,60,0.6))"
    },
    {
      id: 3,
      title: "AI Companion & Community",
      subtitle: "Because everyone deserves companionship",
      image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1920",
      gradient: "linear-gradient(to right, rgba(244,63,94,0.75), rgba(234,88,12,0.55))"
    }
  ];

  return (
    <div id="home" className="relative h-screen overflow-hidden scroll-mt-0">
      <Swiper
        modules={[Autoplay, EffectFade]}
        effect="fade"
        autoplay={{ delay: 1500, disableOnInteraction: false }}
        speed={1000}
        loop={true}
        className="h-full"
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id}>
            <div className="relative h-full">
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${slide.image})` }}
              />

              {/* Gradient Overlay */}
              <div
                className="absolute inset-0"
                style={{ background: slide.gradient }}
              />

              {/* Content */}
              <div className="relative h-full flex items-center">
                <div className="container mx-auto px-6 lg:px-12">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-3xl"
                  >
                    <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                      {slide.title}
                    </h1>
                    <p className="text-xl md:text-2xl text-white/90 mb-8">
                      {slide.subtitle}
                    </p>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.6 }}
                    >
                      <button
                        onClick={onGetStartedClick}
                        className="bg-white text-orange-600 px-8 py-3 rounded-full font-semibold text-lg hover:bg-orange-50 transition-all duration-300 transform hover:scale-105 shadow-xl"
                      >
                        Get Started
                      </button>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
      >
        <div className="animate-bounce">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </motion.div>
    </div>
  );
};

export default Hero;