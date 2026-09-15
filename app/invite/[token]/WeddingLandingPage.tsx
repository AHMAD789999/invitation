// app/invite/[token]/WeddingLandingPage.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ==================== TYPES ====================
interface Wedding {
  id?: string;
  groom_name?: string;
  bride_name?: string;
  groom_image?: string;
  bride_image?: string;
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
}

interface Guest {
  id: string;
  name?: string;
  title_prefix?: string;
  allowed_guests?: number;
  invited_events?: string[];
  personal_message?: string;
  token?: string;
  rsvp_status?: 'pending' | 'attending' | 'not_attending' | 'maybe';
  rsvp_updated_at?: string;
  wedding?: Wedding;
}

interface FamilyMember {
  id: string;
  name: string;
  profile_image?: string;
  role?: string;
  created_at?: string;
}

interface Ayat {
  arabic: string;
  translation: string;
  reference: string;
}

interface EventItem {
  id: string;
  name: string;
  emoji: string;
  video: string;
  color: 'amber' | 'rose' | 'emerald';
  date?: string;
  time?: string;
  venue?: string;
  mapLink?: string;
  ref: React.RefObject<HTMLVideoElement | null>;
  watched: boolean;
  setWatched: React.Dispatch<React.SetStateAction<boolean>>;
  invitedKey: string;
  ayat: Ayat;
}

interface WeddingLandingPageProps {
  guest: Guest;
  familyMembers?: FamilyMember[];
}

interface ColorScheme {
  border: string;
  text: string;
  textLight: string;
  bg: string;
  bgHover: string;
  borderBtn: string;
}

// ==================== MAIN COMPONENT ====================
export default function WeddingLandingPage({
  guest,
  familyMembers = [],
}: WeddingLandingPageProps) {
  const [stage, setStage] = useState<'intro' | 'unlocked'>('intro');
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const [rsvpStatus, setRsvpStatus] = useState<
    'pending' | 'attending' | 'not_attending' | 'maybe'
  >(guest?.rsvp_status || 'pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const mehndiVideoRef = useRef<HTMLVideoElement | null>(null);
  const baratVideoRef = useRef<HTMLVideoElement | null>(null);
  const walimaVideoRef = useRef<HTMLVideoElement | null>(null);

  const [mehndiWatched, setMehndiWatched] = useState(false);
  const [baratWatched, setBaratWatched] = useState(false);
  const [walimaWatched, setWalimaWatched] = useState(false);

  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  // ==================== DYNAMIC DATA ====================
  const guestName = guest?.name || 'Valued Guest';
  const guestTitle = guest?.title_prefix || '';
  const personalMessage = guest?.personal_message || '';
  const allowedGuests = guest?.allowed_guests || 1;
  const invitedEvents: string[] = guest?.invited_events || [
    'Mehndi',
    'Barat',
    'Walima',
  ];

  const wedding: Wedding = guest?.wedding || {};
  const groomName = wedding.groom_name || 'Groom';
  const brideName = wedding.bride_name || 'Bride';
  const groomImage = wedding.groom_image || null;
  const brideImage = wedding.bride_image || null;

  // ==================== ALL EVENTS ====================
  const allEvents: EventItem[] = [
    {
      id: 'mehndi',
      name: 'Mehndi Celebration',
      emoji: '🌿',
      video: '/mm.mp4',
      color: 'amber',
      date: wedding.mehndi_date,
      time: wedding.mehndi_time,
      venue: wedding.mehndi_venue,
      mapLink: wedding.mehndi_map_url,
      ref: mehndiVideoRef,
      watched: mehndiWatched,
      setWatched: setMehndiWatched,
      invitedKey: 'Mehndi',
      ayat: {
        arabic:
          'وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً',
        translation:
          'And among His signs is that He created for you mates from among yourselves, that you may dwell in tranquility with them, and He has put love and mercy between your hearts.',
        reference: 'Surah Ar-Rum 30:21',
      },
    },
    {
      id: 'barat',
      name: 'Nikkah & Barat',
      emoji: '💍',
      video: '/nn.mp4',
      color: 'rose',
      date: wedding.barat_date,
      time: wedding.barat_time,
      venue: wedding.barat_venue,
      mapLink: wedding.barat_map_url,
      ref: baratVideoRef,
      watched: baratWatched,
      setWatched: setBaratWatched,
      invitedKey: 'Barat',
      ayat: {
        arabic:
          'بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ',
        translation:
          'May Allah bless you, and shower His blessings upon you, and join you together in goodness.',
        reference: 'Sunan Abu Dawud 2130',
      },
    },
    {
      id: 'walima',
      name: 'Walima Reception',
      emoji: '✨',
      video: '/ww.mp4',
      color: 'emerald',
      date: wedding.walima_date,
      time: wedding.walima_time,
      venue: wedding.walima_venue,
      mapLink: wedding.walima_map_url,
      ref: walimaVideoRef,
      watched: walimaWatched,
      setWatched: setWalimaWatched,
      invitedKey: 'Walima',
      ayat: {
        arabic:
          'وَإِذَا حُيِّيتُم بِتَحِيَّةٍ فَحَيُّوا بِأَحْسَنَ مِنْهَا أَوْ رُدُّوهَا',
        translation:
          'And when you are greeted with a greeting, greet with a better greeting or return it. Indeed Allah is ever, over all things, an Accountant.',
        reference: 'Surah An-Nisa 4:86',
      },
    },
  ];

  // ==================== FILTER ====================
  const invitedEventsNormalized = (invitedEvents || []).map((e: string) =>
    String(e).toLowerCase().trim()
  );

  const events = allEvents.filter((e: EventItem) => {
    if (invitedEventsNormalized.length === 0) return true;
    return invitedEventsNormalized.includes(e.invitedKey.toLowerCase());
  });

  // ==================== COLOR MAP ====================
  const colorMap: Record<string, ColorScheme> = {
    amber: {
      border: 'border-amber-400/30',
      text: 'text-amber-400',
      textLight: 'text-amber-200',
      bg: 'bg-amber-500/20',
      bgHover: 'hover:bg-amber-500/30',
      borderBtn: 'border-amber-500/40',
    },
    rose: {
      border: 'border-rose-400/30',
      text: 'text-rose-400',
      textLight: 'text-rose-200',
      bg: 'bg-rose-500/20',
      bgHover: 'hover:bg-rose-500/30',
      borderBtn: 'border-rose-500/40',
    },
    emerald: {
      border: 'border-emerald-400/30',
      text: 'text-emerald-400',
      textLight: 'text-emerald-200',
      bg: 'bg-emerald-500/20',
      bgHover: 'hover:bg-emerald-500/30',
      borderBtn: 'border-emerald-500/40',
    },
  };

  // ==================== SCROLL LOCK ====================
  useEffect(() => {
    const shouldLock = stage === 'intro' || activeEventId !== null;
    document.body.style.overflow = shouldLock ? 'hidden' : 'auto';
    document.documentElement.style.overflow = shouldLock ? 'hidden' : 'auto';

    return () => {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    };
  }, [stage, activeEventId]);

  // ==================== INTERSECTION OBSERVER ====================
  useEffect(() => {
    if (stage !== 'unlocked') return;
    if (events.length === 0) return;

    const observers: IntersectionObserver[] = [];

    events.forEach((event: EventItem) => {
      const section = document.getElementById(`event-${event.id}`);
      if (!section) return;

      const observer = new IntersectionObserver(
        (entries: IntersectionObserverEntry[]) => {
          entries.forEach((entry: IntersectionObserverEntry) => {
            const video = event.ref.current;
            if (!video) return;

            if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
              if (!event.watched) {
                setActiveEventId(event.id);
                video.currentTime = 0;
                video.muted = false;
                video.play().catch(() => {
                  video.muted = true;
                  video.play().catch((err: unknown) => console.log('Autoplay failed:', err));
                });
              }
            }
          });
        },
        { threshold: [0.5, 0.7, 0.9] }
      );

      observer.observe(section);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs: IntersectionObserver) => obs.disconnect());
    };
  }, [stage, mehndiWatched, baratWatched, walimaWatched, events.length]);

  // ==================== HANDLERS ====================
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

  const handleVideoEnded = useCallback((event: EventItem): void => {
    event.setWatched(true);
    setActiveEventId(null);
  }, []);

  const handleRsvpSubmit = async (
    status: 'attending' | 'not_attending' | 'maybe'
  ): Promise<void> => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId: guest.id,
          rsvpStatus: status,
        }),
      });

      if (response.ok) {
        setRsvpStatus(status);
      }
    } catch (err: unknown) {
      console.error('Error updating RSVP:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateCalendarLink = (
    eventTitle: string,
    date: string | undefined,
    time: string | undefined,
    venue: string | undefined
  ): string => {
    if (!date) return '#';
    const dateObj = new Date(`${date}T${time || '12:00'}`);
    const dateStr =
      dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(dateObj.getTime() + 4 * 60 * 60 * 1000);
    const endDateStr =
      endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      eventTitle
    )}&dates=${dateStr}/${endDateStr}&details=${encodeURIComponent(
      `Wedding Celebration at ${venue || ''}`
    )}&location=${encodeURIComponent(venue || '')}`;
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'Date TBA';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const scrollToSection = (id: string): void => {
    setActiveTab(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const hasFamilyMembers = familyMembers && familyMembers.length > 0;

  // ==================== RSVP MESSAGES ====================
  const getRsvpMessage = () => {
    if (rsvpStatus === 'attending') {
      return {
        emoji: '🎉',
        title: 'JazakAllah Khair!',
        subtitle: "We're overjoyed!",
        message: `Thank you, ${guestTitle} ${guestName}! Your presence will make our celebration truly complete. We can't wait to share this blessed moment with you and your family. May Allah bless you abundantly. 🤲`,
        gradient: 'from-emerald-500/20 to-teal-500/10',
        border: 'border-emerald-400/40',
        textColor: 'text-emerald-300',
      };
    }
    if (rsvpStatus === 'not_attending') {
      return {
        emoji: '💔',
        title: 'We Will Miss You',
        subtitle: "You'll be in our hearts",
        message: `Dearest ${guestTitle} ${guestName}, we understand. While we'll deeply miss your presence at our celebration, we truly appreciate you letting us know. Please do keep us in your prayers — your duas mean the world to us. May Allah bless you with joy and health. 🤲`,
        gradient: 'from-rose-500/20 to-pink-500/10',
        border: 'border-rose-400/40',
        textColor: 'text-rose-300',
      };
    }
    if (rsvpStatus === 'maybe') {
      return {
        emoji: '🤔',
        title: 'We Hope You Can Make It',
        subtitle: 'Take your time',
        message: `Thank you ${guestTitle} ${guestName}! We completely understand — please take your time to decide. We would be honored to have you join us, InshaAllah. Do let us know when you can. 💫`,
        gradient: 'from-amber-500/20 to-yellow-500/10',
        border: 'border-amber-400/40',
        textColor: 'text-amber-300',
      };
    }
    return {
      emoji: '💌',
      title: 'Awaiting Your Reply',
      subtitle: 'Your response matters to us',
      message: `Assalam-o-Alaikum ${guestTitle} ${guestName}! We would be truly honored to have you celebrate with us. Please take a moment to respond — your presence means the world to us. 💫`,
      gradient: 'from-rose-500/20 to-pink-500/10',
      border: 'border-rose-300/30',
      textColor: 'text-rose-200',
    };
  };

  const rsvpMessage = getRsvpMessage();

  // ==================== RENDER ====================
  return (
    <main
      className={`relative w-full min-h-screen bg-black text-white overflow-x-hidden selection:bg-rose-100 selection:text-rose-900 font-sans ${
        stage !== 'intro' ? 'pb-24' : ''
      }`}
    >
      {/* ==================== INTRO GATE ==================== */}
      {stage === 'intro' && (
        <div
          onClick={handleIntroPlay}
          className="fixed inset-0 w-full h-full bg-black z-[60] flex items-center justify-center cursor-pointer"
        >
          {videoError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
              <p className="text-sm text-zinc-400 mb-4 font-light">
                Cinematic intro unavailable
              </p>
              <button
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  setStage('unlocked');
                }}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-semibold uppercase tracking-[0.2em] shadow-2xl"
              >
                Skip Intro & Enter Invitation
              </button>
            </div>
          ) : (
            <video
              ref={introVideoRef}
              src="/v.mp4"
              className="w-full h-full object-cover"
              playsInline
              preload="auto"
              onError={() => setVideoError(true)}
              onEnded={() => setStage('unlocked')}
            />
          )}

          <div className="absolute inset-x-6 bottom-12 z-50 pointer-events-none flex justify-center">
            <div className="relative inline-block max-w-xs w-full bg-black/60 backdrop-blur-xl border border-rose-300/30 rounded-2xl px-5 py-3 text-center shadow-2xl ring-1 ring-white/15">
              <div className="flex items-center justify-center space-x-1.5 mb-0.5">
                <span className="text-[9px]">✨</span>
                <span className="text-[9px] uppercase tracking-[0.2em] text-rose-300 font-bold">
                  VIP Invitation For
                </span>
                <span className="text-[9px]">✨</span>
              </div>
              <h2 className="text-lg font-serif text-white font-bold tracking-wide capitalize truncate">
                {guestTitle} {guestName}
              </h2>
              {!isPlaying && (
                <p className="text-[10px] text-rose-200/80 font-light mt-1 tracking-wider uppercase animate-pulse">
                  Tap anywhere to play intro
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== HERO SECTION ==================== */}
      <section
        id="home"
        className="relative w-full h-screen flex flex-col justify-between overflow-hidden"
      >
        <div className="absolute inset-0 w-full h-full z-0">
          <video
            src="https://pub-4dc8201144ca418fb604349c73e8c724.r2.dev/Newbeautifulvideo.mp4"
            className="w-full h-full object-cover filter brightness-50 contrast-110"
            autoPlay
            loop
            muted
            playsInline
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/90"></div>
        </div>

        <div className="relative z-10 pt-10 px-6 text-center flex-1 flex flex-col justify-between items-center max-w-md mx-auto w-full pb-12">
          <div className="inline-block bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-2 shadow-xl">
            <p className="text-[9px] uppercase tracking-[0.25em] text-rose-300 font-semibold mb-0.5">
              ✨ Special VIP Invitation For
            </p>
            <p className="text-sm font-serif text-white font-bold tracking-wide capitalize drop-shadow">
              {guestTitle} {guestName}
            </p>
          </div>

          <div className="space-y-4 my-auto">
            <p className="text-xl md:text-2xl text-rose-200 font-serif tracking-widest font-medium drop-shadow-md">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>

            <blockquote className="text-[11px] italic text-zinc-300 max-w-xs mx-auto leading-relaxed font-light drop-shadow">
              &quot;And He placed between you affection and mercy. Indeed in that
              are signs for a people who give thought.&quot;{' '}
              <span className="not-italic text-[10px] block mt-1 font-medium text-rose-300">
                (Surah Ar-Rum: 21)
              </span>
            </blockquote>

            {(groomImage || brideImage) && (
              <div className="flex items-center justify-center gap-4 pt-2">
                {groomImage && (
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-rose-400/40 shadow-lg">
                    <img
                      src={groomImage}
                      alt={groomName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <span className="text-2xl text-rose-400 font-serif">&</span>
                {brideImage && (
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-rose-400/40 shadow-lg">
                    <img
                      src={brideImage}
                      alt={brideName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {personalMessage && (
              <div className="max-w-xs mx-auto bg-white/5 backdrop-blur-md border border-rose-300/20 rounded-2xl px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-rose-300 font-bold mb-1">
                  💌 Personal Message
                </p>
                <p className="text-[11px] italic text-zinc-200 leading-relaxed">
                  &quot;{personalMessage}&quot;
                </p>
              </div>
            )}

            <div className="space-y-1.5 pt-2">
              <span className="text-[9px] uppercase tracking-[0.3em] text-rose-300 font-bold block">
                Wedding Celebration
              </span>
              <h1 className="text-3xl md:text-4xl font-serif text-white tracking-tight drop-shadow-lg capitalize">
                {groomName}{' '}
                <span className="text-rose-400 font-light">&</span> {brideName}
              </h1>
              {allowedGuests > 1 && (
                <p className="text-[10px] text-rose-200/70 uppercase tracking-widest pt-1">
                  Reserved for {allowedGuests} guests
                </p>
              )}
            </div>
          </div>

          <div
            className="animate-bounce flex flex-col items-center cursor-pointer"
            onClick={() => scrollToSection('events')}
          >
            <p className="text-[9px] uppercase tracking-[0.2em] text-rose-200 font-medium mb-1">
              Scroll Down to Events ↓
            </p>
            <span className="text-base text-rose-300">↓</span>
          </div>
        </div>
      </section>

      {/* ==================== EVENT SECTIONS ==================== */}
      <div id="events" className="relative z-10 w-full flex flex-col">
        {events.length === 0 ? (
          <div className="w-full max-w-md mx-auto px-4 py-20 text-center">
            <p className="text-zinc-400 text-sm">No events configured yet.</p>
          </div>
        ) : (
          events.map((event: EventItem, idx: number) => {
            const colors = colorMap[event.color];
            const isPlayingThis = activeEventId === event.id;
            const isWatched = event.watched;

            return (
              <section
                key={event.id}
                id={`event-${event.id}`}
                className="relative w-full h-screen overflow-hidden bg-black border-b border-white/10"
              >
                {/* ===== FULL SCREEN VIDEO FROM TOP ===== */}
                <video
                  ref={event.ref}
                  src={event.video}
                  className="absolute inset-0 w-full h-full object-cover z-0"
                  playsInline
                  preload="auto"
                  controls={false}
                  onEnded={() => handleVideoEnded(event)}
                  onContextMenu={(e: React.MouseEvent<HTMLVideoElement>) =>
                    e.preventDefault()
                  }
                />

                {/* ===== CINEMATIC GRADIENT OVERLAYS ===== */}
                <div className="absolute inset-0 z-[1] pointer-events-none">
                  {/* Top vignette */}
                  <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent" />
                  {/* Bottom vignette */}
                  <div className="absolute bottom-0 inset-x-0 h-56 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  {/* Left vignette */}
                  <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black/50 to-transparent" />
                  {/* Right vignette */}
                  <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black/50 to-transparent" />
                  {/* Themed color glow at bottom */}
                  <div
                    className={`absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t ${
                      event.color === 'amber'
                        ? 'from-amber-500/20'
                        : event.color === 'rose'
                        ? 'from-rose-500/20'
                        : 'from-emerald-500/20'
                    } via-transparent to-transparent opacity-70`}
                  />
                  {/* Subtle top themed glow */}
                  <div
                    className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b ${
                      event.color === 'amber'
                        ? 'from-amber-500/10'
                        : event.color === 'rose'
                        ? 'from-rose-500/10'
                        : 'from-emerald-500/10'
                    } via-transparent to-transparent opacity-50`}
                  />
                </div>

                {/* ===== PLAY LOCK OVERLAY ===== */}
                {isPlayingThis && !isWatched && (
                  <div
                    className="absolute inset-0 z-30 cursor-not-allowed"
                    onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
                      e.preventDefault()
                    }
                    onTouchMove={(e: React.TouchEvent<HTMLDivElement>) =>
                      e.preventDefault()
                    }
                    onWheel={(e: React.WheelEvent<HTMLDivElement>) =>
                      e.preventDefault()
                    }
                  />
                )}

                {/* ===== EVENT BADGE — TOP OF SCREEN ===== */}
                <div className="absolute top-6 inset-x-0 z-20 text-center px-4 pointer-events-none">
                  <span
                    className={`text-[9px] uppercase tracking-[0.3em] ${colors.text} font-bold bg-black/70 px-5 py-2 rounded-full border ${colors.border} backdrop-blur-md shadow-2xl inline-block`}
                  >
                    <span className="opacity-60">Celebration</span>{' '}
                    {String(idx + 1).padStart(2, '0')}{' '}
                    <span className="opacity-60">•</span> {event.name}
                  </span>
                </div>

                {/* ===== PLAYING INDICATOR — BOTTOM ===== */}
                {isPlayingThis && !isWatched && (
                  <div className="absolute bottom-8 inset-x-0 z-20 text-center px-4 pointer-events-none">
                    <p className="text-[9px] uppercase tracking-[0.3em] text-white/60 font-semibold animate-pulse">
                      ✦ Experience the moment ✦
                    </p>
                  </div>
                )}

                {/* ===== WATCHED DETAILS CARD — BOTTOM ===== */}
                {isWatched && (
                  <div className="absolute bottom-0 inset-x-0 z-40 p-5 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent backdrop-blur-2xl border-t border-white/10 rounded-t-3xl shadow-2xl animate-fade-in max-w-md mx-auto w-full max-h-[85vh] overflow-y-auto">
                    <span
                      className={`text-[9px] uppercase tracking-widest ${colors.text} font-bold ${colors.bg} px-3 py-1 rounded-full border ${colors.border} inline-block mb-3`}
                    >
                      ✓ {event.name} Details Unlocked
                    </span>

                    <h3 className="text-lg font-serif text-white mb-3">
                      {event.emoji} {event.name}
                    </h3>

                    <div className="space-y-2 bg-white/5 p-3.5 rounded-2xl border border-white/10 mb-3">
                      <p className="text-xs text-zinc-200">
                        📅{' '}
                        <strong className="text-white">
                          {formatDate(event.date)}
                        </strong>
                        {event.time && (
                          <>
                            {' '}
                            | ⏰{' '}
                            <strong className="text-white">{event.time}</strong>
                          </>
                        )}
                      </p>
                      {event.venue && (
                        <p className="text-xs text-zinc-300">
                          📍 {event.venue}
                        </p>
                      )}
                    </div>

                    {/* AYAT */}
                    {event.ayat && (
                      <div
                        className={`relative p-4 rounded-2xl ${colors.bg} border ${colors.border} mb-3 overflow-hidden`}
                      >
                        <div
                          className={`absolute top-0 right-0 w-16 h-16 ${colors.bg} rounded-full blur-2xl opacity-50`}
                        ></div>

                        <div className="relative z-10">
                          <p className="text-[9px] uppercase tracking-widest text-white/60 font-bold mb-2 flex items-center gap-1.5">
                            <span>🕌</span> Blessing
                          </p>

                          <p
                            className="text-right text-base sm:text-lg text-white font-serif leading-loose mb-3"
                            dir="rtl"
                            style={{
                              fontFamily:
                                '"Amiri", "Traditional Arabic", serif',
                            }}
                          >
                            {event.ayat.arabic}
                          </p>

                          <p className="text-[10px] italic text-white/80 leading-relaxed mb-1">
                            &quot;{event.ayat.translation}&quot;
                          </p>

                          <p
                            className={`text-[9px] font-bold ${colors.textLight} text-right`}
                          >
                            — {event.ayat.reference}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2.5">
                      {event.date && (
                        <a
                          href={generateCalendarLink(
                            `${event.name} - ${groomName} & ${brideName}`,
                            event.date,
                            event.time,
                            event.venue
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-3 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-[10px] uppercase tracking-wider font-bold text-white text-center flex items-center justify-center gap-1.5"
                        >
                          <span>📅</span> Calendar
                        </a>
                      )}
                      {event.mapLink && (
                        <a
                          href={event.mapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 py-3 px-3 ${colors.bg} ${colors.bgHover} border ${colors.borderBtn} rounded-2xl text-[10px] uppercase tracking-wider font-bold ${colors.textLight} text-center flex items-center justify-center gap-1.5`}
                        >
                          <span>🗺️</span> Open Map
                        </a>
                      )}
                    </div>

                    <p className="text-center text-[10px] text-zinc-400 mt-4 uppercase tracking-widest animate-pulse">
                      {idx < events.length - 1
                        ? 'Scroll down for next event ↓'
                        : 'Scroll down to RSVP ↓'}
                    </p>
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>

      {/* ==================== FAMILY SECTION ==================== */}
      {hasFamilyMembers && (
        <div id="family" className="w-full max-w-md mx-auto px-4 py-12">
          <div className="bg-zinc-900/80 backdrop-blur-xl p-6 rounded-3xl border border-white/15 shadow-2xl">
            {(groomImage || brideImage) && (
              <div className="flex items-center justify-center gap-4 mb-6 pb-6 border-b border-white/10">
                {groomImage && (
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-rose-400/40 shadow-lg mb-2">
                      <img
                        src={groomImage}
                        alt={groomName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs font-semibold text-white capitalize">
                      {groomName}
                    </p>
                    <p className="text-[9px] text-rose-300 uppercase tracking-widest">
                      Groom
                    </p>
                  </div>
                )}

                <span className="text-2xl text-rose-400 font-serif">&</span>

                {brideImage && (
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-rose-400/40 shadow-lg mb-2">
                      <img
                        src={brideImage}
                        alt={brideName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs font-semibold text-white capitalize">
                      {brideName}
                    </p>
                    <p className="text-[9px] text-rose-300 uppercase tracking-widest">
                      Bride
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-xl font-serif text-white mb-1">Our Family</h3>
              <p className="text-xs text-zinc-400">
                The people who make it special
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {familyMembers.map((member: FamilyMember) => (
                <div
                  key={member.id}
                  className="flex flex-col items-center p-3 bg-white/5 rounded-2xl border border-white/10 text-center"
                >
                  {member.profile_image ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-rose-400/30 mb-2">
                      <img
                        src={member.profile_image}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/30 to-pink-600/30 border-2 border-rose-400/30 flex items-center justify-center mb-2">
                      <span className="text-lg font-bold text-rose-200">
                        {member.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}

                  <p className="text-xs font-semibold text-white truncate w-full capitalize">
                    {member.name}
                  </p>
                  {member.role && (
                    <p className="text-[9px] text-rose-300 uppercase tracking-widest mt-0.5">
                      {member.role}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== CONTACTS ==================== */}
      {(wedding.contact_person_1 || wedding.contact_person_2) && (
        <div className="w-full max-w-md mx-auto px-4 py-8">
          <div className="bg-zinc-900/80 backdrop-blur-xl p-6 rounded-3xl border border-white/15 text-center shadow-2xl">
            <h3 className="text-xl font-serif text-white mb-1">Contact Us</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Reach out for any assistance
            </p>

            <div className="space-y-3">
              {wedding.contact_person_1 && wedding.contact_number_1 && (
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[10px] uppercase tracking-widest text-rose-300 font-semibold mb-1">
                    {wedding.contact_person_1}
                  </p>
                  <a
                    href={`tel:${wedding.contact_number_1}`}
                    className="text-sm font-bold text-white hover:text-rose-300 transition-colors"
                  >
                    📞 {wedding.contact_number_1}
                  </a>
                </div>
              )}

              {wedding.contact_person_2 && wedding.contact_number_2 && (
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[10px] uppercase tracking-widest text-rose-300 font-semibold mb-1">
                    {wedding.contact_person_2}
                  </p>
                  <a
                    href={`tel:${wedding.contact_number_2}`}
                    className="text-sm font-bold text-white hover:text-rose-300 transition-colors"
                  >
                    📞 {wedding.contact_number_2}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== RSVP SECTION ==================== */}
      <div id="rsvp" className="w-full max-w-md mx-auto px-4 py-4 mb-16">
        <div className="bg-zinc-900/80 backdrop-blur-xl p-6 rounded-3xl border border-white/15 text-center shadow-2xl">
          <div
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${rsvpMessage.gradient} border ${rsvpMessage.border} p-5 mb-5`}
          >
            <div className="text-4xl mb-2">{rsvpMessage.emoji}</div>
            <h3
              className={`text-lg font-serif ${rsvpMessage.textColor} mb-0.5`}
            >
              {rsvpMessage.title}
            </h3>
            <p className="text-[10px] uppercase tracking-widest text-white/60 mb-3">
              {rsvpMessage.subtitle}
            </p>
            <p className="text-[11px] text-zinc-200 leading-relaxed italic">
              {rsvpMessage.message}
            </p>

            {rsvpStatus === 'attending' && (
              <p
                className="text-[10px] text-emerald-300/80 mt-3 font-serif"
                dir="rtl"
              >
                بَارَكَ اللَّهُ لَكُمْ وَبَارَكَ عَلَيْكُمْ
              </p>
            )}

            {rsvpStatus === 'not_attending' && (
              <p
                className="text-[10px] text-rose-300/80 mt-3 font-serif"
                dir="rtl"
              >
                جَزَاكَ اللَّهُ خَيْرًا
              </p>
            )}
          </div>

          {rsvpStatus === 'pending' && (
            <>
              <h3 className="text-base font-serif text-white mb-1">
                Confirm Attendance
              </h3>
              <p className="text-xs text-zinc-400 mb-5">
                {`Please respond to help us arrange your seat${
                  allowedGuests > 1 ? ` for ${allowedGuests} guests` : ''
                }`}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleRsvpSubmit('attending')}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl text-xs uppercase tracking-[0.2em] font-bold transition-all shadow-lg active:scale-98 bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/30"
                >
                  {isSubmitting ? '...' : '✓ Accept Invitation'}
                </button>

                <button
                  onClick={() => handleRsvpSubmit('not_attending')}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl text-xs uppercase tracking-[0.2em] font-bold transition-all shadow-sm active:scale-98 bg-rose-500/20 text-rose-200 border border-rose-500/40 hover:bg-rose-500/30"
                >
                  {isSubmitting ? '...' : '✗ Regretfully Decline'}
                </button>
              </div>
            </>
          )}

          {rsvpStatus !== 'pending' && (
            <button
              onClick={() => setRsvpStatus('pending')}
              className="text-[10px] text-zinc-400 hover:text-zinc-200 underline uppercase tracking-widest transition-colors"
            >
              Change my response
            </button>
          )}
        </div>
      </div>

      {/* ==================== FOOTER ==================== */}
      <footer className="relative z-10 text-center py-8 px-6 border-t border-white/10 bg-black/60 mb-16">
        <p className="text-[11px] text-zinc-400 font-medium capitalize">
          {groomName} & {brideName} • {new Date().getFullYear()}
        </p>
        <p className="text-[10px] text-rose-300 font-semibold mt-1 flex items-center justify-center gap-1">
          <span>Made with</span>{' '}
          <span className="text-rose-400 animate-pulse">❤️</span>{' '}
          <span>for Loved Ones</span>
        </p>
      </footer>

      {/* ==================== BOTTOM NAV ==================== */}
      {stage !== 'intro' && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-3 bg-black/80 backdrop-blur-2xl border-t border-white/15 max-w-md mx-auto flex items-center justify-around shadow-2xl">
          <button
            onClick={() => scrollToSection('home')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all ${
              activeTab === 'home'
                ? 'text-rose-400 bg-white/10'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="text-base">🏠</span>
            <span className="text-[9px] uppercase tracking-wider font-semibold mt-0.5">
              Home
            </span>
          </button>

          <button
            onClick={() => scrollToSection('events')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all ${
              activeTab === 'events'
                ? 'text-rose-400 bg-white/10'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="text-base">🎥</span>
            <span className="text-[9px] uppercase tracking-wider font-semibold mt-0.5">
              Events
            </span>
          </button>

          {hasFamilyMembers && (
            <button
              onClick={() => scrollToSection('family')}
              className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all ${
                activeTab === 'family'
                  ? 'text-rose-400 bg-white/10'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="text-base">👨‍👩‍👧</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold mt-0.5">
                Family
              </span>
            </button>
          )}

          <button
            onClick={() => scrollToSection('rsvp')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all ${
              activeTab === 'rsvp'
                ? 'text-rose-400 bg-white/10'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="text-base">✨</span>
            <span className="text-[9px] uppercase tracking-wider font-semibold mt-0.5">
              RSVP
            </span>
          </button>
        </div>
      )}
    </main>
  );
}
