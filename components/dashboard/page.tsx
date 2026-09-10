import { createClient } from '@/lib/supabase/server';
import { GuestManagement } from '@/components/dashboard/GuestManagement';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch primary wedding record (or latest created)
  const { data: wedding } = await supabase
    .from('weddings')
    .select('id, groom_name, bride_name')
    .limit(1)
    .single();

  if (!wedding) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800">No Wedding Found</h1>
        <p className="text-gray-500 mt-2">Please insert a wedding record in Supabase to start adding guests.</p>
      </div>
    );
  }

  // Fetch guest list for this wedding
  const { data: guests } = await supabase
    .from('guests')
    .select('id, name, phone, invitation_type, allowed_guests, token, status')
    .eq('wedding_id', wedding.id)
    .order('created_at', { ascending: false });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          {wedding.groom_name} & {wedding.bride_name}'s Wedding
        </h1>
        <p className="text-gray-500">Dashboard & Personalized Guest Invitations</p>
      </div>

      <GuestManagement
        weddingId={wedding.id}
        groomName={wedding.groom_name}
        brideName={wedding.bride_name}
        initialGuests={guests || []}
        baseUrl={baseUrl}
      />
    </main>
  );
}