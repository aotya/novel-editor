import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Novel from '@/components/novel';

type Params = Promise<{ slug: string }>;

export default async function NovelPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch novel data
  const { data: novel, error } = await supabase
    .from('novels')
    .select('*')
    .eq('id', slug)
    .single();

  if (error || !novel) {
    console.error('Error fetching novel:', error);
    notFound();
  }

  // Fetch chapters count
  const { count: chaptersCount } = await supabase
    .from('chapters')
    .select('*', { count: 'exact', head: true })
    .eq('novel_id', slug);

  // Fetch characters count
  const { count: charactersCount } = await supabase
    .from('characters')
    .select('*', { count: 'exact', head: true })
    .eq('novel_id', slug);

  return (
    <div>
      <Novel 
        novel={novel} 
        stats={{
          chapters: chaptersCount || 0,
          characters: charactersCount || 0
        }}
      />
    </div>
  );
}
