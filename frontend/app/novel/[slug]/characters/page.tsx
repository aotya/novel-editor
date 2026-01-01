import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CharacterEditor from '@/components/novel/characters';

type Params = Promise<{ slug: string }>;

export default async function CharactersPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Verify novel exists and user has access
  const { data: novel, error } = await supabase
    .from('novels')
    .select('id')
    .eq('id', slug)
    .single();

  if (error || !novel) {
    console.error('Error fetching novel:', error);
    notFound();
  }

  return (
    <CharacterEditor novelId={slug} />
  );
}
