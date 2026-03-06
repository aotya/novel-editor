import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PlotBoard from '@/components/novel/plot';

type Params = Promise<{ slug: string }>;

export default async function PlotPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Verify novel exists and user has access
  const { data: novel, error } = await supabase
    .from('novels')
    .select('id, title')
    .eq('id', slug)
    .single();

  if (error || !novel) {
    console.error('Error fetching novel:', error);
    notFound();
  }

  return (
    <PlotBoard novelId={slug} novelTitle={novel.title} />
  );
}

