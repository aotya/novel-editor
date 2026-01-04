'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createNovel(formData: FormData) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const title = formData.get('title') as string
  const synopsis = formData.get('synopsis') as string

  const { error } = await supabase
    .from('novels')
    .insert({
      user_id: user.id,
      title,
      synopsis,
      status: 'draft',
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  redirect('/')
}

export async function updateNovel(novelId: string, formData: FormData) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const title = formData.get('title') as string
  const synopsis = formData.get('synopsis') as string

  const { error } = await supabase
    .from('novels')
    .update({
      title,
      synopsis,
    })
    .eq('id', novelId)
    .eq('user_id', user.id) // Ensure security

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath(`/novel/${novelId}`)
  redirect(`/novel/${novelId}`)
}

