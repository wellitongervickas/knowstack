import { Injectable, Inject } from '@nestjs/common';
import { ISourceFetcher, FetchResult } from '@/core/interfaces/services/source-fetcher.interface';
import { SourceType } from '@/core/entities/document.entity';
import {
  IStructuredLogger,
  STRUCTURED_LOGGER,
} from '@/core/interfaces/services/observability.interface';
import { USER_AGENT, DEFAULT_FETCH_TIMEOUT_MS, MAX_CONTENT_SIZE_BYTES } from '@/app.constants';

/**
 * Fetcher for generic URLs (markdown, text, HTML).
 */
@Injectable()
export class UrlFetcher implements ISourceFetcher {
  readonly sourceType: SourceType = 'URL';

  constructor(
    @Inject(STRUCTURED_LOGGER)
    private readonly logger: IStructuredLogger,
  ) {}

  async fetch(sourceUrl: string): Promise<FetchResult> {
    const startTime = Date.now();

    try {
      // Validate URL
      const url = new URL(sourceUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return {
          success: false,
          error: `Invalid protocol: ${url.protocol}`,
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);

      const response = await fetch(sourceUrl, {
        signal: controller.signal,
        headers: {
          Accept: 'text/plain, text/markdown, text/html, */*',
          'User-Agent': USER_AGENT,
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // Check content length before reading body
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_CONTENT_SIZE_BYTES) {
        return {
          success: false,
          error: `Content too large: ${contentLength} bytes (max: ${MAX_CONTENT_SIZE_BYTES})`,
        };
      }

      const content = await response.text();

      // Double-check size after reading (for chunked transfers)
      if (content.length > MAX_CONTENT_SIZE_BYTES) {
        return {
          success: false,
          error: `Content too large: ${content.length} bytes (max: ${MAX_CONTENT_SIZE_BYTES})`,
        };
      }

      const title = this.extractTitle(content, sourceUrl);
      const contentType = response.headers.get('content-type') ?? undefined;
      const latencyMs = Date.now() - startTime;

      this.logger.info('URL fetched', {
        sourceUrl,
        latencyMs,
      });

      return {
        success: true,
        document: {
          title,
          content,
          sourceUrl,
          metadata: {
            fetchedAt: new Date().toISOString(),
            contentType,
          },
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Handle abort specifically
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.info('URL fetch timeout', { sourceUrl });
        return {
          success: false,
          error: `Fetch timeout after ${DEFAULT_FETCH_TIMEOUT_MS}ms`,
        };
      }

      this.logger.error('URL fetch failed', error as Error, { sourceUrl });

      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Extract title from content.
   * Tries: H1 markdown header, HTML title tag, URL path.
   */
  private extractTitle(content: string, fallbackUrl: string): string {
    // Try H1 markdown header
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) return h1Match[1].trim();

    // Try HTML title tag
    const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) return titleMatch[1].trim();

    // Fallback to URL path
    try {
      const url = new URL(fallbackUrl);
      const path = url.pathname.split('/').pop() ?? 'Untitled';
      return path.replace(/\.(md|html|txt)$/i, '').replace(/[-_]/g, ' ');
    } catch {
      return 'Untitled Document';
    }
  }
}
