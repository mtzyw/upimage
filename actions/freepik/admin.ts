"use server";

import { isAdmin } from "@/lib/supabase/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/types";
import { revalidatePath } from "next/cache";

type FreepikApiKeyInsert = Database["public"]["Tables"]["freepik_api_keys"]["Insert"];
type FreepikApiKeyUpdate = Database["public"]["Tables"]["freepik_api_keys"]["Update"];

export async function getFreepikApiKeys() {
  const supabase = await createClient();
  
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return { data: null, error: "Unauthorized: Admin access required" };
  }

  const { data, error } = await supabase
    .from("freepik_api_keys")
    .select("*")
    .order("created_at", { ascending: false });

  return { data, error: error?.message };
}

export async function createFreepikApiKey(apiKey: Omit<FreepikApiKeyInsert, "id" | "created_at" | "updated_at" | "used_today" | "last_reset_date">) {
  const supabase = await createClient();
  
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  const { data, error } = await supabase
    .from("freepik_api_keys")
    .insert({
      ...apiKey,
      used_today: 0,
      last_reset_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/freepik-keys");
  return { success: true, data };
}

export async function updateFreepikApiKey(id: string, updates: FreepikApiKeyUpdate) {
  const supabase = await createClient();
  
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  const { data, error } = await supabase
    .from("freepik_api_keys")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/freepik-keys");
  return { success: true, data };
}

export async function deleteFreepikApiKey(id: string) {
  const supabase = await createClient();
  
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  const { error } = await supabase
    .from("freepik_api_keys")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/freepik-keys");
  return { success: true };
}

export async function resetFreepikApiKeyUsage(id: string) {
  const supabase = await createClient();
  
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  const { data, error } = await supabase
    .from("freepik_api_keys")
    .update({
      used_today: 0,
      last_reset_date: new Date().toISOString().split('T')[0],
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/freepik-keys");
  return { success: true, data };
}