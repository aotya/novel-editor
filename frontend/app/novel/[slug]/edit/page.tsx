import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Edit from '@/components/edit';

type Params = Promise<{ slug: string }>;

export default async function EditPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch novel and acts in parallel
  const [novelResult, actsResult] = await Promise.all([
    supabase.from('novels').select('*').eq('id', slug).single(),
    supabase.from('acts').select(`*, chapters (*)`).eq('novel_id', slug).order('order_index', { ascending: true }),
  ]);

  if (novelResult.error || !novelResult.data) {
    console.error('Error fetching novel:', novelResult.error);
    notFound();
  }

  const novel = novelResult.data;
  let acts = actsResult.data;

  if (actsResult.error) {
    console.error('Error fetching acts:', actsResult.error);
  }

  // Auto-create initial Act and Chapter if none exist
  if (!acts || acts.length === 0) {
    const { data: newAct, error: createActError } = await supabase
      .from('acts')
      .insert({
        novel_id: slug,
        title: 'Act 1',
        order_index: 0
      })
      .select()
      .single();

    if (createActError) {
       console.error('Error creating initial act:', createActError);
    } else if (newAct) {
      // Create initial chapter for the new act
      const { data: newChapter, error: createChapterError } = await supabase
        .from('chapters')
        .insert({
          novel_id: slug,
          act_id: newAct.id,
          title: 'Chapter 1',
          order_index: 0,
          content: '',
          status: 'draft'
        })
        .select()
        .single();
        
       if (createChapterError) {
         console.error('Error creating initial chapter:', createChapterError);
       }

       // Construct the act object manually for initial render to avoid re-fetching immediately if unnecessary, 
       // but strictly we should probably refetch or structure it correctly.
       // Let's restructure 'acts' to include this new one.
       acts = [{
         ...newAct,
         chapters: newChapter ? [newChapter] : []
       }];
    }
  }

  // Sort chapters by order_index within acts
  const processedActs = acts?.map(act => ({
    ...act,
    chapters: act.chapters.sort((a: any, b: any) => a.order_index - b.order_index)
  })) || [];

  return (
    <Edit 
      novel={novel}
      initialActs={processedActs}
    />
  );
}
