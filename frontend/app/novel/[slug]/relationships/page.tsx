import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RelationshipsEditor from '@/components/novel/relationships';

type Params = Promise<{ slug: string }>;

export default async function RelationshipsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Verify novel exists and user has access
  const [novelResult, charsResult, relsResult] = await Promise.all([
    supabase.from('novels').select('*').eq('id', slug).single(),
    supabase.from('characters').select('*').eq('novel_id', slug).order('name'),
    supabase.from('relationships').select('*').eq('novel_id', slug),
  ]);

  if (novelResult.error || !novelResult.data) {
    console.error('Error fetching novel:', novelResult.error);
    notFound();
  }

  if (charsResult.error) {
    console.error('Error fetching characters:', charsResult.error);
  }

  if (relsResult.error) {
    console.error('Error fetching relationships:', relsResult.error);
  }

  return (
    <RelationshipsEditor 
      novel={novelResult.data} 
      initialCharacters={charsResult.data || []} 
      initialRelationships={relsResult.data || []}
    />
  );
}
