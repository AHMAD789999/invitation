import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { toggleUserApprovalAction } from './actions';

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== 'ahmaddeveloper0370@gmail.com') {
    redirect('/dashboard');
  }

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-neutral-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-black text-white p-6 rounded-2xl border-2 border-black flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase">Admin Portal</h1>
            <p className="text-xs text-red-500 font-bold">User Approvals Management</p>
          </div>
          <a
            href="/dashboard"
            className="bg-white text-black font-bold text-xs px-4 py-2 rounded-xl border border-black hover:bg-neutral-200"
          >
            Back to Dashboard
          </a>
        </div>

        <div className="bg-white border-2 border-black rounded-2xl shadow overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-200 border-b-2 border-black text-black font-black uppercase text-xs">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y border-black">
              {users?.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50">
                  <td className="p-4 font-bold">{u.full_name || 'N/A'}</td>
                  <td className="p-4">{u.email}</td>
                  <td className="p-4">
                    {u.is_approved ? (
                      <span className="bg-green-100 text-green-800 border border-green-600 px-2.5 py-1 rounded-full text-xs font-black">
                        Approved
                      </span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-800 border border-yellow-600 px-2.5 py-1 rounded-full text-xs font-black">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {u.email !== 'ahmaddeveloper0370@gmail.com' && (
                      <form
                        action={async () => {
                          'use server';
                          await toggleUserApprovalAction(u.id, u.is_approved);
                        }}
                      >
                        <button
                          type="submit"
                          className={`text-xs font-black px-3 py-1.5 rounded-lg border-2 border-black transition ${
                            u.is_approved
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                        >
                          {u.is_approved ? 'Revoke Approval' : 'Approve User'}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}