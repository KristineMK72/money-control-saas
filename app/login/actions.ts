'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Redirect back to login with the error message in the URL
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  // Clear the cache so the layout recognizes the new session
  revalidatePath('/', 'layout')
  
  // Use the full URL if you're still hitting domain issues, otherwise '/dashboard'
  redirect('/dashboard')
}
