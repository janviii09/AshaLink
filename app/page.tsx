'use client';

import { useState } from 'react';
import Hero from './components/Hero';
import ProblemStatement from './components/ProblemStatement';
import CompetitiveEdge from './components/CompetitiveEdge';
import Features from './components/Features';
import CallToAction from './components/CallToAction';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';

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