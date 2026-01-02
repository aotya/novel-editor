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

export async function updateChapterOrder(novelId: string, updates: { id: string, order_index: number, act_id?: string }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const promises = updates.map(update => {
    const dataToUpdate: any = { order_index: update.order_index }
    if (update.act_id) {
        dataToUpdate.act_id = update.act_id
    }
    return supabase
      .from('chapters')
      .update(dataToUpdate)
      .eq('id', update.id)
  })

  const results = await Promise.all(promises)
  const hasError = results.some(r => r.error)

  if (hasError) {
    const errorMsg = results.find(r => r.error)?.error?.message
    return { error: errorMsg || 'Failed to update order' }
  }

  revalidatePath(`/novel/${novelId}/edit`)
  return { success: true }
}

// AI Proofreading Action
export async function proofreadContent(content: string) {
  try {
    const response = await fetch("http://localhost:8000/api/proofread", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
      cache: 'no-store' 
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("Proofread API Error:", error);
    return { success: false, error: error.message };
  }
}

// AI Rewriting Action
export async function rewriteContent(
    fullText: string, 
    selectedText: string, 
    instruction: string, 
    selectionRange: {start: number, end: number} | null, 
    context: any
) {
  try {
    const payload = {
        mode: "rewrite",
        data: {
            fullText,
            selectedText,
            instruction,
            selectionRange,
            context
        }
    };

    const response = await fetch("http://localhost:8000/api/rewrite", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: 'no-store'
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("Rewrite API Error:", error);
    return { success: false, error: error.message };
  }
}
