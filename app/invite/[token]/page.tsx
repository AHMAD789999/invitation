// app/invite/[token]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import WeddingLandingPage from './WeddingLandingPage';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function InvitationPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // 1. Fetch guest + wedding details
  const { data: guest, error } = await supabase
    .from('guests')
    .select(`
      id,
      name,
      title_prefix,
      allowed_guests,
      invited_events,
      personal_message,
      token,
      rsvp_status,
      rsvp_updated_at,
      wedding:weddings (
        id,
        groom_name,
        bride_name,
        groom_image,
        bride_image,
        mehndi_date,
        mehndi_time,
        mehndi_venue,
        mehndi_map_url,
        barat_date,
        barat_time,
        barat_venue,
        barat_map_url,
        walima_date,
        walima_time,
        walima_venue,
        walima_map_url,
        contact_person_1,
        contact_number_1,
        contact_person_2,
        contact_number_2
      )
    `)
    .eq('token', token)
    .single();

  if (error || !guest) {
    notFound();
  }

  // 2. Fetch family members from separate table
  const weddingId = (guest.wedding as any)?.id;
  let familyMembers: any[] = [];

  if (weddingId) {
    const { data: familyData, error: familyError } = await supabase
      .from('family_members')
      .select('id, name, profile_image, role, created_at')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: true });

    if (!familyError && familyData) {
      familyMembers = familyData;
    }
  }

  return (
    <WeddingLandingPage
      guest={guest as any}
      familyMembers={familyMembers}
    />
  );
}