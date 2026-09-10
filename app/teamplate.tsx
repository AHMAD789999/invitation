'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EventTimelineItem {
  time: string;
  activity: string;
  icon: string;
}

interface EventDetails {
  title: string;
  badge: string;
  date: string;
  startTime: string;
  venue: string;
  mapUrl?: string;
  bgGradient: string;
  icon: string;
  timeline: EventTimelineItem[];
}

interface WeddingDetails {
  groom_name?: string;
  bride_name?: string;
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
  groom_family_members?: string[];
  contact_person_1?: string;
  contact_number_1?: string;
  contact_person_2?: string;
  contact_number_2?: string;
  bg_hero_image?: string; // Added field for dynamic background hero image
}

interface GuestData {
  id: string;
  name: string;
  title_prefix?: string;
  allowed_guests?: number;
  invited_events?: string[];
  personal_message?: string | null;
  token: string;
  wedding: WeddingDetails | null;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// -------------------------------------------------------------
// HELPER FUNCTIONS
// -------------------------------------------------------------

const formatDateAccurate = (dateStr?: string) => {
  if (!dateStr) return 'Date To Be Announced';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const localDate = new Date(year, month, day);
    return localDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    });
  }
  return dateStr;
};

const parseEventDateTime = (dateStr?: string, timeStr?: string): Date => {
  if (!dateStr) return new Date();

  const [year, month, day] = dateStr.split('-').map(Number);
  let hours = 19;
  let minutes = 0;

  if (timeStr) {
    const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      const modifier = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      if (!modifier && hours < 8) hours += 12;
    }
  }

  return new Date(year, month - 1, day, hours, minutes, 0);
};

const format12HourTime = (timeStr?: string) => {
  if (!timeStr) return 'TBA';
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return timeStr;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  let modifier = match[3] ? match[3].toUpperCase() : null;

  if (!modifier) {
    if (hours >= 12) {
      modifier = 'PM';
      if (hours > 12) hours -= 12;
    } else {
      modifier = hours < 8 ? 'PM' : 'AM';
    }
  }
  const formattedHours = hours === 0 ? 12 : hours;
  return `${formattedHours < 10 ? '0' + formattedHours : formattedHours}:${minutes} ${modifier}`;
};

const generateDynamicTimeline = (startStr?: string) => {
  if (!startStr) {
    return [
      { time: 'TBA', activity: 'Guest Arrival & Welcome Refreshments', icon: '⏱️' },
      { time: 'TBA', activity: 'Main Ceremony & Celebrations', icon: '🌺' },
      { time: 'TBA', activity: 'Dinner Buffet Service', icon: '🍽️' },
    ];
  }

  const match = startStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  let baseHour = 7;
  let isPM = true;

  if (match) {
    baseHour = parseInt(match[1], 10);
    if (match[3]) {
      isPM = match[3].toUpperCase() === 'PM';
    } else {
      isPM = baseHour < 8 || baseHour >= 12;
    }
  }

  const formatHour = (h: number) => {
    const period = h >= 12 && h < 24 ? 'PM' : 'AM';
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12 < 10 ? '0' + hour12 : hour12}:00 ${period}`;
  };

  let start24 = isPM && baseHour < 12 ? baseHour + 12 : baseHour;

  return [
    { time: formatHour(start24), activity: 'Guest Arrival & Welcome Refreshments', icon: '⏱️' },
    { time: formatHour(start24 + 1), activity: 'Main Ceremony & Celebrations', icon: '🌺' },
    { time: formatHour(start24 + 2), activity: 'Dinner Buffet Service', icon: '🍽️' },
  ];
};

const createGoogleCalendarUrl = (event: EventDetails, groomName: string, brideName: string) => {
  const startObj = parseEventDateTime(event.date, event.startTime);
  const endObj = new Date(startObj.getTime() + 3 * 60 * 60 * 1000);

  const formatISO = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const title = encodeURIComponent(`${event.title} - ${groomName} & ${brideName}`);
  const details = encodeURIComponent(
    `You are cordially invited to celebrate the ${event.title} of ${groomName} & ${brideName}.\nVenue: ${event.venue}`
  );
  const location = encodeURIComponent(event.venue);
  const dates = `${formatISO(startObj)}/${formatISO(endObj)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
};

// -------------------------------------------------------------
// EVENT TIMELINE BLOCK COMPONENT (Inline Dynamic Countdown)
// -------------------------------------------------------------

function EventInlineBlock({
  event,
  groomName,
  brideName,
  index,
}: {
  event: EventDetails;
  groomName: string;
  brideName: string;
  index: number;
}) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!event.date) return;
    const targetDate = parseEventDateTime(event.date, event.startTime);

    const calculateTime = () => {
      const difference = targetDate.getTime() - new Date().getTime();

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

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [event]);

  const googleCalUrl = createGoogleCalendarUrl(event, groomName, brideName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="relative pl-6 sm:pl-10 pb-12 last:pb-0 font-sans border-l-2 border-amber-400/30"
    >
      {/* TIMELINE NODE */}
      <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-[#0e3b2b] border-2 border-amber-400 flex items-center justify-center text-sm shadow-[0_0_15px_rgba(217,119,6,0.5)]">
        {event.icon}
      </div>
      {/* FULL INLINE EVENT SECTION */}
      <div className="bg-gradient-to-b from-[#0a2c20]/90 via-[#061d15]/90 to-[#030e0a]/90 border border-amber-400/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        
        {/* HEADER & BADGE */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/20 pb-4 mb-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 px-3 py-1 rounded-full shadow-md">
              {event.badge} Ceremony
            </span>
            <h3 className="text-xl sm:text-3xl font-extrabold text-white font-serif mt-2">
              {event.title}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-[11px] font-extrabold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
            >
              <span>📅</span> Add to Calendar
            </a>
            {event.mapUrl && (
              <a
                href={event.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 text-[11px] font-black px-3.5 py-2 rounded-xl transition shadow-lg flex items-center gap-1.5"
              >
                <span>🗺️</span> Open Map
              </a>
            )}
          </div>
        </div>

        {/* DATE, TIME & COUNTDOWN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          
          {/* DATE & TIME INFO */}
          <div className="md:col-span-1 bg-[#051d15] p-4 rounded-2xl border border-amber-400/15 flex flex-col justify-center space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">📅</span>
              <div>
                <span className="text-[9px] uppercase font-black text-amber-400/80 block">Date</span>
                <span className="text-xs sm:text-sm font-bold text-amber-100">{formatDateAccurate(event.date)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-amber-400/10">
              <span className="text-xl">⏰</span>
              <div>
                <span className="text-[9px] uppercase font-black text-amber-400/80 block">Timing</span>
                <span className="text-xs sm:text-sm font-bold text-amber-300">{event.startTime}</span>
              </div>
            </div>
          </div>

          {/* COUNTDOWN TIMER */}
          <div className="md:col-span-2 bg-[#051d15] p-4 rounded-2xl border border-amber-400/15 flex flex-col justify-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-300/80 block mb-2 text-center">
              ⏳ Countdown To Ceremony
            </span>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-[#0a2c20] p-2.5 rounded-xl border border-amber-400/20">
                <span className="block text-base sm:text-lg font-black text-amber-100">{timeLeft.days}</span>
                <span className="text-[8px] sm:text-[9px] uppercase font-bold text-amber-400">Days</span>
              </div>
              <div className="bg-[#0a2c20] p-2.5 rounded-xl border border-amber-400/20">
                <span className="block text-base sm:text-lg font-black text-amber-100">{timeLeft.hours}</span>
                <span className="text-[8px] sm:text-[9px] uppercase font-bold text-amber-400">Hours</span>
              </div>
              <div className="bg-[#0a2c20] p-2.5 rounded-xl border border-amber-400/20">
                <span className="block text-base sm:text-lg font-black text-amber-100">{timeLeft.minutes}</span>
                <span className="text-[8px] sm:text-[9px] uppercase font-bold text-amber-400">Mins</span>
              </div>
              <div className="bg-[#0a2c20] p-2.5 rounded-xl border border-amber-400/20">
                <span className="block text-base sm:text-lg font-black text-amber-100">{timeLeft.seconds}</span>
                <span className="text-[8px] sm:text-[9px] uppercase font-bold text-amber-400">Secs</span>
              </div>
            </div>
          </div>
        </div>

        {/* VENUE ADDRESS */}
        <div className="bg-[#051d15] p-4 rounded-2xl border border-amber-400/15 mb-6">
          <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block mb-1">
            📍 Venue Location
          </span>
          <p className="text-xs sm:text-sm font-bold text-amber-100 leading-relaxed">
            {event.venue}
          </p>
        </div>

        {/* EVENT SCHEDULE TIMELINE */}
        <div className="bg-[#051d15] p-4 rounded-2xl border border-amber-400/15">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 mb-3 border-b border-amber-400/10 pb-2">
            ⏱️ Program Schedule
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {event.timeline.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0a2c20] border border-amber-400/10"
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <span className="text-xs shrink-0">{item.icon}</span>
                  <span className="text-xs font-bold text-amber-100 truncate">{item.activity}</span>
                </div>
                <span className="text-[9px] font-black text-amber-950 bg-amber-400 px-2 py-0.5 rounded shrink-0">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
}

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------

export default function WeddingLandingPage({ guest }: { guest: GuestData }) {
  const wedding = guest?.wedding;
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const curtainImg = 'https://afzal-tanha-wedding.vercel.app/assets/green-DidESt9-.png';
  
  // Dynamic Background Hero Image resolved from wedding data or fallback URL
  const bgHeroImg = wedding?.bg_hero_image || 'https://afzal-tanha-wedding.vercel.app/assets/green-DidESt9-.png';

  const groomName = wedding?.groom_name || 'Dulha';
  const brideName = wedding?.bride_name || 'Dulhan';

  const eventsData: EventDetails[] = [
    {
      title: 'Mehndi Ceremony',
      badge: 'Mehndi',
      date: wedding?.mehndi_date || '',
      startTime: format12HourTime(wedding?.mehndi_time),
      venue: wedding?.mehndi_venue || 'Venue Address Will Be Updated Soon',
      mapUrl: wedding?.mehndi_map_url,
      bgGradient: 'from-amber-600 via-amber-800 to-yellow-950',
      icon: '🌺',
      timeline: generateDynamicTimeline(wedding?.mehndi_time),
    },
    {
      title: 'Barat Ceremony',
      badge: 'Barat',
      date: wedding?.barat_date || '',
      startTime: format12HourTime(wedding?.barat_time),
      venue: wedding?.barat_venue || 'Venue Address Will Be Updated Soon',
      mapUrl: wedding?.barat_map_url,
      bgGradient: 'from-rose-800 via-rose-900 to-pink-950',
      icon: '🎺',
      timeline: generateDynamicTimeline(wedding?.barat_time),
    },
    {
      title: 'Walima Reception',
      badge: 'Walima',
      date: wedding?.walima_date || '',
      startTime: format12HourTime(wedding?.walima_time),
      venue: wedding?.walima_venue || 'Venue Address Will Be Updated Soon',
      mapUrl: wedding?.walima_map_url,
      bgGradient: 'from-emerald-800 via-teal-900 to-slate-950',
      icon: '✨',
      timeline: generateDynamicTimeline(wedding?.walima_time),
    },
  ];

  const guestEvents = eventsData.filter((evt) =>
    guest?.invited_events?.length ? guest.invited_events.includes(evt.badge) : true
  );

  const familyMembers = wedding?.groom_family_members?.length
    ? wedding.groom_family_members
    : [];

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    `GUEST:${guest.id}|TOKEN:${guest.token}`
  )}`;

  return (
    <div className="min-h-screen bg-[#051610] text-[#f4e8c1] font-serif selection:bg-[#2b684f] selection:text-white pb-16 sm:pb-24 overflow-x-hidden">
      
      {/* ROYAL HERO SECTION */}
      <section className="relative min-h-[90vh] sm:min-h-screen flex items-center justify-center text-center overflow-hidden border-b-4 border-[#3e8e6b]">
        
        <motion.div
          initial={{ scale: 1.1, opacity: 0.3 }}
          animate={{ scale: isOpen ? 1 : 1.1, opacity: isOpen ? 1 : 0.3 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${bgHeroImg}')` }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-b from-[#030e0a]/90 via-[#071d15]/80 to-[#030e0a]/95 backdrop-blur-[2px]" />

        {/* CURTAIN UNVEIL SYSTEM */}
        <AnimatePresence>
          {!isOpen && (
            <div className="absolute inset-0 z-30 flex pointer-events-auto">
              <motion.div
                initial={{ x: '0%' }}
                exit={{ x: '-100%' }}
                transition={{ duration: 1.4, ease: [0.77, 0, 0.175, 1] }}
                className="w-1/2 h-full bg-cover bg-left relative border-r-2 border-amber-400/50 shadow-2xl"
                style={{ backgroundImage: `url('${curtainImg}')` }}
              >
                <div className="absolute inset-0 bg-black/40" />
              </motion.div>

              <motion.div
                initial={{ x: '0%' }}
                exit={{ x: '100%' }}
                transition={{ duration: 1.4, ease: [0.77, 0, 0.175, 1] }}
                className="w-1/2 h-full bg-cover bg-right relative border-l-2 border-amber-400/50 shadow-2xl"
                style={{ backgroundImage: `url('${curtainImg}')` }}
              >
                <div className="absolute inset-0 bg-black/40" />
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 m-auto w-fit h-fit z-40 flex flex-col items-center justify-center p-2"
              >
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  className="group relative cursor-pointer focus:outline-none touch-manipulation active:scale-95 transition transform"
                >
                  <div className="absolute -inset-3 sm:-inset-4 rounded-full bg-gradient-to-r from-amber-300 via-amber-500 to-yellow-600 opacity-80 blur-md animate-pulse group-hover:opacity-100 transition duration-500" />

                  <div className="relative w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-gradient-to-b from-[#0e3b2b] via-[#071d15] to-[#030e0a] border-4 border-amber-400/80 shadow-[0_0_50px_rgba(217,119,6,0.7)] flex flex-col items-center justify-center p-4 text-center overflow-hidden">
                    <div className="absolute inset-2 sm:inset-3 rounded-full border-2 border-dashed border-amber-300/40 pointer-events-none" />

                    <span className="text-xl sm:text-2xl mb-1 animate-bounce">👑</span>
                    
                    <span className="text-[9px] sm:text-[10px] font-sans font-black tracking-[0.25em] uppercase text-amber-300/80 mb-1">
                      Royal Invitation
                    </span>

                    <div className="my-1 px-2">
                      <h3 className="text-base sm:text-xl font-extrabold text-white leading-tight font-serif drop-shadow-md truncate max-w-[180px] sm:max-w-[220px]">
                        {groomName}
                      </h3>
                      <span className="text-amber-400 font-serif italic text-sm sm:text-base font-light my-0.5 block">
                        &amp;
                      </span>
                      <h3 className="text-base sm:text-xl font-extrabold text-white leading-tight font-serif drop-shadow-md truncate max-w-[180px] sm:max-w-[220px]">
                        {brideName}
                      </h3>
                    </div>

                    <div className="mt-2 inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 text-slate-950 text-[9px] sm:text-[10px] font-sans font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg group-hover:scale-105 transition">
                      <span>✉️</span> Tap To Unveil
                    </div>
                  </div>
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="max-w-3xl mx-auto relative z-20 space-y-4 sm:space-y-6 px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 30 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="space-y-4"
          >
            <div className="text-2xl sm:text-5xl font-bold tracking-widest text-[#f0e3bc] leading-snug drop-shadow-md">
              بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
            </div>
            <p className="text-[9px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[#d4c498] font-sans font-extrabold">
              In the Name of Allah, the Most Gracious, the Most Merciful
            </p>

            <div className="mt-4 sm:mt-6 max-w-md mx-auto bg-gradient-to-b from-white/10 to-black/50 backdrop-blur-md border border-amber-400/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative">
              <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 text-slate-950 text-[9px] sm:text-[10px] font-sans font-black tracking-widest uppercase px-3 py-1 rounded-full mb-2 shadow-lg">
                <span>⭐</span> VIP Exclusive Guest Pass <span>⭐</span>
              </div>

              <h2 className="text-base sm:text-xl font-bold text-white leading-tight">
                Honored Guest:{' '}
                <span className="text-amber-300 font-extrabold underline underline-offset-4 decoration-amber-500">
                  {guest.title_prefix ? `${guest.title_prefix}. ` : ''}
                  {guest.name}
                </span>
              </h2>

              <p className="text-[11px] sm:text-xs font-sans leading-relaxed text-[#f4e8c1] mt-2 italic">
                "{guest.personal_message || 'Your presence is a sacred blessing and an absolute honor for us as we celebrate this special journey.'}"
              </p>
            </div>

            <div className="py-2">
              <p className="text-[9px] sm:text-[10px] font-sans uppercase tracking-[0.25em] sm:tracking-[0.35em] text-[#d4c498] font-extrabold">
                Cordially Request The Honor Of Your Presence At The Wedding Ceremony Of
              </p>
              <h1 className="text-3xl sm:text-6xl font-extrabold tracking-tight text-white my-3 drop-shadow-2xl leading-tight">
                {groomName}{' '}
                <span className="text-amber-400 font-serif italic font-light">&amp;</span>{' '}
                {brideName}
              </h1>
            </div>

            <div className="flex flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="bg-gradient-to-r from-amber-600 to-yellow-600 active:from-amber-700 text-white text-[10px] sm:text-[11px] font-sans font-black uppercase tracking-wider px-5 py-3 rounded-full border border-amber-300/60 shadow-xl transition transform active:scale-95 inline-flex items-center justify-center gap-2 touch-manipulation"
              >
                <span>🎫</span> Digital Entry Pass
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="bg-black/40 active:bg-black/60 text-white text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-wider px-5 py-3 rounded-full border border-amber-400/30 backdrop-blur-md transition inline-flex items-center justify-center gap-2 touch-manipulation"
              >
                <span>{copiedLink ? '✓ Copied' : '🔗 Share Link'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FULL INLINE VERTICAL TIMELINE SECTION (NO CARDS, NO POPUPS) */}
      <section className="max-w-4xl mx-auto px-4 mt-12 sm:mt-20">
        <div className="text-center mb-12 relative">
          <span className="text-amber-400 text-xs font-sans font-black tracking-[0.3em] uppercase bg-amber-400/10 px-4 py-1.5 rounded-full border border-amber-400/30">
            Celebration Itinerary
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-amber-100 font-serif mt-3">
            Wedding Program Details
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mt-3 rounded-full" />
        </div>

        {/* INLINE TIMELINE LIST */}
        <div className="ml-2 sm:ml-4">
          {guestEvents.map((evt, index) => (
            <EventInlineBlock
              key={evt.badge}
              event={evt}
              groomName={groomName}
              brideName={brideName}
              index={index}
            />
          ))}
        </div>
      </section>

      {/* RE-DESIGNED FAMILY SECTION */}
      {familyMembers.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 mt-16 sm:mt-20">
          <div className="relative bg-gradient-to-b from-[#0a2c20] to-[#04140e] border border-amber-400/40 rounded-3xl p-6 sm:p-10 shadow-2xl text-center overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
            
            <span className="text-3xl mb-2 inline-block">👑</span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-amber-100 font-serif">
              With Compliments From
            </h3>
            <p className="text-[10px] sm:text-xs font-sans text-amber-400/80 font-bold uppercase tracking-[0.25em] mt-1 mb-6">
              Family &amp; Relatives
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
              {familyMembers.map((member, index) => (
                <div
                  key={index}
                  className="bg-[#051d15] border border-amber-400/20 hover:border-amber-400/60 rounded-2xl p-3.5 shadow-sm flex items-center justify-center gap-2.5 transition duration-300"
                >
                  <span className="text-amber-400 text-xs">✨</span>
                  <span className="text-xs sm:text-sm font-bold text-amber-100">{member}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* DIGITAL PASS MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3.5 font-sans animate-in fade-in duration-200">
          <div className="bg-[#0c2b20] border-2 border-amber-400 rounded-3xl max-w-[320px] w-full p-6 text-center shadow-2xl">
            <span className="text-xs font-bold text-amber-950 uppercase bg-amber-400 px-3 py-1 rounded-full inline-block mb-3">
              VIP Digital Pass
            </span>
            <h3 className="text-base font-black text-amber-100">{guest.name}</h3>

            <div className="my-4 p-3 bg-white rounded-2xl border-2 border-amber-400 inline-block shadow-inner">
              <img
                src={qrImageUrl}
                alt="QR Code"
                className="w-40 h-40 bg-white p-1 rounded-xl mx-auto object-contain"
              />
            </div>

            <p className="text-[10px] text-amber-200/70 font-medium mb-4 leading-normal">
              Scan this pass at the venue entrance.
            </p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-3 bg-amber-500 active:bg-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition touch-manipulation"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}