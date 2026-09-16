'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

// ==================== TYPES & INTERFACES ====================
export interface FamilyMemberRow {
  id: string;
  name: string;
  profile_image?: string;
  role?: string;
  created_at?: string;
}

export interface EventDetails {
  id?: string;
  name: string;
  date?: string;
  time?: string;
  venue_name?: string;
  address?: string;
  google_map_url?: string;
  invited?: boolean;
}

export interface AyatData {
  text?: string;
  reference?: string;
  arabic?: string;
}

export interface Wedding {
  id?: string;
  groom_name?: string;
  bride_name?: string;
  groom_image?: string;
  bride_image?: string;
  couple_image?: string;
  family_image?: string;
  mehndi_date?: string;
  mehndi_time?: string;
  mehndi_venue?: string;
  mehndi_map_url?: string;
  barat_date?: string;
  barat_time?: string;
  barat_venue?: string;
  barat_map_url?: string;
  walima_date?: string;
  walima_time?: string;
  walima_venue?: string;
  walima_map_url?: string;
  contact_person_1?: string;
  contact_number_1?: string;
  contact_person_2?: string;
  contact_number_2?: string;
  ayat?: AyatData;
  quote?: string;
  quote_reference?: string;
  quote_arabic?: string;
  dress_code?: string;
  color_palette?: string[];
  events?: EventDetails[];
}

export interface Guest {
  id: string;
  name?: string;
  title_prefix?: string;
  allowed_guests?: number;
  invited_events?: string[];
  personal_message?: string;
  token?: string;
  rsvp_status?: 'attending' | 'declined' | null;
  rsvp_updated_at?: string;
  wedding?: Wedding;
}

interface WeddingLandingPageProps {
  guest: Guest;
  familyMembers?: FamilyMemberRow[];
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// ==================== ASSET CONSTANTS ====================
const IMAGES = {
  DIVIDER: 'https://cdn.invitationsstudio.com/templates/template-1047/divider.webp',
  EVENT_ILLUSTRATION: 'https://cdn.invitationsstudio.com/templates/template-1047/rest-illustration-it-1.webp',
  DRESSCODE: 'https://cdn.invitationsstudio.com/templates/template-1047/dresscode.webp',
  RSVP_GIF: 'https://cdn.invitationsstudio.com/templates/template-1047/inner-video.gif',
  FOOTER_BG: 'https://cdn.invitationsstudio.com/templates/template-1047/footer-cover.webp',
  KEY: 'https://cdn.invitationsstudio.com/templates/template-1047/key.webp',
  CRYSTALS: 'https://cdn.invitationsstudio.com/templates/template-1047/crystals.webp',
  FALLBACK_COUPLE: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
  HERO_FALLBACK: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=1920',
};

export default function WeddingLandingPage({
  guest,
  familyMembers = [],
}: WeddingLandingPageProps) {
  const supabase = createClient();

  const [stage, setStage] = useState<'intro' | 'unlocked'>('intro');
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // RSVP Real-time State
  const [rsvpChoice, setRsvpChoice] = useState<'attending' | 'declined' | null>(
    guest?.rsvp_status || null
  );
  const [isUpdatingRsvp, setIsUpdatingRsvp] = useState(false);

  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  // Dynamic Guest & Wedding Data Extraction
  const guestName = guest?.name || 'Valued Guest';
  const guestTitle = guest?.title_prefix || '';
  const wedding: Wedding = guest?.wedding || {};
  const groomName = wedding.groom_name || 'Groom';
  const brideName = wedding.bride_name || 'Bride';

  const coupleImage =
    wedding.couple_image ||
    wedding.groom_image ||
    wedding.bride_image ||
    IMAGES.FALLBACK_COUPLE;

  // Quotes & Verses
  const quoteArabic =
    wedding.ayat?.arabic ||
    wedding.quote_arabic ||
    'وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً';
  const quoteText =
    wedding.ayat?.text ||
    wedding.quote ||
    'And among His signs is that He created for you mates from among yourselves, that you may dwell in tranquility with them, and He has put love and mercy between your hearts.';
  const quoteReference =
    wedding.ayat?.reference || wedding.quote_reference || 'SURAH AR-RUM (30:21)';

  const paletteColors = wedding.color_palette || ['#E2D5C3', '#C9B397', '#9CA99E', '#536155'];

  // Robust Dynamic Events Extraction Logic
  const invitedEvents = useMemo(() => {
    let list: EventDetails[] = [];

    if (wedding?.events && wedding.events.length > 0) {
      list = [...wedding.events];
    } else {
      if (wedding?.mehndi_date || wedding?.mehndi_venue) {
        list.push({
          id: 'mehndi',
          name: 'Mehndi Ceremony',
          date: wedding.mehndi_date,
          time: wedding.mehndi_time,
          venue_name: wedding.mehndi_venue,
          google_map_url: wedding.mehndi_map_url,
          invited: true,
        });
      }
      if (wedding?.barat_date || wedding?.barat_venue) {
        list.push({
          id: 'barat',
          name: 'Barat Ceremony',
          date: wedding.barat_date,
          time: wedding.barat_time,
          venue_name: wedding.barat_venue,
          google_map_url: wedding.barat_map_url,
          invited: true,
        });
      }
      if (wedding?.walima_date || wedding?.walima_venue) {
        list.push({
          id: 'walima',
          name: 'Walima Reception',
          date: wedding.walima_date,
          time: wedding.walima_time,
          venue_name: wedding.walima_venue,
          google_map_url: wedding.walima_map_url,
          invited: true,
        });
      }
    }

    // Filter based on guest invited_events if defined
    let filtered = list;
    if (guest?.invited_events && guest.invited_events.length > 0) {
      const allowed = guest.invited_events.map((i) => String(i).toLowerCase().trim());
      filtered = list.filter((e) => {
        const eventId = String(e.id || '').toLowerCase().trim();
        const eventName = String(e.name || '').toLowerCase().trim();
        return (
          allowed.includes(eventId) ||
          allowed.some((a) => eventName.includes(a) || a.includes(eventName))
        );
      });
    }

    // Fallback: If filter results in 0 events, display all available events
    if (filtered.length === 0) {
      filtered = list;
    }

    // Sort chronologically by date
    return filtered.sort((a, b) => {
      const timeA = new Date(`${a.date || '9999-12-31'}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.date || '9999-12-31'}T${b.time || '00:00'}`).getTime();
      return timeA - timeB;
    });
  }, [wedding, guest?.invited_events]);

  // Dynamic Hero Date (Earliest Invited Event)
  const firstEvent = invitedEvents[0];
  const targetDateStr = firstEvent?.date;
  const targetTimeStr = firstEvent?.time;

  const formatDisplayDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear());
      return `${day} . ${month} . ${year}`;
    } catch {
      return dateStr;
    }
  };

  const formattedHeroDate = formatDisplayDate(targetDateStr);

  // Countdown Calculation
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    if (!targetDateStr) return;

    const fullTargetStr = targetTimeStr ? `${targetDateStr}T${targetTimeStr}` : targetDateStr;
    const targetTime = new Date(fullTargetStr).getTime();

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDateStr, targetTimeStr]);

  // Handle Hero Video Autoplay Playback Trigger
  const handleUnlockAndPlay = () => {
    setStage('unlocked');
    if (heroVideoRef.current) {
      heroVideoRef.current.play().catch((err) => {
        console.warn('Hero video autoplay blocked on mobile:', err);
      });
    }
  };

  // Real-time RSVP updates
  const handleRsvpChange = async (status: 'attending' | 'declined') => {
    setRsvpChoice(status);
    setIsUpdatingRsvp(true);

    try {
      const { error } = await supabase
        .from('guests')
        .update({
          rsvp_status: status,
          rsvp_updated_at: new Date().toISOString(),
        })
        .eq('id', guest.id);

      if (error) {
        console.error('RSVP update failed:', error.message);
      }
    } catch (err) {
      console.error('Unexpected RSVP update error:', err);
    } finally {
      setIsUpdatingRsvp(false);
    }
  };

  // Scroll Lock for Intro
  useEffect(() => {
    const shouldLock = stage === 'intro';
    document.body.style.overflow = shouldLock ? 'hidden' : 'auto';
    document.documentElement.style.overflow = shouldLock ? 'hidden' : 'auto';

    return () => {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    };
  }, [stage]);

  const handleIntroPlay = (): void => {
    if (introVideoRef.current && !videoError) {
      if (isPlaying) {
        introVideoRef.current.pause();
        setIsPlaying(false);
      } else {
        introVideoRef.current.play().catch(() => setVideoError(true));
        setIsPlaying(true);
      }
    }
  };

  const scrollToSection = (id: string): void => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleViewMap = (event: EventDetails) => {
    if (event.google_map_url) {
      window.open(event.google_map_url, '_blank');
    } else {
      const query = encodeURIComponent(`${event.venue_name || ''} ${event.address || ''}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  const handleAddToCalendar = (event: EventDetails) => {
    const title = `${event.name} - ${groomName} & ${brideName}`;
    const location = `${event.venue_name || ''}, ${event.address || ''}`;
    const dateStr = event.date || '';
    const timeStr = event.time || '00:00';

    if (!dateStr) return;

    const cleanDate = dateStr.replace(/-/g, '');
    const cleanTime = timeStr.replace(/:/g, '') + '00';
    const startDateTime = `${cleanDate}T${cleanTime}`;

    const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Wedding Invitation//EN
BEGIN:VEVENT
SUMMARY:${title}
LOCATION:${location}
DESCRIPTION:Wedding Celebration of ${groomName} & ${brideName}
DTSTART:${startDateTime}
DTEND:${startDateTime}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${event.name.replace(/\s+/g, '_')}_Event.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="relative w-full min-h-screen bg-[#F3ECE4] text-[#4A3E3D] overflow-x-hidden font-serif antialiased">
      
      {/* ==================== 1. INTRO GATE SECTION ==================== */}
      {stage === 'intro' && (
        <div
          onClick={handleIntroPlay}
          className="fixed inset-0 w-full h-[100dvh] bg-black z-[60] flex items-center justify-center cursor-pointer select-none"
        >
          {videoError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#12100E] p-6 text-center font-sans">
              <img src={IMAGES.KEY} alt="Key Icon" className="w-12 h-12 mb-4 opacity-80" />
              <p className="text-xs text-amber-200/70 mb-6 tracking-widest uppercase font-light">
                Exclusive Wedding Invitation
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnlockAndPlay();
                }}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-white text-[11px] font-semibold uppercase tracking-[0.25em] shadow-2xl active:scale-95 transition-transform"
              >
                Open Invitation
              </button>
            </div>
          ) : (
            <video
              ref={introVideoRef}
              src="https://cdn.invitationsstudio.com/templates/template-1047/lock-cover.mp4"
              className="w-full h-full object-cover object-center"
              playsInline
              muted
              preload="auto"
              onError={() => setVideoError(true)}
              onEnded={handleUnlockAndPlay}
            />
          )}

          <div className="absolute inset-x-4 bottom-10 z-50 pointer-events-none flex justify-center font-sans">
            <div className="relative max-w-sm w-full bg-black/60 backdrop-blur-xl border border-[#D4AF37]/40 rounded-3xl px-6 py-4 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <span className="text-xs">✨</span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold">
                  VIP Invitation For
                </span>
                <span className="text-xs">✨</span>
              </div>
              <h2 className="text-lg font-serif text-white font-normal tracking-wide capitalize truncate">
                {guestTitle} {guestName}
              </h2>
              {!isPlaying && (
                <p className="text-[10px] text-amber-200/90 font-light mt-1.5 tracking-widest uppercase animate-pulse">
                  Tap screen to unlock
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. HERO SECTION ==================== */}
      <section id="home" className="relative w-full h-[100dvh] flex flex-col justify-end overflow-hidden">
        <div className="absolute inset-0 w-full h-full z-0 bg-[#12100E]">
          <video
            ref={heroVideoRef}
            src="https://cdn.invitationsstudio.com/templates/template-1047/hero.mp4"
            className="w-full h-full object-cover object-center"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster={IMAGES.HERO_FALLBACK}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12100E] via-[#12100E]/30 to-black/30"></div>
        </div>

        <div className="relative z-10 w-full max-w-2xl mx-auto px-6 pb-12 pt-10 flex flex-col items-center justify-end text-center space-y-4 font-sans">
          {guestName && (
            <div className="inline-block bg-black/50 backdrop-blur-md border border-[#D4AF37]/40 rounded-full px-5 py-2 shadow-xl mb-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#E8D3A7] font-medium">
                Honorary Guest: {guestTitle} {guestName}
              </p>
            </div>
          )}

          <div className="flex flex-col items-center justify-center space-y-3 w-full">
            <p className="text-[11px] uppercase tracking-[0.45em] text-[#D4AF37] font-serif font-semibold">
              THE WEDDING OF
            </p>

            <h1 className="text-4xl sm:text-6xl font-serif text-[#F4E8D1] tracking-wider italic font-normal drop-shadow-lg capitalize leading-tight">
              {groomName} <span className="font-serif not-italic text-[#D4AF37] mx-1.5">&</span> {brideName}
            </h1>

            <img
              src={IMAGES.DIVIDER}
              alt="Divider Ornament"
              className="w-48 h-auto my-2 opacity-80 filter brightness-125"
            />

            {formattedHeroDate && (
              <p className="text-xs sm:text-base font-serif text-[#E8D3A7] tracking-[0.4em] font-light uppercase">
                {formattedHeroDate}
              </p>
            )}
          </div>

          <div
            className="pt-6 animate-bounce flex flex-col items-center cursor-pointer"
            onClick={() => scrollToSection('invitation-card')}
          >
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#D4AF37] font-semibold mb-1">
              Scroll Down
            </p>
            <span className="text-sm text-[#D4AF37]">↓</span>
          </div>
        </div>
      </section>

      {/* ==================== 3. INVITATION CARD SECTION ==================== */}
      <section
        id="invitation-card"
        className="relative w-full bg-[#F3ECE4] text-[#4A3E3D] py-20 px-6 border-b border-[#E3D7C9]"
      >
        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center text-center space-y-6">
          <div className="w-full flex justify-center pt-2">
            <img
              src={IMAGES.KEY}
              alt="Key Ornament"
              className="w-16 sm:w-20 h-auto opacity-80"
            />
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.35em] text-[#8C7A6B]">
              THE
            </p>
            <h2 className="text-sm sm:text-base tracking-[0.25em] text-[#5C4D43] font-semibold uppercase">
              FAMILIES
            </h2>
          </div>

          <div className="space-y-1.5 pt-1">
            <p className="text-xs sm:text-sm italic text-[#7A685A] tracking-wider">
              joyfully invite you to celebrate
            </p>
            <p className="text-xs sm:text-sm italic text-[#7A685A] tracking-wider">
              the wedding of
            </p>
          </div>

          <div className="py-2">
            <h1 className="text-4xl sm:text-5xl font-serif text-[#C5A880] tracking-wide italic font-normal capitalize">
              {groomName} <span className="not-italic text-[#B39368] font-serif mx-1">&</span> {brideName}
            </h1>
          </div>

          {guest?.personal_message && (
            <div className="w-full p-4 rounded-2xl bg-white/50 border border-[#D8C8B8] my-2">
              <p className="text-xs italic text-[#6B5B50]">
                "{guest.personal_message}"
              </p>
            </div>
          )}

          <div className="space-y-4 max-w-xs mx-auto">
            <p className="text-xs sm:text-sm text-[#6B5B50] leading-relaxed italic">
              as they begin their new chapter together.
            </p>
            <p className="text-xs sm:text-sm text-[#6B5B50] leading-relaxed pt-1">
              Your presence would make this special day even more meaningful.
            </p>
          </div>

          <div className="pt-6 pb-4 flex justify-center w-full">
            <div className="relative w-56 h-72 sm:w-64 sm:h-80 rounded-t-full border-[3px] border-[#D8C8B8]/70 p-1.5 bg-[#F3ECE4] shadow-xl">
              <div className="w-full h-full rounded-t-full overflow-hidden">
                <img
                  src={coupleImage}
                  alt={`${groomName} and ${brideName}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 4. HOLY AYAT & QUOTE SECTION ==================== */}
      <section
        id="ayat-section"
        className="relative w-full bg-[#F3ECE4] text-[#4A3E3D] py-20 px-6 border-b border-[#E3D7C9]"
      >
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center space-y-6">
          <p
            className="text-2xl sm:text-3xl text-[#8C7456] leading-loose font-arabic"
            dir="rtl"
            style={{ fontFamily: '"Amiri", "Traditional Arabic", serif' }}
          >
            {quoteArabic}
          </p>

          <img src={IMAGES.DIVIDER} alt="Divider" className="w-36 h-auto opacity-70" />

          <p className="text-base sm:text-lg font-serif text-[#B8966C] italic leading-relaxed font-light max-w-lg">
            "{quoteText}"
          </p>

          <p className="text-[11px] uppercase tracking-[0.4em] text-[#8C7A6B] font-semibold pt-1">
            {quoteReference}
          </p>
        </div>
      </section>

      {/* ==================== 5. COUNTDOWN SECTION ==================== */}
      {targetDateStr && (
        <section
          id="countdown-section"
          className="relative w-full bg-[#F3ECE4] py-16 px-6 border-b border-[#E3D7C9]"
        >
          <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center space-y-8">
            <h3 className="text-xs sm:text-sm font-serif uppercase tracking-[0.45em] text-[#5C4D43] font-medium">
              COUNTDOWN TO THE CELEBRATION
            </h3>

            <div className="grid grid-cols-4 gap-3 sm:gap-6 w-full max-w-md bg-white/40 p-6 rounded-3xl border border-[#EADFCF] shadow-sm backdrop-blur-sm">
              <div className="flex flex-col items-center relative">
                <span className="text-3xl sm:text-5xl font-serif text-[#B8966C] font-light">
                  {String(timeLeft.days).padStart(2, '0')}
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-[#8C7A6B] mt-2 font-semibold">
                  DAYS
                </span>
                <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-[#D8C8B8]/50"></div>
              </div>

              <div className="flex flex-col items-center relative">
                <span className="text-3xl sm:text-5xl font-serif text-[#B8966C] font-light">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-[#8C7A6B] mt-2 font-semibold">
                  HOURS
                </span>
                <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-[#D8C8B8]/50"></div>
              </div>

              <div className="flex flex-col items-center relative">
                <span className="text-3xl sm:text-5xl font-serif text-[#B8966C] font-light">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-[#8C7A6B] mt-2 font-semibold">
                  MINS
                </span>
                <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-[#D8C8B8]/50"></div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-3xl sm:text-5xl font-serif text-[#B8966C] font-light">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-[#8C7A6B] mt-2 font-semibold">
                  SECS
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== 6. TIMELINE & INVITED EVENTS SECTION ==================== */}
      {invitedEvents.length > 0 && (
        <section id="timeline-section" className="relative w-full bg-[#F3ECE4] py-20 px-6 border-b border-[#E3D7C9]">
          <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center space-y-12">
            <div className="space-y-3 w-full flex flex-col items-center">
              <h2 className="text-base sm:text-lg font-serif uppercase tracking-[0.45em] text-[#A38D6D] font-normal">
                EVENTS & SCHEDULE
              </h2>
              <img src={IMAGES.DIVIDER} alt="Divider" className="w-36 h-auto opacity-70" />
            </div>

            <div className="w-full space-y-16">
              {invitedEvents.map((event, idx) => (
                <div
                  key={event.id || idx}
                  className="flex flex-col items-center text-center space-y-4 max-w-md mx-auto p-6 rounded-3xl bg-white/40 border border-[#EADFCF] shadow-sm backdrop-blur-sm"
                >
                  <div className="w-full max-w-sm mb-2 overflow-hidden rounded-2xl">
                    <img
                      src={IMAGES.EVENT_ILLUSTRATION}
                      alt={event.name}
                      className="w-full h-auto object-cover"
                    />
                  </div>

                  <h3 className="text-3xl sm:text-4xl font-serif text-[#7A685A] italic font-normal tracking-wide capitalize">
                    {event.name}
                  </h3>

                  <img src={IMAGES.DIVIDER} alt="Divider" className="w-24 h-auto opacity-60 my-1" />

                  {event.date && (
                    <p className="text-xs font-serif uppercase tracking-[0.25em] text-[#9A8878] font-light">
                      {formatDisplayDate(event.date)}
                    </p>
                  )}

                  {event.time && (
                    <p className="text-2xl sm:text-3xl font-serif text-[#A38D6D] tracking-[0.2em] font-light py-1">
                      {event.time}
                    </p>
                  )}

                  <div className="space-y-1.5 max-w-xs pt-1">
                    {event.venue_name && (
                      <p className="text-lg sm:text-xl font-serif text-[#6B5B50] font-normal">
                        {event.venue_name}
                      </p>
                    )}
                    {event.address && (
                      <p className="text-xs sm:text-sm font-serif text-[#8C7A6B] leading-relaxed font-light">
                        Address: {event.address}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 flex flex-row items-center justify-center gap-3 w-full max-w-xs">
                    <button
                      onClick={() => handleViewMap(event)}
                      className="flex-1 py-2.5 px-3 rounded-full border border-[#D8C8B8] bg-[#EFE7DD]/50 text-[#7A685A] hover:bg-[#EAE0D5] hover:border-[#C5A880] text-[9px] sm:text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-sm active:scale-95 whitespace-nowrap"
                    >
                      VIEW ON MAP
                    </button>

                    <button
                      onClick={() => handleAddToCalendar(event)}
                      className="flex-1 py-2.5 px-3 rounded-full border border-[#C5A880] bg-[#EAE0D5]/80 text-[#5C4D43] hover:bg-[#C5A880] hover:text-white text-[9px] sm:text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-sm active:scale-95 whitespace-nowrap"
                    >
                      ADD TO CALENDAR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================== 7. DRESS CODE SECTION ==================== */}
      <section className="relative w-full bg-[#F3ECE4] py-20 px-6 border-b border-[#E3D7C9] overflow-hidden">
        <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center space-y-6">
          <h2 className="text-base sm:text-lg font-serif uppercase tracking-[0.45em] text-[#5C4D43] font-medium">
            DRESS CODE
          </h2>

          <img src={IMAGES.DIVIDER} alt="Divider" className="w-36 h-auto opacity-70" />

          <p className="text-sm sm:text-base font-serif text-[#7A685A] italic leading-relaxed max-w-md">
            {wedding.dress_code || 'We kindly ask you to wear elegant attire in the colours of the palette below.'}
          </p>

          <div className="flex items-center justify-center gap-3 pt-2 pb-4">
            {paletteColors.map((color, idx) => (
              <span
                key={idx}
                className="w-8 h-8 rounded-full border-2 border-white shadow-md inline-block transition-transform duration-300 hover:scale-110"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="w-full max-w-lg mt-4 overflow-hidden rounded-2xl shadow-sm border border-[#EADFCF]/60">
            <img
              src={IMAGES.DRESSCODE}
              alt="Dress Code Illustration"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>

      {/* ==================== 8. DYNAMIC RSVP SECTION ==================== */}
      <section id="rsvp-section" className="relative w-full bg-[#F3ECE4] py-20 px-6 border-b border-[#E3D7C9]">
        <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center space-y-8">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl shadow-sm border border-[#EADFCF]/70 mb-2">
            <img
              src={IMAGES.RSVP_GIF}
              alt="RSVP Decoration"
              className="w-full h-auto object-cover"
            />
          </div>

          <div className="space-y-3 w-full flex flex-col items-center">
            <h2 className="text-lg sm:text-xl font-serif uppercase tracking-[0.45em] text-[#5C4D43] font-medium">
              R S V P
            </h2>
            <img src={IMAGES.DIVIDER} alt="Divider" className="w-40 h-auto opacity-70" />
          </div>

          <p className="text-sm font-serif text-[#7A685A] italic">
            Please respond to confirm your presence for our grand celebration
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md pt-2">
            <button
              disabled={isUpdatingRsvp}
              onClick={() => handleRsvpChange('attending')}
              className={`w-full py-4 px-6 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.25em] transition-all duration-300 shadow-lg active:scale-95 ${
                rsvpChoice === 'attending'
                  ? 'bg-[#B8966C] text-white ring-4 ring-[#B8966C]/20 scale-105'
                  : 'bg-white border border-[#B8966C] text-[#5C4D43] hover:bg-[#B8966C]/10'
              }`}
            >
              {isUpdatingRsvp && rsvpChoice === 'attending' ? 'Updating...' : 'Attending'}
            </button>

            <button
              disabled={isUpdatingRsvp}
              onClick={() => handleRsvpChange('declined')}
              className={`w-full py-4 px-6 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.25em] transition-all duration-300 shadow-md active:scale-95 ${
                rsvpChoice === 'declined'
                  ? 'bg-[#8C7A6B] text-white ring-4 ring-[#8C7A6B]/20 scale-105'
                  : 'bg-white border border-[#8C7A6B]/50 text-[#7A685A] hover:bg-[#8C7A6B]/10'
              }`}
            >
              {isUpdatingRsvp && rsvpChoice === 'declined' ? 'Updating...' : 'Cannot Attend'}
            </button>
          </div>

          {rsvpChoice === 'attending' && (
            <div className="w-full max-w-md p-8 rounded-3xl bg-white/80 border border-[#B8966C]/40 shadow-xl space-y-3 backdrop-blur-sm">
              <span className="text-3xl">✨</span>
              <h3 className="text-xl font-serif text-[#B8966C] italic font-medium">
                We are happy you are joining us!
              </h3>
              <p className="text-xs sm:text-sm font-serif text-[#6B5B50] leading-relaxed">
                Thank you, <span className="font-semibold text-[#5C4D43]">{guestTitle} {guestName}</span>. Your presence will make our celebration complete and truly memorable.
              </p>
            </div>
          )}

          {rsvpChoice === 'declined' && (
            <div className="w-full max-w-md p-8 rounded-3xl bg-white/80 border border-[#8C7A6B]/40 shadow-xl space-y-3 backdrop-blur-sm">
              <span className="text-3xl">🌸</span>
              <h3 className="text-xl font-serif text-[#8C7A6B] italic font-medium">
                We will miss you!
              </h3>
              <p className="text-xs sm:text-sm font-serif text-[#6B5B50] leading-relaxed">
                Dear <span className="font-semibold text-[#5C4D43]">{guestTitle} {guestName}</span>, we are sad you won't be able to make it, but we deeply appreciate your warm wishes and blessings from afar.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ==================== 9. FAMILY MEMBERS SECTION ==================== */}
      {familyMembers.length > 0 && (
        <section className="relative w-full bg-[#F3ECE4] py-20 px-6 border-b border-[#E3D7C9]">
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center space-y-12">
            <div className="space-y-3 w-full flex flex-col items-center">
              <h2 className="text-base sm:text-lg font-serif uppercase tracking-[0.45em] text-[#5C4D43] font-medium">
                HONORED FAMILY MEMBERS
              </h2>
              <img src={IMAGES.DIVIDER} alt="Divider" className="w-40 h-auto opacity-70" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 w-full">
              {familyMembers.map((member) => (
                <div
                  key={member.id}
                  className="group flex flex-col items-center p-4 rounded-3xl bg-white/60 border border-[#EADFCF] shadow-sm hover:shadow-xl hover:border-[#B8966C]/50 transition-all duration-300 backdrop-blur-sm"
                >
                  {member.profile_image && (
                    <div className="relative w-24 h-28 sm:w-28 sm:h-32 rounded-t-full border border-[#D8C8B8] p-1 bg-[#F3ECE4] overflow-hidden mb-3 shadow-inner">
                      <img
                        src={member.profile_image}
                        alt={member.name}
                        className="w-full h-full object-cover rounded-t-full group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="text-center space-y-1 w-full">
                    <h4 className="text-xs sm:text-sm font-serif font-semibold text-[#5C4D43] leading-tight truncate">
                      {member.name}
                    </h4>
                    {member.role && (
                      <p className="text-[10px] sm:text-xs font-serif text-[#8C7A6B] italic truncate">
                        {member.role}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================== 10. FOOTER CLOSING SECTION ==================== */}
      <section
        className="relative w-full min-h-[500px] flex items-center justify-center bg-cover bg-center py-24 px-6 text-center font-serif overflow-hidden"
        style={{
          backgroundImage: `url('${IMAGES.FOOTER_BG}')`,
        }}
      >
        <div className="absolute inset-0 bg-[#F3ECE4]/40 backdrop-blur-[1px]"></div>

        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-serif italic text-[#7A685A] font-normal tracking-wide">
            We look forward to seeing you.
          </h2>

          <img src={IMAGES.DIVIDER} alt="Divider" className="w-36 h-auto opacity-70" />

          {formattedHeroDate && (
            <p className="text-base sm:text-lg tracking-[0.35em] text-[#7A685A] font-serif font-light uppercase pt-1">
              {formattedHeroDate}
            </p>
          )}

          <div className="pt-2">
            <img
              src={IMAGES.KEY}
              alt="Vintage Key"
              className="w-24 sm:w-28 h-auto opacity-85 transition-transform duration-500 hover:scale-105"
            />
          </div>
        </div>
      </section>

    </main>
  );
}
