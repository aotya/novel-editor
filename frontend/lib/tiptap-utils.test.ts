import { tiptapDocToText } from './tiptap-utils';

describe('tiptapDocToText', () => {
  it('文字列をそのまま返す', () => {
    expect(tiptapDocToText('plain')).toBe('plain');
  });

  it('null / undefined は空文字', () => {
    expect(tiptapDocToText(null)).toBe('');
    expect(tiptapDocToText(undefined)).toBe('');
  });

  it('空オブジェクトや doc 以外は空文字', () => {
    expect(tiptapDocToText({})).toBe('');
    expect(tiptapDocToText({ type: 'heading', content: [] })).toBe('');
  });

  it('単一 paragraph からテキストを抽出する', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ text: 'hello' }, { text: ' world' }],
        },
      ],
    };
    expect(tiptapDocToText(doc)).toBe('hello world');
  });

  it('複数 paragraph は改行で連結する', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ text: 'a' }] },
        { type: 'paragraph', content: [{ text: 'b' }] },
      ],
    };
    expect(tiptapDocToText(doc)).toBe('a\nb');
  });

  it('paragraph 内 content が空なら空文字', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    };
    expect(tiptapDocToText(doc)).toBe('');
  });

  it('text プロパティがないノードは空として扱う', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{}, { text: 'x' }],
        },
      ],
    };
    expect(tiptapDocToText(doc)).toBe('x');
  });

  it('paragraph 以外のトップレベルノードは空行相当（空文字）として挟まれる', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ text: 'a' }] },
        { type: 'heading', content: [{ text: 'h' }] },
        { type: 'paragraph', content: [{ text: 'b' }] },
      ],
    };
    expect(tiptapDocToText(doc)).toBe('a\n\nb');
  });
});
