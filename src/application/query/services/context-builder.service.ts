import { Injectable } from '@nestjs/common';
import { Document } from '@/core/entities/document.entity';
import { AIMessage } from '@/core/interfaces/services/ai-provider.interface';

/**
 * Context Builder Service.
 * Builds AI prompts from documents and user queries.
 *
 * MVP: Simple concatenation implementation.
 * Future: Implement intelligent context selection, chunking, relevance ranking.
 */
@Injectable()
export class ContextBuilderService {
  /**
   * Build messages for AI completion.
   * @param query - The user's question
   * @param documents - Documents to include as context
   * @param additionalContext - Optional additional context from the request
   */
  buildMessages(query: string, documents: Document[], additionalContext?: string): AIMessage[] {
    const systemPrompt = this.buildSystemPrompt(documents, additionalContext);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ];
  }

  private buildSystemPrompt(documents: Document[], additionalContext?: string): string {
    if (documents.length === 0) {
      return 'You are a helpful documentation assistant. The user is asking about a project, but no documentation is currently available. Provide a helpful response explaining this.';
    }

    const docsContext = documents
      .map((doc) => `## ${doc.title}\n${doc.content}`)
      .join('\n\n---\n\n');

    const contextSection = additionalContext
      ? `\n\nAdditional context provided by the user:\n${additionalContext}\n`
      : '';

    return `You are a helpful documentation assistant. Answer questions based on the following documentation:

${docsContext}
${contextSection}
Instructions:
- Answer based only on the provided documentation
- If the answer isn't in the documentation, say so
- Be concise and helpful
- Reference specific sections when applicable`;
  }
}
