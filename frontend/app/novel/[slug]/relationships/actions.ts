'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveDiagram(
  novelId: string, 
  nodes: any[], 
  edges: any[]
) {
  const supabase = await createClient()

  // 1. Update character positions
  for (const node of nodes) {
    const { error } = await supabase
      .from('characters')
      .update({ 
        graph_x: node.position.x, 
        graph_y: node.position.y 
      })
      .eq('id', node.id)
      .eq('novel_id', novelId)

    if (error) {
      console.error('Error updating character position:', error)
      throw new Error('Failed to update character position')
    }
  }

  // 2. Sync relationships
  const { error: deleteError } = await supabase
    .from('relationships')
    .delete()
    .eq('novel_id', novelId)
    
  if (deleteError) {
    console.error('Error deleting old relationships:', deleteError)
    throw new Error('Failed to sync relationships')
  }

  if (edges.length > 0) {
    const relInserts = edges.map((edge: any) => ({
      novel_id: novelId,
      source_character_id: edge.source,
      target_character_id: edge.target,
      source_handle: edge.sourceHandle, // Save the handle ID
      target_handle: edge.targetHandle, // Save the handle ID
      label: edge.label || '',
      arrow_type: edge.data?.arrowType || 'forward'
    }))

    const { error: insertError } = await supabase
      .from('relationships')
      .insert(relInserts)

    if (insertError) {
      console.error('Error inserting relationships:', insertError)
      throw new Error('Failed to save relationships')
    }
  }

  revalidatePath(`/novel/${novelId}/relationships`)
  return { success: true }
}
