import type { PrismaClient } from "@prisma/client";
import type { AIProvider } from "@/providers/ai/ai-provider";

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

export interface ProcessResourceInput {
  resourceId: string;
}

export interface ProcessResourceResult {
  chunksCreated: number;
  embeddingsCreated: number;
}

// ═══════════════════════════════════════
// Service
// ═══════════════════════════════════════

const CHUNK_SIZE = 500; // tokens approx
const CHUNK_OVERLAP = 50; // overlap between chunks

export class ResourceEmbeddingService {
  constructor(
    private ai: AIProvider,
    private prisma: PrismaClient
  ) {}

  /**
   * Chunk resource content → generate embeddings → store in pgvector.
   * Queue-ready: input is just a resourceId.
   */
  async processResource(
    input: ProcessResourceInput
  ): Promise<ProcessResourceResult> {
    // 1. Load resource with source content
    const resource = await this.prisma.resource.findUnique({
      where: { id: input.resourceId },
      include: { source: true },
    });

    if (!resource) throw new Error("Tài liệu không tồn tại");

    const content =
      resource.source?.cleanedContent ||
      resource.description ||
      "";

    if (content.length < 50) {
      throw new Error("Nội dung tài liệu quá ngắn để tạo embeddings");
    }

    // 2. Delete existing chunks + embeddings (for re-processing)
    await this.prisma.resourceChunk.deleteMany({
      where: { resourceId: input.resourceId },
    });

    // 3. Split into chunks
    const chunks = this.splitIntoChunks(content, CHUNK_SIZE, CHUNK_OVERLAP);

    // 4. Save chunks to DB
    const savedChunks = await Promise.all(
      chunks.map((chunk, index) =>
        this.prisma.resourceChunk.create({
          data: {
            resourceId: input.resourceId,
            content: chunk,
            chunkIndex: index,
            tokenCount: this.estimateTokenCount(chunk),
            metadata: {
              resourceTitle: resource.title,
              field: resource.field,
              level: resource.level,
            },
          },
        })
      )
    );

    // 5. Generate embeddings in batches
    const chunkTexts = savedChunks.map((c) => c.content);
    const embeddings = await this.ai.embedBatch(chunkTexts);

    // 6. Save embeddings to pgvector
    // Use raw SQL because Prisma doesn't natively support vector type
    for (let i = 0; i < savedChunks.length; i++) {
      const vectorStr = `[${embeddings[i].join(",")}]`;
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO resource_embeddings (id, "chunkId", embedding, model, "createdAt")
         VALUES (gen_random_uuid(), $1, $2::vector, $3, NOW())`,
        savedChunks[i].id,
        vectorStr,
        process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004"
      );
    }

    return {
      chunksCreated: savedChunks.length,
      embeddingsCreated: embeddings.length,
    };
  }

  // ═══════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════

  private splitIntoChunks(
    text: string,
    chunkSize: number,
    overlap: number
  ): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      chunks.push(words.slice(start, end).join(" "));
      start += chunkSize - overlap;
    }

    return chunks.filter((chunk) => chunk.length > 20);
  }

  private estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 chars for English, 2 chars for Vietnamese
    return Math.ceil(text.length / 3);
  }
}
