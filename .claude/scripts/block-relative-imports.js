/**
 * Hook: PreToolUse (Edit|Write)
 * Blocks file edits that introduce relative imports (../)
 * Exit 0 = allow, Exit 2 = block
 */
const data = [];
process.stdin.on('data', (chunk) => data.push(chunk));
process.stdin.on('end', () => {
  const input = JSON.parse(Buffer.concat(data).toString());
  const filePath = input.tool_input?.file_path || '';
  const content = input.tool_input?.new_string || input.tool_input?.content || '';

  // Only check TypeScript/JavaScript files
  if (!/\.(ts|tsx|js|jsx)$/.test(filePath)) process.exit(0);

  // Skip prisma/ internals (allowed exception)
  if (/prisma[/\\]/.test(filePath)) process.exit(0);

  // Check each line for relative imports crossing boundaries
  const lines = content.split('\n');
  for (const line of lines) {
    if (/^\s*(import|export)\s.*from\s+['"]\.\.\//.test(line)) {
      process.stderr.write(
        `BLOCKED: Relative import detected. Use @/ path alias instead.\n` +
          `Line: ${line.trim()}\n` +
          `See: docs/explanation/architecture/patterns.md#import-paths\n`,
      );
      process.exit(2);
    }
  }

  process.exit(0);
});
