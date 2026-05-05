import type { Mock } from 'vitest';

vi.mock('@/lib/auth-utils', () => ({
  getRequiredSession: vi.fn(() =>
    Promise.resolve({ access_token: 'test-token' }),
  ),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// ★ 追加: process.env のモック
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dummy-key';

import { createClient } from '@/lib/supabase/server';
import {
  generateLongStory,
  generateStory,
  rewriteContent,
} from './actions';

type TableResult = { data?: unknown; error?: unknown | null };

/** Supabase チェーン（select / eq / order / not / single）を await 可能にする */
function createChainable(result: TableResult) {
  const chain = {
    select() {
      return chain;
    },
    eq() {
      return chain;
    },
    not() {
      return chain;
    },
    order() {
      return chain;
    },
    single() {
      return chain;
    },
    then(
      onFulfilled?: (value: TableResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };
  return chain;
}

function makeSupabaseMock(tableResults: Record<string, TableResult>) {
  return {
    from: (table: string) => {
      const r = tableResults[table] ?? { data: [], error: null };
      return createChainable(r);
    },
  };
}

function mockFetchOk() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ),
  );
}

function getLastFetchBody(): unknown {
  const fetchMock = vi.mocked(fetch);
  const last = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  expect(last).toBeDefined();
  const init = last[1] as RequestInit;
  expect(init?.body).toBeDefined();
  return JSON.parse(init.body as string);
}

describe('AI Server Actions payload shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchOk();
    delete process.env.BACKEND_API_URL;
  });

  describe('rewriteContent', () => {
    it('enrichmentParams なしでは基本フィールドのみで references は無い', async () => {
      (createClient as Mock).mockResolvedValue(makeSupabaseMock({}));

      await rewriteContent('全文', '選択', '指示', { start: 1, end: 2 }, {
        chapterTitle: '第1話',
      });

      expect(getLastFetchBody()).toEqual({
        mode: 'rewrite',
        data: {
          fullText: '全文',
          selectedText: '選択',
          instruction: '指示',
          selectionRange: { start: 1, end: 2 },
          context: { chapterTitle: '第1話' },
        },
      });
    });

    it('enrichment 全フラグ true・published チャプター 0件では references は配列・pastContent キー無し', async () => {
      (createClient as Mock).mockResolvedValue(
        makeSupabaseMock({
          characters: { data: [], error: null },
          plot_lists: { data: [], error: null },
          relationships: { data: [], error: null },
          world_elements: { data: [], error: null },
          chapters: { data: [], error: null },
        }),
      );

      await rewriteContent('全文', '選択', '指示', null, {}, {
        novelId: 'n1',
        novelTitle: 'タイトル',
        novelSynopsis: 'あらすじ',
        references: {
          useCharacters: true,
          usePlot: true,
          useRelationships: true,
          useWorldElements: true,
        },
        usePastContent: true,
      });

      const body = getLastFetchBody() as {
        mode: string;
        data: Record<string, unknown>;
      };

      expect(body.mode).toBe('rewrite');
      expect(body.data.references).toEqual({
        correlationMap: [],
        plot: [],
        relationMap: [],
        worldElements: [],
      });
      expect(body.data.pastContent).toBeUndefined();
    });

    it('useCharacters false のとき correlationMap のみ null', async () => {
      (createClient as Mock).mockResolvedValue(
        makeSupabaseMock({
          plot_lists: {
            data: [
              {
                title: 'P1',
                plot_cards: [
                  {
                    episode: 1,
                    order_index: 0,
                    content: 'c',
                    note: 'n',
                  },
                ],
              },
            ],
            error: null,
          },
          relationships: {
            data: [
              {
                source: { name: 'A' },
                target: { name: 'B' },
                label: '友',
                arrow_type: 'forward',
              },
            ],
            error: null,
          },
          world_elements: { data: [{ id: 'w1', name: '国' }], error: null },
        }),
      );

      await rewriteContent('全文', '選択', '指示', null, {}, {
        novelId: 'n1',
        novelTitle: 'T',
        novelSynopsis: 'S',
        references: {
          useCharacters: false,
          usePlot: true,
          useRelationships: true,
          useWorldElements: true,
        },
        usePastContent: false,
      });

      const body = getLastFetchBody() as {
        data: { references: Record<string, unknown> };
      };

      expect(body.data.references.correlationMap).toBeNull();
      expect(body.data.references.plot).toEqual([
        { title: 'P1', scenes: [{ content: 'c', note: 'n' }] },
      ]);
      expect(body.data.references.relationMap).toEqual([
        { from: 'A', to: 'B', label: '友', type: 'forward' },
      ]);
      expect(body.data.references.worldElements).toEqual([
        { id: 'w1', name: '国' },
      ]);
    });

    it('novelWorldSetting 未指定でも worldSetting は null（キーは存在）', async () => {
      (createClient as Mock).mockResolvedValue(
        makeSupabaseMock({
          characters: { data: [], error: null },
          plot_lists: { data: [], error: null },
          relationships: { data: [], error: null },
          world_elements: { data: [], error: null },
        }),
      );

      await rewriteContent('全文', '選択', '指示', null, {}, {
        novelId: 'n1',
        novelTitle: 'T',
        novelSynopsis: 'S',
        references: {
          useCharacters: true,
          usePlot: false,
          useRelationships: false,
          useWorldElements: false,
        },
        usePastContent: false,
      });

      const body = getLastFetchBody() as { data: { worldSetting: unknown } };
      expect(body.data.worldSetting).toBeNull();
      expect(Object.prototype.hasOwnProperty.call(body.data, 'worldSetting')).toBe(
        true,
      );
    });
  });

  describe('generateStory', () => {
    it('全参照フラグ true で references が配列になり baseContent が渡る', async () => {
      (createClient as Mock).mockResolvedValue(
        makeSupabaseMock({
          characters: { data: [{ id: 'c1', name: 'Alice' }], error: null },
          plot_lists: {
            data: [
              {
                title: 'PL',
                plot_cards: [
                  { episode: 1, order_index: 0, content: 'pc', note: 'pn' },
                ],
              },
            ],
            error: null,
          },
          relationships: {
            data: [
              {
                source: { name: 'X' },
                target: { name: 'Y' },
                label: 'L',
                arrow_type: 'none',
              },
            ],
            error: null,
          },
          world_elements: { data: [{ id: 'we' }], error: null },
        }),
      );

      await generateStory({
        novelId: 'n1',
        novelTitle: 'NT',
        novelSynopsis: 'NS',
        novelWorldSetting: '世界',
        references: {
          useCharacters: true,
          usePlot: true,
          useRelationships: true,
          useWorldElements: true,
        },
        baseContent: 'ベース本文',
        config: {
          targetLength: 2000,
          perspective: '一人称',
          instruction: '追加',
        },
      });

      expect(getLastFetchBody()).toEqual({
        mode: 'story-gen',
        data: {
          title: 'NT',
          overview: 'NS',
          worldSetting: '世界',
          references: {
            correlationMap: [{ id: 'c1', name: 'Alice' }],
            plot: [{ title: 'PL', scenes: [{ content: 'pc', note: 'pn' }] }],
            relationMap: [
              { from: 'X', to: 'Y', label: 'L', type: 'none' },
            ],
            worldElements: [{ id: 'we' }],
          },
          baseContent: 'ベース本文',
          config: {
            targetLength: 2000,
            perspective: '一人称',
            instruction: '追加',
          },
        },
      });
    });

    it('worldSetting 未指定・参照全 false で null と null 参照', async () => {
      (createClient as Mock).mockResolvedValue(makeSupabaseMock({}));

      await generateStory({
        novelId: 'n1',
        novelTitle: 'T',
        novelSynopsis: 'O',
        references: {
          useCharacters: false,
          usePlot: false,
          useRelationships: false,
          useWorldElements: false,
        },
        baseContent: null,
        config: {
          targetLength: 100,
          perspective: '三人称',
          instruction: '',
        },
      });

      expect(getLastFetchBody()).toEqual({
        mode: 'story-gen',
        data: {
          title: 'T',
          overview: 'O',
          worldSetting: null,
          references: {
            correlationMap: null,
            plot: null,
            relationMap: null,
            worldElements: null,
          },
          baseContent: null,
          config: {
            targetLength: 100,
            perspective: '三人称',
            instruction: '',
          },
        },
      });
    });
  });

  describe('generateLongStory', () => {
    it('novelPerspective が config.perspective に注入される', async () => {
      (createClient as Mock).mockResolvedValue(makeSupabaseMock({}));

      await generateLongStory({
        novelId: 'n1',
        novelTitle: 'LT',
        novelSynopsis: 'LS',
        novelPerspective: '一人称（私）',
        references: {
          useCharacters: false,
          usePlot: false,
          useRelationships: false,
          useWorldElements: false,
        },
        currentEpisode: 3,
        pastContent: [{ episodeNumber: 1, title: '第1話', content: 'x' }],
        config: { targetLength: 3000, instruction: '続き' },
      });

      const body = getLastFetchBody() as {
        data: { config: Record<string, unknown> };
      };

      expect(body.data.config).toEqual({
        targetLength: 3000,
        instruction: '続き',
        perspective: '一人称（私）',
      });
    });

    it('currentEpisode でプロットカードがフィルタされる', async () => {
      (createClient as Mock).mockResolvedValue(
        makeSupabaseMock({
          plot_lists: {
            data: [
              {
                title: 'Arc',
                plot_cards: [
                  { episode: 1, order_index: 0, content: 'e1', note: 'n1' },
                  { episode: 2, order_index: 1, content: 'e2b', note: 'n2b' },
                  { episode: 2, order_index: 0, content: 'e2a', note: 'n2a' },
                ],
              },
            ],
            error: null,
          },
        }),
      );

      await generateLongStory({
        novelId: 'n1',
        novelTitle: 'T',
        novelSynopsis: 'S',
        novelPerspective: '三人称',
        references: {
          useCharacters: false,
          usePlot: true,
          useRelationships: false,
          useWorldElements: false,
        },
        currentEpisode: 2,
        pastContent: [],
        config: { targetLength: 1000, instruction: '' },
      });

      const body = getLastFetchBody() as {
        data: {
          references: {
            plot: { title: string; scenes: { content: string; note: string }[] }[];
          };
        };
      };

      expect(body.data.references.plot).toEqual([
        {
          title: 'Arc',
          scenes: [
            { content: 'e2a', note: 'n2a' },
            { content: 'e2b', note: 'n2b' },
          ],
        },
      ]);
    });
  });
});
