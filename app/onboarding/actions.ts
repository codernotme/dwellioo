"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createOrganization(data: {
  orgName: string;
  propertyName: string;
  propertyType: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}) {
  const supabase = await createClient();
  const { orgName, propertyName, propertyType, address, city, state, pincode } = data;
  
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const propSlug = propertyName.toLowerCase().replace(/[^a-z0-9]/g, "-");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // 1. Create the Account
  const { data: account, error: accountError } = await (supabase as any)
    .from("accounts")
    .insert({
      name: orgName,
      slug: `${slug}-${Math.random().toString(36).substring(7)}`, // Ensure uniqueness
      owner_id: user.id,
      plan: 'Trial',
      max_properties: 1,
      max_units: 30,
      max_staff: 3,
      max_wa_sends_per_month: 100
    })
    .select()
    .single();

  if (accountError || !account) {
    return { error: accountError?.message || "Failed to create organization" };
  }

  const accountId = (account as any).id;

  // 2. Create the first Property
  const { error: propertyError } = await (supabase as any)
    .from("properties")
    .insert({
      account_id: accountId,
      name: propertyName,
      slug: `${propSlug}-${Math.random().toString(36).substring(7)}`,
      type: propertyType,
      address,
      city,
      state,
      pincode,
      onboarding_step: 1 // Initial property created
    });

  if (propertyError) {
    // Basic cleanup - ideally we'd use a transaction if Supabase supported them easily via RPC, 
    // but for onboarding we'll just handle errors.
    return { error: propertyError.message };
  }

  // 3. Update the Profile with account_id and set role to Property_Manager
  const { error: profileError } = await (supabase as any)
    .from("profiles")
    .update({ 
      account_id: accountId,
      role: 'Property_Manager'
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
