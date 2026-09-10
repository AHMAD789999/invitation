'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper function to handle image uploads to Supabase Storage
async function uploadImage(file: File, bucket: string, pathPrefix: string) {
  if (!file || file.size === 0) return null;

  const supabase = await createClient();
  const fileExt = file.name.split('.').pop() || 'jpeg';
  const fileName = `${pathPrefix}_${Date.now()}.${fileExt}`;

  console.log(`Uploading image to: ${bucket}/${fileName}`);
  console.log(`Image size: ${file.size} bytes`);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, { upsert: true });

  if (error) {
    console.error('Error uploading image:', error);
    return null;
  }

  // Get public URL or return path depending on your schema
  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

export async function saveWeddingDetailsAction(formData: FormData) {
  const supabase = await createClient();
  
  const weddingId = formData.get('wedding_id') as string;
  const groomName = formData.get('groom_name') as string;
  const brideName = formData.get('bride_name') as string;
  const groomImageFile = formData.get('groom_image') as File | null;
  const brideImageFile = formData.get('bride_image') as File | null;

  let groomImageUrl = null;
  if (groomImageFile && groomImageFile.size > 0 && weddingId) {
    groomImageUrl = await uploadImage(groomImageFile, 'groom', `groom_${weddingId}`);
  }

  let brideImageUrl = null;
  if (brideImageFile && brideImageFile.size > 0 && weddingId) {
    brideImageUrl = await uploadImage(brideImageFile, 'bride', `bride_${weddingId}`);
  }

  const updateData: Record<string, any> = {
    groom_name: groomName,
    bride_name: brideName,
    updated_at: new Date().toISOString(),
  };

  if (groomImageUrl) updateData.groom_image = groomImageUrl;
  if (brideImageUrl) updateData.bride_image = brideImageUrl;

  const { error } = await supabase
    .from('weddings')
    .update(updateData)
    .eq('id', weddingId);

  if (error) {
    console.error('Wedding update error:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function addFamilyMemberAction(formData: FormData) {
  const supabase = await createClient();

  const weddingId = formData.get('wedding_id') as string;
  const name = formData.get('name') as string;
  const role = formData.get('role') as string;
  const imageFile = formData.get('profile_image') as File | null;

  let profileImageUrl = null;
  if (imageFile && imageFile.size > 0 && weddingId) {
    const uniqueId = crypto.randomUUID();
    profileImageUrl = await uploadImage(imageFile, 'family-members', `family_${weddingId}_${uniqueId}`);
  }

  const { data, error } = await supabase
    .from('family_members')
    .insert({
      wedding_id: weddingId,
      name,
      role,
      profile_image: profileImageUrl,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding family member:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
  return { success: true, data };
}

export async function removeFamilyMemberAction(memberIdOrFormData: string | FormData) {
  const supabase = await createClient();
  
  // Gracefully handles both direct string arguments and FormData submissions
  const memberId = typeof memberIdOrFormData === 'string'
    ? memberIdOrFormData
    : memberIdOrFormData.get('memberId') as string;

  if (!memberId) {
    throw new Error('Family member ID is missing or invalid.');
  }

  // Optional: Fetch member to delete associated image from storage first if needed
  const { data: member, error: fetchError } = await supabase
    .from('family_members')
    .select('profile_image')
    .eq('id', memberId)
    .single();

  if (fetchError) {
    console.error('Error fetching family member for removal:', fetchError);
  }

  const { error: deleteError } = await supabase
    .from('family_members')
    .delete()
    .eq('id', memberId);

  if (deleteError) {
    console.error('Error deleting family member:', deleteError);
    throw new Error(deleteError.message);
  }

  revalidatePath('/dashboard');
  return { success: true };
}