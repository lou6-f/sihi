import { prisma } from "@/lib/prisma";

/**
 * RAG utility: vector similarity search via pgvector.
 * Uses cosine similarity (<=> operator) on ResourceEmbedding table.
 */

export interface RAGSearchResult {
  resourceId: string;
  title: string;
  url: string;
  field: string;
  level: string;
  summary: string | null;
  similarity: number;
}

/**
 * Search for similar resources using embedding vector.
 * Requires pgvector extension + embeddings populated.
 */
export async function searchSimilarResources(
  queryEmbedding: number[],
  options: {
    limit?: number;
    field?: string;
    level?: string;
    minSimilarity?: number;
  } = {}
): Promise<RAGSearchResult[]> {
  const { limit = 10, field, level, minSimilarity = 0.5 } = options;

  // Convert embedding to pgvector format
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // Build filter conditions
  const filters: string[] = [`r.status = 'APPROVED'`];
  const params: unknown[] = [embeddingStr, limit];

  if (field) {
    params.push(field);
    filters.push(`r.field = $${params.length}`);
  }

  if (level) {
    params.push(level);
    filters.push(`r.level = $${params.length}`);
  }

  const whereClause = filters.join(" AND ");

  const results = await prisma.$queryRawUnsafe<RAGSearchResult[]>(
    `
    SELECT
      r.id as "resourceId",
      r.title,
      r.url,
      r.field,
      r.level,
      r.summary,
      1 - (re.embedding <=> $1::vector) as similarity
    FROM "ResourceEmbedding" re
    JOIN "Resource" r ON re."resourceId" = r.id
    WHERE ${whereClause}
      AND 1 - (re.embedding <=> $1::vector) >= ${minSimilarity}
    ORDER BY re.embedding <=> $1::vector
    LIMIT $2
    `,
    ...params
  );

  return results;
}

/**
 * Search resources by text query (uses embedding).
 * The caller should generate the embedding first via AIProvider.embed().
 */
export async function searchResourcesByText(
  embedding: number[],
  field?: string,
  limit = 5
): Promise<RAGSearchResult[]> {
  return searchSimilarResources(embedding, { field, limit });
}
