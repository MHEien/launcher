import { Index } from "@upstash/vector";

let vectorIndex: Index | null = null;

export function createVectorIndex(url: string, token: string): Index {
  return new Index({ url, token });
}

export function getVectorIndex(): Index {
  if (!vectorIndex) {
    vectorIndex = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });
  }
  return vectorIndex;
}

export interface VectorDocument {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

// Upsert document for semantic search
export async function upsertVector(
  index: Index,
  doc: VectorDocument
): Promise<void> {
  await index.upsert({
    id: doc.id,
    data: doc.text,
    metadata: doc.metadata,
  });
}

// Semantic search
export async function searchVectors(
  index: Index,
  query: string,
  topK: number = 10
): Promise<Array<{ id: string; score: number; metadata?: Record<string, unknown> }>> {
  const results = await index.query({
    data: query,
    topK,
    includeMetadata: true,
  });

  return results.map((r) => ({
    id: r.id as string,
    score: r.score,
    metadata: r.metadata as Record<string, unknown> | undefined,
  }));
}

// Delete from vector index
export async function deleteVector(index: Index, id: string): Promise<void> {
  await index.delete(id);
}

export { Index };
