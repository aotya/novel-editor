import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Novel from '@/components/novel';

type Params = Promise<{ slug: string }>;

export default async function NovelPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const [novelResult, chaptersResult, charactersResult] = await Promise.all([
    supabase.from('novels').select('*').eq('id', slug).single(),
    supabase.from('chapters').select('*', { count: 'exact', head: true }).eq('novel_id', slug),
    supabase.from('characters').select('*', { count: 'exact', head: true }).eq('novel_id', slug),
  ]);

  if (novelResult.error || !novelResult.data) {
    console.error('Error fetching novel:', novelResult.error);
    notFound();
  }

  return (
    <div>
      <Novel 
        novel={novelResult.data} 
        stats={{
          chapters: chaptersResult.count || 0,
          characters: charactersResult.count || 0
        }}
      />
    </div>
  );
}
