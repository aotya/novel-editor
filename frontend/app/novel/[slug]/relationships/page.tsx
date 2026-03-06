import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RelationshipsEditor from '@/components/novel/relationships';

type Params = Promise<{ slug: string }>;

export default async function RelationshipsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Verify novel exists and user has access
  const { data: novel, error } = await supabase
    .from('novels')
    .select('*')
    .eq('id', slug)
    .single();

  if (error || !novel) {
    console.error('Error fetching novel:', error);
    notFound();
  }

  // Fetch characters for the sidebar and canvas
  const { data: characters, error: charsError } = await supabase
    .from('characters')
    .select('*')
    .eq('novel_id', slug)
    .order('name');
    
  if (charsError) {
      console.error('Error fetching characters:', charsError);
  }

  // Fetch relationships
  const { data: relationships, error: relsError } = await supabase
    .from('relationships')
    .select('*')
    .eq('novel_id', slug);

  if (relsError) {
      console.error('Error fetching relationships:', relsError);
  }

  return (
    <RelationshipsEditor 
      novel={novel} 
      initialCharacters={characters || []} 
      initialRelationships={relationships || []}
    />
  );
}
