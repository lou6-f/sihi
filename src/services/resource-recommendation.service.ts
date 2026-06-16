import type { PrismaClient } from "@prisma/client";
import type { AIProvider } from "@/providers/ai/ai-provider";

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

export interface RecommendInput {
  userId: string;
  interviewId?: string;
  weaknesses: string[];
  field: string;
}

export interface ResourceSuggestion {
  resourceId: string;
  title: string;
  url: string;
  reason: string;
  relevanceScore: number;
  skillArea: string;
}

// ═══════════════════════════════════════
// Service
// ═══════════════════════════════════════

export class ResourceRecommendationService {
  constructor(
    private ai: AIProvider,
    private prisma: PrismaClient
  ) {}

  /**
   * Use RAG (vector search) to find resources matching user weaknesses.
   * Queue-ready: input is user weaknesses + field.
   */
  async recommend(input: RecommendInput): Promise<ResourceSuggestion[]> {
    const { userId, interviewId, weaknesses, field } = input;

    if (weaknesses.length === 0) return [];

    // 1. Create a combined query from weaknesses
    const queryText = weaknesses.join(". ") + `. Lĩnh vực: ${field}`;

    // 2. Generate query embedding
    const queryEmbedding = await this.ai.embed(queryText);
    const vectorStr = `[${queryEmbedding.join(",")}]`;

    // 3. Vector similarity search using pgvector
    const results = await this.prisma.$queryRawUnsafe<
      Array<{
        chunk_id: string;
        resource_id: string;
        chunk_content: string;
        similarity: number;
        resource_title: string;
        resource_url: string;
        resource_field: string;
        resource_level: string;
      }>
    >(
      `SELECT
        rc.id as chunk_id,
        rc."resourceId" as resource_id,
        rc.content as chunk_content,
        1 - (re.embedding <=> $1::vector) as similarity,
        r.title as resource_title,
        r.url as resource_url,
        r.field as resource_field,
        r.level as resource_level
       FROM resource_embeddings re
       JOIN resource_chunks rc ON re."chunkId" = rc.id
       JOIN resources r ON rc."resourceId" = r.id
       WHERE r.status = 'PUBLISHED'
         AND r.field = $2
       ORDER BY re.embedding <=> $1::vector
       LIMIT 10`,
      vectorStr,
      field
    );

    if (results.length === 0) return [];

    // 4. De-duplicate by resource (keep highest similarity)
    const resourceMap = new Map<string, typeof results[0]>();
    for (const result of results) {
      const existing = resourceMap.get(result.resource_id);
      if (!existing || result.similarity > existing.similarity) {
        resourceMap.set(result.resource_id, result);
      }
    }

    // 5. Build suggestions
    const suggestions: ResourceSuggestion[] = [];
    for (const [resourceId, result] of resourceMap) {
      // Determine which weakness this resource addresses
      const matchedWeakness =
        weaknesses.find((w) =>
          result.chunk_content.toLowerCase().includes(w.toLowerCase())
        ) || weaknesses[0];

      const suggestion: ResourceSuggestion = {
        resourceId,
        title: result.resource_title,
        url: result.resource_url,
        reason: `Giúp cải thiện: ${matchedWeakness}`,
        relevanceScore: Math.round(result.similarity * 100) / 100,
        skillArea: matchedWeakness,
      };

      suggestions.push(suggestion);

      // Save to DB
      await this.prisma.aiResourceSuggestion.create({
        data: {
          resourceId,
          userId,
          interviewId,
          reason: suggestion.reason,
          relevanceScore: suggestion.relevanceScore,
          skillArea: suggestion.skillArea,
        },
      });
    }

    return suggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }
}
