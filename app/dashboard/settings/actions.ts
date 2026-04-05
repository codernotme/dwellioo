"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateAccountSettings(accountId: string, data: { name: string; slug: string }) {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("accounts")
    .update({
      name: data.name,
      slug: data.slug,
    })
    .eq("id", accountId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updatePropertySettings(propertyId: string, data: {
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}) {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("properties")
    .update({
      name: data.name,
      type: data.type,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
    })
    .eq("id", propertyId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}
