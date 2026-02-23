import * as fs from 'node:fs';
import * as path from 'node:path';
import { DocumentFile } from '@/scripts/setup/types';

export function loadMarkdownFiles(docsDir: string): DocumentFile[] {
  const absoluteDir = path.resolve(docsDir);

  if (!fs.existsSync(absoluteDir)) {
    console.warn(`Warning: docs directory not found at ${absoluteDir}`);
    return [];
  }

  return scanDirectory(absoluteDir, '');
}

function scanDirectory(dir: string, basePath: string): DocumentFile[] {
  const files: DocumentFile[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const subPath = basePath ? `${basePath}/${entry.name}` : entry.name;
      files.push(...scanDirectory(fullPath, subPath));
    } else if (entry.name.endsWith('.md') && entry.name.toLowerCase() !== 'readme.md') {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const fileName = entry.name.replace('.md', '');
      const relativePath = basePath ? `${basePath}/${fileName}` : fileName;
      const title = extractTitle(content) || formatTitleFromFilename(fileName);

      files.push({ title, content, relativePath });
    }
  }

  return files;
}

function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function formatTitleFromFilename(fileName: string): string {
  return fileName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
