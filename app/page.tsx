'use client';

import { useState } from 'react';
import Hero from './components/landing/Hero';
import ProblemStatement from './components/landing/ProblemStatement';
import CompetitiveEdge from './components/landing/CompetitiveEdge';
import Features from './components/landing/Features';
import CallToAction from './components/landing/CallToAction';
import Footer from './components/layout/Footer';
import Navbar from './components/layout/Navbar';
import LoginModal from './components/layout/LoginModal';

export default function Home() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white">
      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      <Navbar onGetStartedClick={() => setLoginModalOpen(true)} />
      <Hero onGetStartedClick={() => setLoginModalOpen(true)} />
      <ProblemStatement />
      <CompetitiveEdge />
      <Features />
      <CallToAction onGetStartedClick={() => setLoginModalOpen(true)} />
      <Footer />
    </main>
  );
}