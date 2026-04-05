"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createOrganization(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const propertyName = formData.get("propertyName") as string;
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const propSlug = propertyName.toLowerCase().replace(/[^a-z0-9]/g, "-");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // 1. Create the Account
  const { data: account, error: accountError } = await (supabase as any)
    .from("accounts")
    .insert({
      name,
      slug,
      owner_id: user.id
    })
    .select()
    .single();

  if (accountError || !account) {
    return { error: accountError?.message || "Failed to create account" };
  }

  const accountId = (account as any).id;

  // 2. Create the first Property
  const { error: propertyError } = await (supabase as any)
    .from("properties")
    .insert({
      account_id: accountId,
      name: propertyName,
      slug: `${slug}-${propSlug}`,
    });

  if (propertyError) {
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
  redirect("/dashboard");
}
