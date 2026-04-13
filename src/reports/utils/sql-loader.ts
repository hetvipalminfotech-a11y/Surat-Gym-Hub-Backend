import * as fs from 'fs';
import * as path from 'path';

export function loadSQLQueries(filePath: string): Record<string, string> {
  const fullPath = path.join(process.cwd(), filePath);
  const fileContent = fs.readFileSync(fullPath, 'utf-8');

  const queries: Record<string, string> = {};

  const parts = fileContent.split('-- name:');

  parts.forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;

    const [nameLine, ...queryLines] = trimmed.split('\n');
    const name = nameLine.trim();
    const query = queryLines.join('\n').trim();

    queries[name] = query;
  });

  return queries;
}