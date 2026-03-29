'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getRequiredSession } from '@/lib/auth-utils'

// ---- Story generation types ----

type StoryReferenceOptions = {
  useCharacters: boolean;
  usePlot: boolean;
  useRelationships: boolean;
  useWorldElements: boolean;
};

export type GenerateStoryParams = {
  novelId: string;
  novelTitle: string;
  novelSynopsis: string;
  novelWorldSetting?: string;
  references: StoryReferenceOptions;
  baseContent: string | null;
  config: {
    targetLength: number;
    perspective: string;
    instruction: string;
  };
};

export type GenerateLongStoryParams = {
  novelId: string;
  novelTitle: string;
  novelSynopsis: string;
  novelWorldSetting?: string;
  novelPerspective: string;
  references: StoryReferenceOptions;
  currentEpisode: number;
  pastContent: { episodeNumber: number; title: string; content: string }[];
  config: {
    targetLength: number;
    instruction: string;
  };
};

// ---- Private helpers ----

type NovelReferences = {
  characterData: Record<string, unknown>[];
  plotData: { title: string; scenes: { content: string; note: string }[] }[];
  relationshipData: { from: string; to: string; label: string; type: string }[];
  worldElementData: Record<string, unknown>[];
};

/**
 * 小説の参照データ（キャラクター、プロット、相関図、世界観）をDBから取得するヘルパー関数
 * AI生成APIに渡すためのデータを準備します。
 */
async function fetchNovelReferences(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  novelId: string,
  options: StoryReferenceOptions & { currentEpisode?: number }
): Promise<NovelReferences> {
  let characterData: Record<string, unknown>[] = [];
  if (options.useCharacters) {
    const { data } = await supabase
      .from('characters')
      .select('*')
      .eq('novel_id', novelId);
    characterData = data || [];
  }

  let plotData: { title: string; scenes: { content: string; note: string }[] }[] = [];
  if (options.usePlot) {
    const { data: lists } = await supabase
      .from('plot_lists')
      .select('*, plot_cards(*)')
      .eq('novel_id', novelId)
      .order('order_index', { ascending: true });

    if (lists) {
      plotData = lists
        .map((list: { title: string; plot_cards: { episode: number; order_index: number; content: string; note: string }[] }) => {
          let cards = list.plot_cards;
          if (options.currentEpisode !== undefined) {
            cards = cards.filter(c => c.episode === options.currentEpisode);
          }
          return {
            title: list.title,
            scenes: cards
              .sort((a, b) => a.order_index - b.order_index)
              .map(card => ({ content: card.content, note: card.note })),
          };
        })
        .filter((d: { scenes: unknown[] }) =>
          options.currentEpisode === undefined || d.scenes.length > 0
        );
    }
  }

  let relationshipData: { from: string; to: string; label: string; type: string }[] = [];
  if (options.useRelationships) {
    const { data } = await supabase
      .from('relationships')
      .select('*, source:characters!source_character_id(name), target:characters!target_character_id(name)')
      .eq('novel_id', novelId);

    if (data) {
      relationshipData = data.map((rel: { source: { name: string }; target: { name: string }; label: string; arrow_type: string }) => ({
        from: rel.source.name,
        to: rel.target.name,
        label: rel.label,
        type: rel.arrow_type,
      }));
    }
  }

  let worldElementData: Record<string, unknown>[] = [];
  if (options.useWorldElements) {
    const { data } = await supabase
      .from('world_elements')
      .select('*')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: true });
    worldElementData = data || [];
  }

  return { characterData, plotData, relationshipData, worldElementData };
}

/**
 * チャプター（エピソード）の本文内容と文字数を更新する
 */
export async function updateChapterContent(chapterId: string, content: any, wordsCount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('chapters')
    .update({ 
      content, 
      words_count: wordsCount,
      updated_at: new Date().toISOString() 
    })
    .eq('id', chapterId)

  if (error) {
    console.error('Error updating chapter:', error)
    return { error: error.message }
  }

  // We don't revalidate path here to avoid UI flickering during auto-save
  // or we could use specific tag revalidation
  return { success: true }
}

/**
 * 新しいAct（章・部）を作成する
 */
export async function createAct(novelId: string, title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Get max order index
  const { data: maxOrder } = await supabase
    .from('acts')
    .select('order_index')
    .eq('novel_id', novelId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const newOrderIndex = (maxOrder?.order_index ?? -1) + 1

  const { data, error } = await supabase
    .from('acts')
    .insert({
      novel_id: novelId,
      title,
      order_index: newOrderIndex
    })
    .select()
    .single()

  if (error) return { error: error.message }
  
  revalidatePath(`/novel/${novelId}/edit`)
  return { success: true, data }
}

/**
 * 指定したAct（章・部）を削除する
 */
export async function deleteAct(actId: string, novelId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('acts')
    .delete()
    .eq('id', actId)

  if (error) return { error: error.message }

  revalidatePath(`/novel/${novelId}/edit`)
  return { success: true }
}

/**
 * 指定したAct（章・部）の中に新しいチャプター（エピソード）を作成する
 */
export async function createChapter(novelId: string, actId: string, title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Get max order index in this act
  const { data: maxOrder } = await supabase
    .from('chapters')
    .select('order_index')
    .eq('act_id', actId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const newOrderIndex = (maxOrder?.order_index ?? -1) + 1

  const { data, error } = await supabase
    .from('chapters')
    .insert({
      novel_id: novelId,
      act_id: actId,
      title,
      order_index: newOrderIndex,
      content: '', // Empty initial content
      status: 'draft'
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/novel/${novelId}/edit`)
  return { success: true, data }
}

/**
 * 指定したチャプターを削除する
 */
export async function deleteChapter(chapterId: string, novelId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', chapterId)

  if (error) return { error: error.message }

  revalidatePath(`/novel/${novelId}/edit`)
  return { success: true }
}

/**
 * Act（章・部）の名前を変更する
 */
export async function renameAct(actId: string, novelId: string, title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('acts')
    .update({ title })
    .eq('id', actId)

  if (error) return { error: error.message }

  revalidatePath(`/novel/${novelId}/edit`)
  return { success: true }
}

/**
 * チャプターのタイトルを更新する
 */
export async function updateChapterTitle(chapterId: string, novelId: string, title: string) {
  const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
  
    const { error } = await supabase
      .from('chapters')
      .update({ title })
      .eq('id', chapterId)
  
    if (error) return { error: error.message }
  
    revalidatePath(`/novel/${novelId}/edit`)
    return { success: true }
}

/**
 * チャプターのメタデータ（ステータス、エピソード番号など）を更新する
 */
export async function updateChapterMeta(
  chapterId: string, 
  novelId: string, 
  meta: { status?: string; episode_number?: number | null }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
  
    const { error } = await supabase
      .from('chapters')
      .update(meta)
      .eq('id', chapterId)
  
    if (error) return { error: error.message }
  
    revalidatePath(`/novel/${novelId}/edit`)
    return { success: true }
}

/**
 * チャプターの並び順（order_index）と所属Act（act_id）を一括更新する
 * ドラッグ＆ドロップによる並び替え時に呼ばれます。
 */
export async function updateChapterOrder(novelId: string, updates: { id: string, order_index: number, act_id?: string }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const promises = updates.map(update => {
    const dataToUpdate: any = { order_index: update.order_index }
    if (update.act_id) {
        dataToUpdate.act_id = update.act_id
    }
    return supabase
      .from('chapters')
      .update(dataToUpdate)
      .eq('id', update.id)
  })

  const results = await Promise.all(promises)
  const hasError = results.some(r => r.error)

  if (hasError) {
    const errorMsg = results.find(r => r.error)?.error?.message
    return { error: errorMsg || 'Failed to update order' }
  }

  revalidatePath(`/novel/${novelId}/edit`)
  return { success: true }
}

// AI Proofreading Action
/**
 * AIによる校正（誤字脱字・文法チェック）を実行する
 */
export async function proofreadContent(content: string) {
  try {
    const session = await getRequiredSession()
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080'

    const response = await fetch(`${backendUrl}/api/proofread`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ content }),
      cache: 'no-store' 
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("Proofread API Error:", error);
    return { success: false, error: error.message };
  }
}

// AI Rewriting Action
/**
 * AIによる文章のリライト（書き直し・表現の改善）を実行する
 */
export async function rewriteContent(
    fullText: string, 
    selectedText: string, 
    instruction: string, 
    selectionRange: {start: number, end: number} | null, 
    context: any
) {
  try {
    const session = await getRequiredSession()
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080'

    const payload = {
        mode: "rewrite",
        data: {
            fullText,
            selectedText,
            instruction,
            selectionRange,
            context
        }
    };

    const response = await fetch(`${backendUrl}/api/rewrite`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload),
        cache: 'no-store'
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("Rewrite API Error:", error);
    return { success: false, error: error.message };
  }
}

// AI Story Generation Action (Short Story)
/**
 * AIによる短編小説（または1話完結のストーリー）の生成を実行する
 */
export async function generateStory(params: GenerateStoryParams) {
  try {
    const session = await getRequiredSession();
    const supabase = await createClient();

    const { characterData, plotData, relationshipData, worldElementData } = await fetchNovelReferences(
      supabase,
      params.novelId,
      params.references
    );

    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080';
    const payload = {
      mode: 'story-gen',
      data: {
        title: params.novelTitle,
        overview: params.novelSynopsis,
        worldSetting: params.novelWorldSetting || null,
        references: {
          correlationMap: params.references.useCharacters ? characterData : null,
          plot: params.references.usePlot ? plotData : null,
          relationMap: params.references.useRelationships ? relationshipData : null,
          worldElements: params.references.useWorldElements ? worldElementData : null,
        },
        baseContent: params.baseContent,
        config: params.config,
      },
    };

    const response = await fetch(`${backendUrl}/api/generate-story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Generate Story API Error:', error);
    return { success: false, error: message };
  }
}

// AI Long Story Generation Action
/**
 * AIによる長編小説の続き（指定した話数のエピソード）の生成を実行する
 */
export async function generateLongStory(params: GenerateLongStoryParams) {
  try {
    const session = await getRequiredSession();
    const supabase = await createClient();

    const { characterData, plotData, relationshipData, worldElementData } = await fetchNovelReferences(
      supabase,
      params.novelId,
      { ...params.references, currentEpisode: params.currentEpisode }
    );

    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080';
    const payload = {
      data: {
        title: params.novelTitle,
        overview: params.novelSynopsis,
        worldSetting: params.novelWorldSetting || null,
        pastContent: params.pastContent,
        currentEpisode: params.currentEpisode,
        references: {
          correlationMap: params.references.useCharacters ? characterData : null,
          plot: params.references.usePlot ? plotData : null,
          relationMap: params.references.useRelationships ? relationshipData : null,
          worldElements: params.references.useWorldElements ? worldElementData : null,
        },
        config: {
          ...params.config,
          perspective: params.novelPerspective,
        },
      },
    };

    const response = await fetch(`${backendUrl}/api/generate-long-story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Generate Long Story API Error:', error);
    return { success: false, error: message };
  }
}

// Fetch plot lists with cards for a novel (used by Edit component)
/**
 * 小説のプロットリストとそれに紐づくプロットカードをすべて取得する
 * （長編生成時の話数ごとのプロット参照などに使用）
 */
export async function fetchPlotListsForNovel(novelId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('plot_lists')
      .select('id, title, order_index, plot_cards(id, content, episode, order_index)')
      .eq('novel_id', novelId)
      .order('order_index', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Fetch Plot Lists Error:', error);
    return { success: false, error: message };
  }
}
