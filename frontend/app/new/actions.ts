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
  const perspective = formData.get('perspective') as string

  const { error } = await supabase
    .from('novels')
    .insert({
      user_id: user.id,
      title,
      synopsis,
      perspective,
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
  const perspective = formData.get('perspective') as string

  const { error } = await supabase
    .from('novels')
    .update({
      title,
      synopsis,
      perspective,
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

export async function deleteNovel(novelId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Verify the novel belongs to the user before deletion
  const { data: novel, error: fetchError } = await supabase
    .from('novels')
    .select('id')
    .eq('id', novelId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !novel) {
    return { error: '小説が見つからないか、削除権限がありません。' }
  }

  // Delete related data explicitly (though cascade should handle this)
  // This ensures all related data is deleted even if cascade fails
  
  // Delete plot_cards (via plot_lists)
  const { data: plotLists } = await supabase
    .from('plot_lists')
    .select('id')
    .eq('novel_id', novelId)

  if (plotLists && plotLists.length > 0) {
    const plotListIds = plotLists.map(list => list.id)
    await supabase
      .from('plot_cards')
      .delete()
      .in('list_id', plotListIds)
  }

  // Delete plot_lists
  await supabase
    .from('plot_lists')
    .delete()
    .eq('novel_id', novelId)

  // Delete relationships
  await supabase
    .from('relationships')
    .delete()
    .eq('novel_id', novelId)

  // Delete characters
  await supabase
    .from('characters')
    .delete()
    .eq('novel_id', novelId)

  // Delete chapters
  await supabase
    .from('chapters')
    .delete()
    .eq('novel_id', novelId)

  // Delete acts
  await supabase
    .from('acts')
    .delete()
    .eq('novel_id', novelId)

  // Finally, delete the novel itself
  // This will also trigger cascade deletes as a backup
  const { error } = await supabase
    .from('novels')
    .delete()
    .eq('id', novelId)
    .eq('user_id', user.id) // Ensure security

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  redirect('/')
}
