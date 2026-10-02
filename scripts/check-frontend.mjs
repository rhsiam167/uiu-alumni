import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendJsDir = path.resolve(__dirname, '../frontend/js');

function getAllJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllJsFiles(filePath));
    } else if (file.endsWith('.js') && file !== 'dev-adapter.js') {
      results.push(filePath);
    }
  });
  return results;
}

const jsFiles = getAllJsFiles(frontendJsDir);
let errors = [];

// 1. Syntax check each file
for (const file of jsFiles) {
  const rel = path.relative(frontendJsDir, file);
  const result = spawnSync('node', ['--input-type=module', '--check'], {
    input: fs.readFileSync(file, 'utf8'),
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    errors.push(`Syntax error in ${rel}:\n${result.stderr}`);
  }
}

// Helper to extract exports from a JS file
function getExportsFromFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const exportsSet = new Set();

  // Matches: export function foo, export async function foo, export const foo, export let foo, export class foo
  const declRegex = /export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([a-zA-Z0-9_$]+)/g;
  let match;
  while ((match = declRegex.exec(content)) !== null) {
    exportsSet.add(match[1]);
  }

  // Matches: export { foo, bar as baz }
  const blockRegex = /export\s*\{([^}]+)\}/g;
  while ((match = blockRegex.exec(content)) !== null) {
    const names = match[1].split(',');
    for (let name of names) {
      name = name.trim();
      if (!name) continue;
      const parts = name.split(/\s+as\s+/);
      exportsSet.add(parts[parts.length - 1].trim());
    }
  }

  // Matches: export default foo / function / object
  if (/export\s+default\s+/.test(content)) {
    exportsSet.add('default');
  }

  return exportsSet;
}

// 2. Parse import statements and verify exports
for (const file of jsFiles) {
  const fileRel = path.relative(frontendJsDir, file);
  const content = fs.readFileSync(file, 'utf8');

  // Matches: import { a, b as c } from 'path'; or import defaultExport, { a } from 'path';
  const importRegex = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importClause = match[1].trim();
    const relPath = match[2].trim();

    // Only resolve relative local imports starting with .
    if (!relPath.startsWith('.')) continue;

    const targetPath = path.resolve(path.dirname(file), relPath);
    const targetExports = getExportsFromFile(targetPath);

    if (!targetExports) {
      errors.push(`File ${fileRel} imports from missing file: ${relPath}`);
      continue;
    }

    // Check named imports inside { ... }
    const namedMatch = importClause.match(/\{([^}]+)\}/);
    if (namedMatch) {
      const specifiers = namedMatch[1].split(',');
      for (let spec of specifiers) {
        spec = spec.trim();
        if (!spec) continue;
        const importedName = spec.split(/\s+as\s+/)[0].trim();
        if (!targetExports.has(importedName)) {
          errors.push(`File ${fileRel} imports '${importedName}' from '${relPath}', but it is not exported!`);
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error('❌ Frontend Check Failed with errors:\n');
  errors.forEach(err => console.error('  - ' + err));
  process.exit(1);
} else {
  console.log(`✅ Frontend Check Passed! Verified ${jsFiles.length} JS files.`);
  process.exit(0);
}
