import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WorldElementEditor from '@/components/novel/world';

type Params = Promise<{ slug: string }>;

export default async function WorldPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();

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
    <WorldElementEditor novelId={slug} />
  );
}
