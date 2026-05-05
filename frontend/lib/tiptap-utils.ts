/**
 * Tiptap JSON（doc）またはプレーンテキストの chapter.content をプレーンテキストに変換する。
 */
export function tiptapDocToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!content || typeof content !== 'object') return '';

  const doc = content as {
    type?: string;
    content?: { type?: string; content?: { text?: string }[] }[];
  };
  if (doc.type !== 'doc' || !doc.content) return '';

  return doc.content
    .map((node) => {
      if (node.type === 'paragraph' && node.content) {
        return node.content.map((c) => c.text || '').join('');
      }
      return '';
    })
    .join('\n');
}
