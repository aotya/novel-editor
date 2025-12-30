'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateChapterContent(chapterId: string, content: any, wordsCount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('chapters')
    .update({ 
      content, 
      words_count: wordsCount,
      updated_at: new Date().toISOString() 
    })
    .eq('id', chapterId)

  if (error) {
    console.error('Error updating chapter:', error)
    return { error: error.message }
  }

  // We don't revalidate path here to avoid UI flickering during auto-save
  // or we could use specific tag revalidation
  return { success: true }
}

export async function createAct(novelId: string, title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Get max order index
  const { data: maxOrder } = await supabase
    .from('acts')
    .select('order_index')
    .eq('novel_id', novelId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const newOrderIndex = (maxOrder?.order_index ?? -1) + 1

  const { data, error } = await supabase
    .from('acts')
    .insert({
      novel_id: novelId,
      title,
      order_index: newOrderIndex
    })
    .select()
    .single()

  if (error) return { error: error.message }
  
  revalidatePath(`/novel/${novelId}/edit`)
  return { success: true, data }
}

export async function deleteAct(actId: string, novelId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('acts')
    .delete()
    .eq('id', actId)

  if (error) return { error: error.message }

  revalidatePath(`/novel/${novelId}/edit`)
  return { success: true }
}

export async function createChapter(novelId: string, actId: string, title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Get max order index in this act
  const { data: maxOrder } = await supabase
    .from('chapters')
    .select('order_index')
    .eq('act_id', actId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const newOrderIndex = (maxOrder?.order_index ?? -1) + 1

  const { data, error } = await supabase
    .from('chapters')
    .insert({
      novel_id: novelId,
      act_id: actId,
      title,
      order_index: newOrderIndex,
      content: '', // Empty initial content
      status: 'draft'
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/novel/${novelId}/edit`)
  return { success: true, data }
}

export async function deleteChapter(chapterId: string, novelId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', chapterId)

  if (error) return { error: error.message }

  revalidatePath(`/novel/${novelId}/edit`)
  return { success: true }
}

export async function renameAct(actId: string, novelId: string, title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('acts')
    .update({ title })
    .eq('id', actId)

  if (error) return { error: error.message }

  revalidatePath(`/novel/${novelId}/edit`)
  return { success: true }
}

export async function updateChapterTitle(chapterId: string, novelId: string, title: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
  
    const { error } = await supabase
      .from('chapters')
      .update({ title })
      .eq('id', chapterId)
  
    if (error) return { error: error.message }
  
    revalidatePath(`/novel/${novelId}/edit`)
    return { success: true }
}

