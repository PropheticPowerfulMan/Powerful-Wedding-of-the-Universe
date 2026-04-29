import { useEffect } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import Particles from './components/Particles';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import OurStory from './components/OurStory';
import Vision from './components/Vision';
import EventProgram from './components/EventProgram';
import Gallery from './components/Gallery';
import RSVP from './components/RSVP';
import GroomMessage from './components/GroomMessage';
import InvitationSystem from './components/InvitationSystem';
import Admin from './components/Admin';
import Footer from './components/Footer';

export default function App() {
  useEffect(() => {
    let angle = 0;

    const interval = window.setInterval(() => {
      const canvas = document.createElement('canvas');
      const size = 64;
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = '/favicon_ultra.ico';

      img.onload = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();

        const link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
        if (link) {
          link.href = canvas.toDataURL('image/png');
        }
      };

      angle += 10;
    }, 200);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <LanguageProvider>
    <div className="bg-black text-white min-h-screen">
      <Particles />
      <Navigation />
      <main>
        <Hero />
        <OurStory />
        <Vision />
        <EventProgram />
        <Gallery />
        <GroomMessage />
        <RSVP />
        <InvitationSystem />
        <Admin />
      </main>
      <Footer />
    </div>
    </LanguageProvider>
  );
}
