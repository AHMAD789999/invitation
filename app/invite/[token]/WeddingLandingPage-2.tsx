'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

// ==================== TYPES ====================
interface GuestData {
  id: string;
  name: string;
  title_prefix?: string;
  allowed_guests?: number;
  invited_events?: string[];
  personal_message?: string | null;
  token: string;
  rsvp_status?: 'pending' | 'attending' | 'not_attending' | 'maybe';
  phone?: string | null;
  wedding: {
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
    groom_family_members?: string[];
    contact_person_1?: string;
    contact_number_1?: string;
    contact_person_2?: string;
    contact_number_2?: string;
  } | null;
}

interface FamilyMember {
  id: string;
  name: string;
  profile_image?: string;
  role?: string;
  wedding_id?: string;
}

// ==================== MAIN COMPONENT ====================
export default function WeddingLandingPage({ guest: initialGuest }: { guest: GuestData }) {
  const supabase = createClient();
  const [guest, setGuest] = useState<GuestData>(initialGuest);
  const wedding = guest?.wedding;
  
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loadingFamily, setLoadingFamily] = useState<boolean>(true);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(guest?.rsvp_status || null);
  const [updatingRsvp, setUpdatingRsvp] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'home' | 'events' | 'family' | 'rsvp' | 'card'>('home');
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const groomName = wedding?.groom_name || 'Groom';
  const brideName = wedding?.bride_name || 'Bride';
  const groomImage = wedding?.groom_image || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80';
  const brideImage = wedding?.bride_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  // ==================== FETCH FAMILY MEMBERS ====================
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      if (!wedding?.id) {
        setLoadingFamily(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('family_members')
          .select('*')
          .eq('wedding_id', wedding.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setFamilyMembers(data || []);
      } catch (error) {
        console.error('Error fetching family members:', error);
      } finally {
        setLoadingFamily(false);
      }
    };

    fetchFamilyMembers();

    const channel = supabase
      .channel('family-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_members',
          filter: `wedding_id=eq.${wedding?.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFamilyMembers(prev => [...prev, payload.new as FamilyMember]);
          } else if (payload.eventType === 'DELETE') {
            setFamilyMembers(prev => prev.filter(m => m.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setFamilyMembers(prev => 
              prev.map(m => m.id === payload.new.id ? payload.new as FamilyMember : m)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wedding?.id]);

  // ==================== UPDATE RSVP ====================
  const updateRSVP = async (status: 'attending' | 'not_attending' | 'maybe') => {
    if (!guest?.id) return;
    
    setUpdatingRsvp(true);
    try {
      const { error } = await supabase
        .from('guests')
        .update({
          rsvp_status: status,
          rsvp_updated_at: new Date().toISOString(),
        })
        .eq('id', guest.id);

      if (error) throw error;
      setRsvpStatus(status);
      
    } catch (error) {
      console.error('Error updating RSVP:', error);
      alert('Failed to update RSVP. Please try again.');
    } finally {
      setUpdatingRsvp(false);
    }
  };

  // ==================== HANDLERS ====================
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

  // ==================== TABS ====================
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: '🏠' },
    { id: 'events' as const, label: 'Events', icon: '📅' },
    { id: 'family' as const, label: 'Family', icon: '👨‍👩‍👧‍👦' },
    { id: 'rsvp' as const, label: 'RSVP', icon: '💌' },
    { id: 'card' as const, label: 'Card', icon: '💳' },
  ];

  // ==================== EVENTS DATA FROM BACKEND ====================
  const events = [
    {
      id: 'mehndi',
      title: 'Mehndi Ceremony',
      icon: '🌺',
      badge: 'Mehndi',
      badgeColor: 'bg-amber-500',
      date: wedding?.mehndi_date || 'Date TBA',
      time: wedding?.mehndi_time || 'Time TBA',
      venue: wedding?.mehndi_venue || 'Venue TBA',
      mapUrl: wedding?.mehndi_map_url,
      description: 'A vibrant evening of music, dance, and beautiful henna designs',
    },
    {
      id: 'barat',
      title: 'Barat Ceremony',
      icon: '🎺',
      badge: 'Barat',
      badgeColor: 'bg-rose-500',
      date: wedding?.barat_date || 'Date TBA',
      time: wedding?.barat_time || 'Time TBA',
      venue: wedding?.barat_venue || 'Venue TBA',
      mapUrl: wedding?.barat_map_url,
      description: 'The grand arrival and the sacred Nikaah ceremony',
    },
    {
      id: 'walima',
      title: 'Walima Reception',
      icon: '✨',
      badge: 'Walima',
      badgeColor: 'bg-emerald-500',
      date: wedding?.walima_date || 'Date TBA',
      time: wedding?.walima_time || 'Time TBA',
      venue: wedding?.walima_venue || 'Venue TBA',
      mapUrl: wedding?.walima_map_url,
      description: 'A grand reception with dinner and celebrations',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FDF8F5] text-[#1A1410] overflow-x-hidden pb-32">
      
      {/* ==================== HERO SECTION ==================== */}
      <section className="relative h-[85vh] sm:h-screen w-full overflow-hidden shadow-xl">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover filter brightness-[0.85]"
        >
          <source src="/vd.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/40" />

        {/* Guest Name Badge */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-[92%] max-w-lg px-4 text-center">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-xl text-white">
            <span className="text-amber-300 text-[10px] uppercase tracking-widest font-semibold block mb-1">
              ✨ Welcoming Our Honored Guest ✨
            </span>
            <h1 className="text-xl sm:text-2xl font-serif font-medium text-white tracking-wide">
              {guest.title_prefix} {guest.name}
            </h1>
            <p className="text-xs text-white/80 mt-1">
              You are cordially invited to celebrate our wedding festivities
            </p>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-xl px-2">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/80 shadow-2xl p-2">
            <div className="grid grid-cols-5 gap-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex flex-col items-center justify-center py-2 sm:py-3 px-1 rounded-xl sm:rounded-2xl text-xs font-medium transition-all duration-300
                      ${isActive
                        ? 'bg-[#8B5E3C] text-white shadow-md scale-105'
                        : 'text-[#5C3A21]/70 hover:text-[#2C1810] hover:bg-black/5'
                      }
                    `}
                  >
                    <span className="text-base sm:text-xl mb-0.5">{tab.icon}</span>
                    <span className="text-[10px] sm:text-xs font-semibold">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== TAB CONTENT ==================== */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#EFE5DC] p-6 sm:p-10 min-h-[50vh]">
          
          {/* ===== HOME TAB ===== */}
          {activeTab === 'home' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8 max-w-2xl mx-auto"
            >
              {/* Quranic Ayat */}
              <div className="text-center space-y-2 pb-6 border-b border-[#EFE5DC]">
                <span className="text-xl sm:text-2xl font-serif text-amber-700 tracking-wider block">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </span>
                <p className="text-xs text-[#5C3A21]/70 italic max-w-md mx-auto font-serif">
                  "And He placed between you affection and mercy. Indeed in that are signs for a people who give thought." (Surah Ar-Rum: 21)
                </p>
              </div>

              {/* Couple Images from Backend */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center bg-[#FAF5F0] p-4 rounded-2xl border border-rose-200/50 shadow-sm">
                  <img 
                    src={groomImage} 
                    alt={groomName} 
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover mx-auto border-2 border-rose-300 shadow-md mb-3"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80';
                    }}
                  />
                  <h4 className="font-serif text-sm sm:text-base font-bold text-[#2C1810]">{groomName}</h4>
                  <span className="text-[11px] text-rose-600 uppercase font-semibold">Groom</span>
                </div>
                <div className="text-center bg-[#FAF5F0] p-4 rounded-2xl border border-pink-200/50 shadow-sm">
                  <img 
                    src={brideImage} 
                    alt={brideName} 
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover mx-auto border-2 border-pink-300 shadow-md mb-3"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                    }}
                  />
                  <h4 className="font-serif text-sm sm:text-base font-bold text-[#2C1810]">{brideName}</h4>
                  <span className="text-[11px] text-pink-600 uppercase font-semibold">Bride</span>
                </div>
              </div>

              {/* Personal Message */}
              <div className="bg-[#FAF5F0] rounded-3xl p-6 sm:p-8 border border-rose-200/60 shadow-sm relative overflow-hidden text-center">
                <div className="absolute top-2 right-2 text-2xl opacity-20">🌸</div>
                <div className="absolute bottom-2 left-2 text-2xl opacity-20">🌺</div>
                
                <span className="inline-block px-4 py-1 bg-rose-100 text-rose-800 text-xs font-semibold rounded-full mb-3">
                  🌿 Phool &amp; Dhool Wedding Celebration 🌿
                </span>

                <div className="mt-4 space-y-3 text-sm sm:text-base text-[#5C3A21] leading-relaxed">
                  <p className="font-medium text-[#2C1810] text-base sm:text-lg">
                    Dear Respected <span className="text-rose-600 font-serif">{guest.title_prefix} {guest.name}</span>,
                  </p>
                  <p>
                    {guest.personal_message || `With hearts full of joy, we invite you to celebrate the union of ${groomName} & ${brideName}.`}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#EFE5DC] flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-[#5C3A21]">
                  <span className="bg-white px-3 py-1.5 rounded-full border border-[#EFE5DC]">
                    💌 Status: <strong className={`capitalize ${rsvpStatus === 'attending' ? 'text-emerald-600' : rsvpStatus === 'maybe' ? 'text-amber-600' : rsvpStatus === 'not_attending' ? 'text-rose-600' : 'text-gray-600'}`}>
                      {rsvpStatus?.replace('_', ' ') || 'Pending'}
                    </strong>
                  </span>
                  <span className="bg-white px-3 py-1.5 rounded-full border border-[#EFE5DC]">
                    💺 Seats: <strong className="text-[#2C1810]">{guest.allowed_guests || 1}</strong>
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== EVENTS TAB ===== */}
          {activeTab === 'events' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2 pb-6 border-b border-[#EFE5DC]">
                <span className="text-xl sm:text-2xl font-serif text-amber-700 tracking-wider block">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif text-[#2C1810]">Wedding Events</h2>
                <p className="text-[#5C3A21]/70 text-xs sm:text-sm">Join us in celebrating these sacred milestones</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {events.map((event) => (
                  <div key={event.id} className="bg-[#FAF5F0] rounded-2xl p-6 border border-[#EFE5DC] shadow-md flex flex-col hover:shadow-lg transition">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{event.icon}</span>
                      <span className={`px-3 py-1 ${event.badgeColor} text-white text-xs font-semibold rounded-full`}>
                        {event.badge}
                      </span>
                    </div>
                    <h3 className="text-xl font-serif text-[#2C1810]">{event.title}</h3>
                    <p className="text-[#5C3A21]/70 text-xs mt-1">{event.description}</p>
                    <div className="mt-4 space-y-1.5 text-xs text-[#5C3A21]">
                      <p>📅 <strong className="text-[#2C1810]">{event.date}</strong></p>
                      <p>⏰ <strong className="text-[#2C1810]">{event.time}</strong></p>
                      <p>📍 <strong className="text-[#2C1810]">{event.venue}</strong></p>
                    </div>
                    <div className="mt-6 flex gap-2">
                      {event.mapUrl && (
                        <a href={event.mapUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-2.5 bg-[#8B5E3C] hover:bg-[#7A5030] text-white text-xs font-medium rounded-xl text-center transition shadow-sm">
                          📍 Map
                        </a>
                      )}
                      <button onClick={() => alert(`Added ${event.title} to Calendar`)} className="flex-1 py-2.5 bg-white border border-[#EFE5DC] text-[#5C3A21] hover:bg-[#FAF5F0] text-xs font-medium rounded-xl transition">
                        📅 Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Contact Persons */}
              {(wedding?.contact_person_1 || wedding?.contact_person_2) && (
                <div className="bg-[#FAF5F0] rounded-2xl p-6 border border-[#EFE5DC] shadow-md mt-6">
                  <h4 className="text-sm font-semibold text-[#5C3A21]/70 mb-4">📞 For Queries, Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {wedding?.contact_person_1 && (
                      <div className="bg-white p-4 rounded-xl border border-[#EFE5DC]">
                        <p className="font-medium text-[#2C1810]">{wedding.contact_person_1}</p>
                        <p className="text-sm text-[#8B5E3C]">{wedding.contact_number_1 || 'Phone TBA'}</p>
                      </div>
                    )}
                    {wedding?.contact_person_2 && (
                      <div className="bg-white p-4 rounded-xl border border-[#EFE5DC]">
                        <p className="font-medium text-[#2C1810]">{wedding.contact_person_2}</p>
                        <p className="text-sm text-[#8B5E3C]">{wedding.contact_number_2 || 'Phone TBA'}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ===== FAMILY TAB - FROM BACKEND ===== */}
          {activeTab === 'family' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2 pb-6 border-b border-[#EFE5DC]">
                <span className="text-xl sm:text-2xl font-serif text-amber-700 tracking-wider block">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif text-[#2C1810]">Our Family</h2>
                <p className="text-[#5C3A21]/70 text-xs sm:text-sm">The beloved family hosting this auspicious celebration</p>
              </div>

              {loadingFamily ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#8B5E3C] border-t-transparent" />
                </div>
              ) : familyMembers.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="bg-[#FAF5F0] rounded-2xl p-4 text-center border border-[#EFE5DC] shadow-sm hover:shadow-md transition">
                      {member.profile_image ? (
                        <img
                          src={member.profile_image}
                          alt={member.name}
                          className="w-20 h-20 rounded-full object-cover border-2 border-rose-200 shadow-sm mx-auto mb-3"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80';
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center text-2xl font-light text-rose-700 mx-auto mb-3 border border-rose-200">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <h4 className="font-medium text-[#2C1810] text-sm">{member.name}</h4>
                      <p className="text-[11px] text-rose-600 font-semibold uppercase mt-0.5">{member.role || 'Family'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-[#FAF5F0] rounded-2xl border border-[#EFE5DC]">
                  <p className="text-[#5C3A21]/50">No family members added yet</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ===== RSVP TAB ===== */}
          {activeTab === 'rsvp' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto"
            >
              <div className="text-center space-y-2 pb-6 border-b border-[#EFE5DC]">
                <span className="text-xl sm:text-2xl font-serif text-amber-700 tracking-wider block">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif text-[#2C1810]">RSVP</h2>
                <p className="text-[#5C3A21]/70 text-xs sm:text-sm">Please let us know your response</p>
              </div>

              <div className="bg-[#FAF5F0] rounded-3xl p-6 sm:p-8 border border-[#EFE5DC] shadow-sm text-center">
                <span className="text-4xl">💌</span>
                <p className="text-[#5C3A21] text-sm mt-3">
                  Will you be joining us on our special day?
                </p>

                <div className="grid grid-cols-3 gap-2.5 mt-6">
                  <button
                    onClick={() => updateRSVP('attending')}
                    disabled={updatingRsvp}
                    className={`py-3 rounded-xl font-medium text-xs sm:text-sm transition shadow-sm ${
                      rsvpStatus === 'attending'
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-600 ring-offset-2'
                        : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    ✨ Yes
                  </button>
                  <button
                    onClick={() => updateRSVP('maybe')}
                    disabled={updatingRsvp}
                    className={`py-3 rounded-xl font-medium text-xs sm:text-sm transition shadow-sm ${
                      rsvpStatus === 'maybe'
                        ? 'bg-amber-600 text-white ring-2 ring-amber-600 ring-offset-2'
                        : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    🤔 Maybe
                  </button>
                  <button
                    onClick={() => updateRSVP('not_attending')}
                    disabled={updatingRsvp}
                    className={`py-3 rounded-xl font-medium text-xs sm:text-sm transition shadow-sm ${
                      rsvpStatus === 'not_attending'
                        ? 'bg-rose-600 text-white ring-2 ring-rose-600 ring-offset-2'
                        : 'bg-white border border-rose-300 text-rose-700 hover:bg-rose-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    ❌ No
                  </button>
                </div>

                {updatingRsvp && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-rose-500 border-t-transparent" />
                    <span className="text-xs text-[#5C3A21]">Updating...</span>
                  </div>
                )}

                {!updatingRsvp && (
                  <div className={`mt-4 p-3 rounded-xl text-xs sm:text-sm font-medium ${
                    rsvpStatus === 'attending' ? 'bg-emerald-100 text-emerald-800' :
                    rsvpStatus === 'maybe' ? 'bg-amber-100 text-amber-800' :
                    rsvpStatus === 'not_attending' ? 'bg-rose-100 text-rose-800' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {rsvpStatus === 'attending' ? '🎉 Fantastic! We look forward to seeing you.' :
                     rsvpStatus === 'maybe' ? '🤔 Noted! Please update us if your plans change.' :
                     rsvpStatus === 'not_attending' ? '💔 We will miss you! Thank you for letting us know.' :
                     '⏳ Please select an option above'}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ===== CARD TAB ===== */}
          {activeTab === 'card' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto"
            >
              <div className="text-center space-y-2 pb-6 border-b border-[#EFE5DC]">
                <span className="text-xl sm:text-2xl font-serif text-amber-700 tracking-wider block">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif text-[#2C1810]">Digital Pass</h2>
                <p className="text-[#5C3A21]/70 text-xs sm:text-sm">Your entry pass to the wedding venues</p>
              </div>

              <div className="bg-[#FAF5F0] rounded-3xl p-6 sm:p-8 border border-amber-200/60 shadow-md text-center">
                <span className="inline-block px-3.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full mb-2">
                  🎫 DIGITAL INVITATION PASS
                </span>
                <h3 className="text-xl font-serif text-[#2C1810]">
                  {groomName} &amp; {brideName}
                </h3>

                <div className="mt-6 space-y-3 text-left">
                  <div className="bg-white p-3.5 rounded-xl border border-[#EFE5DC] flex justify-between items-center">
                    <div>
                      <p className="text-[10px] uppercase text-[#5C3A21]/60 font-semibold">Honored Guest</p>
                      <p className="text-sm font-bold text-[#2C1810]">{guest.title_prefix} {guest.name}</p>
                    </div>
                    <span className="text-lg">👤</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-[#EFE5DC] flex justify-between items-center">
                    <div>
                      <p className="text-[10px] uppercase text-[#5C3A21]/60 font-semibold">Seats Reserved</p>
                      <p className="text-sm font-bold text-[#2C1810]">{guest.allowed_guests || 1}</p>
                    </div>
                    <span className="text-lg">💺</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2.5">
                  <button
                    onClick={() => setShowQRModal(true)}
                    className="w-full py-3 bg-gradient-to-r from-[#8B5E3C] to-[#7A5030] hover:from-[#7A5030] hover:to-[#6A4020] text-white rounded-xl text-sm font-medium transition shadow-md"
                  >
                    🎫 View Entry QR Pass
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full py-3 bg-white border border-[#EFE5DC] text-[#5C3A21] hover:bg-[#FAF5F0] rounded-xl text-sm font-medium transition shadow-sm"
                  >
                    {copiedLink ? '✓ Link Copied!' : '🔗 Share Invitation'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </main>

      {/* ==================== QR MODAL ==================== */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQRModal(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 text-center shadow-2xl relative border border-[#EFE5DC]"
            >
              <button
                onClick={() => setShowQRModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>

              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-[11px] font-semibold rounded-full mb-2">
                Scan at Entrance
              </span>
              <h3 className="text-lg font-serif text-[#2C1810]">{guest.title_prefix} {guest.name}</h3>
              <p className="text-xs text-[#5C3A21]/50 mb-4">{guest.allowed_guests} seats</p>

              <div className="bg-[#FAF5F0] p-4 rounded-2xl border border-[#EFE5DC] inline-block shadow-inner my-4">
                <img
                  src={qrImageUrl}
                  alt="Guest Entry QR Code"
                  className="w-48 h-48 mx-auto object-contain rounded-lg"
                />
              </div>

              <p className="text-[11px] text-[#5C3A21]/60 leading-relaxed">
                Please show this unique digital QR pass at the entrance of the wedding venues.
              </p>

              <a
                href={qrImageUrl}
                download={`QR_${guest.name}.png`}
                className="mt-4 inline-block w-full py-3 bg-[#8B5E3C] hover:bg-[#7A5030] text-white rounded-xl text-sm font-medium transition"
              >
                ⬇️ Download QR
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== FOOTER ==================== */}
      <footer className="text-center py-6 mt-8 border-t border-[#EFE5DC]">
        <p className="text-xs text-[#5C3A21]/40">
          {groomName} &amp; {brideName} • {new Date().getFullYear()}
        </p>
        <p className="text-[10px] text-[#5C3A21]/25 mt-1">
          Made with Love ❤️
        </p>
      </footer>
    </div>
  );
}