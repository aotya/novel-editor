import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import New from '@/components/new';

type Params = Promise<{ slug: string }>;

export default async function NovelSettingsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
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

  // Ensure the user owns this novel
  if (novel.user_id !== session.user.id) {
    redirect('/');
  }

  return (
    <New 
      initialData={{
        title: novel.title,
        synopsis: novel.synopsis,
        perspective: novel.perspective
      }}
      novelId={novel.id}
      backHref={`/novel/${novel.id}`}
    />
  );
}

