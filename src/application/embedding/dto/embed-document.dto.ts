/**
 * Input for embedding a document.
 */
export interface EmbedDocumentInput {
  documentId: string;
  projectId: string;
  title: string;
  content: string;
  contentHash: string;
}

/**
 * Result of embedding a document.
 */
export interface EmbedDocumentResult {
  success: boolean;
  documentId: string;
  action: 'created' | 'updated' | 'skipped' | 'failed';
  tokensUsed?: number;
  error?: string;
}

/**
 * Input for checking if document needs embedding.
 */
export interface ShouldEmbedInput {
  documentId: string;
  contentHash: string;
}
