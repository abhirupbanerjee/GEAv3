#!/usr/bin/env node

/**
 * Generates page-contexts.json by scanning all page.tsx files
 * Extracts @pageContext metadata from JSDoc comments
 * Run: npm run generate-contexts
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const APP_DIR = path.join(__dirname, '../src/app');
const OUTPUT_DIR = path.join(__dirname, '../public');
const CONTEXTS_FILE = path.join(OUTPUT_DIR, 'page-contexts.json');
const STATUS_FILE = path.join(OUTPUT_DIR, 'page-contexts-status.json');

// Directories to skip when scanning
const SKIP_DIRS = ['api', 'components', '_components', 'lib', 'hooks', 'utils'];

// ============================================================================
// Scanner Functions
// ============================================================================

function scanDirectory(dir, basePath = '') {
  const pages = [];

  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    return pages;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Skip special directories
      if (SKIP_DIRS.includes(item.name)) continue;
      if (item.name.startsWith('_')) continue;

      // Recurse into subdirectories
      const subPath = path.join(basePath, item.name);
      pages.push(...scanDirectory(fullPath, subPath));
    } else if (item.name === 'page.tsx' || item.name === 'page.ts') {
      pages.push(fullPath);
    }
  }

  return pages;
}

function extractRouteFromPath(filePath) {
  const relativePath = path.relative(APP_DIR, filePath);
  let route = '/' + path.dirname(relativePath).replace(/\\/g, '/');
  route = route === '/.' ? '/' : route;

  // Handle dynamic route segments: [id] → :id
  route = route.replace(/\[([^\]]+)\]/g, ':$1');

  return route;
}

// ============================================================================
// Parser Functions
// ============================================================================

function parsePageContext(content) {
  // Look for @pageContext block in JSDoc comment
  const contextMatch = content.match(/\/\*\*[\s\S]*?@pageContext[\s\S]*?\*\//);

  if (!contextMatch) return null;

  const block = contextMatch[0];
  const context = {};

  // Extract @title
  const titleMatch = block.match(/@title\s+(.+)/);
  if (titleMatch) context.title = titleMatch[1].trim();

  // Extract @purpose
  const purposeMatch = block.match(/@purpose\s+(.+)/);
  if (purposeMatch) context.purpose = purposeMatch[1].trim();

  // Extract @audience
  const audienceMatch = block.match(/@audience\s+(public|staff|admin)/);
  if (audienceMatch) context.audience = audienceMatch[1];

  // Extract @routePattern
  const routePatternMatch = block.match(/@routePattern\s+(.+)/);
  if (routePatternMatch) context.routePattern = routePatternMatch[1].trim();

  // Extract multi-line sections
  context.steps = extractMultiLineSection(block, 'steps');
  context.tips = extractMultiLineSection(block, 'tips');
  context.features = extractMultiLineSection(block, 'features');
  context.routeParams = extractMultiLineSection(block, 'routeParams');
  context.permissions = extractMultiLineSection(block, 'permissions');
  context.relatedPages = extractMultiLineSection(block, 'relatedPages');
  context.troubleshooting = extractMultiLineSection(block, 'troubleshooting');

  return context;
}

function extractMultiLineSection(block, sectionName) {
  // Match @sectionName followed by lines starting with - until we hit another @ tag or end of comment
  const regex = new RegExp(`@${sectionName}\\s*\\n((?:\\s*[-*]\\s*[^@\\n]+(?:\\n|$))+)`, 'i');
  const match = block.match(regex);

  if (!match) return undefined;

  const items = match[1]
    .split('\n')
    .map(line => line.replace(/^\s*[-*]\s*/, '').trim())
    .filter(line => {
      // Filter out empty lines, lines starting with *, lines starting with /, and lines starting with @
      return line.length > 0 && !line.startsWith('*') && !line.startsWith('/') && !line.startsWith('@');
    });

  return items.length > 0 ? items : undefined;
}

function inferContextFromRoute(route) {
  const parts = route.split('/').filter(Boolean);
  const inferred = {};

  // Determine audience from path
  if (parts[0] === 'admin') {
    inferred.audience = parts[1] === 'master' ? 'admin' : 'staff';
  } else if (parts[0] === 'auth') {
    inferred.audience = 'public';
  } else {
    inferred.audience = 'public';
  }

  // Generate title from route
  if (route === '/') {
    inferred.title = 'EA Portal Home';
    inferred.purpose = 'Main landing page for Government of Grenada Enterprise Architecture Portal';
  } else {
    const lastPart = parts[parts.length - 1] || 'page';
    // Handle dynamic segments
    const cleanPart = lastPart.replace(/^:/, '');
    inferred.title = cleanPart
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Add context based on section
    if (parts[0] === 'admin' && parts[1] === 'master') {
      inferred.title += ' Management';
    }

    inferred.purpose = `GEA Portal page at ${route}`;
  }

  return inferred;
}

// ============================================================================
// Generator Functions
// ============================================================================

function generatePageContexts() {
  console.log('\n' + '═'.repeat(70));
  console.log('  📄 GEA Portal - Page Context Generator');
  console.log('═'.repeat(70) + '\n');

  console.log('🔍 Scanning for page.tsx files...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const pageFiles = scanDirectory(APP_DIR);
  const contexts = {};
  const documentedRoutes = [];
  const inferredRoutes = [];

  for (const filePath of pageFiles) {
    const route = extractRouteFromPath(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Try to parse @pageContext from file
    const parsed = parsePageContext(content);

    if (parsed && parsed.title) {
      // Has documentation
      contexts[route] = {
        route,
        title: parsed.title,
        purpose: parsed.purpose || '',
        audience: parsed.audience || 'public',
        steps: parsed.steps,
        tips: parsed.tips,
        features: parsed.features,
        routePattern: parsed.routePattern,
        routeParams: parsed.routeParams,
        permissions: parsed.permissions,
        relatedPages: parsed.relatedPages,
        troubleshooting: parsed.troubleshooting,
        autoGenerated: false,
        lastUpdated: new Date().toISOString(),
      };
      documentedRoutes.push(route);
      console.log(`  ✅ ${route}`);
      console.log(`     └─ ${parsed.title}`);
    } else {
      // Infer from route
      const inferred = inferContextFromRoute(route);
      contexts[route] = {
        route,
        title: inferred.title || 'Page',
        purpose: inferred.purpose || '',
        audience: inferred.audience || 'public',
        autoGenerated: true,
        lastUpdated: new Date().toISOString(),
      };
      inferredRoutes.push(route);
      console.log(`  ⚠️  ${route}`);
      console.log(`     └─ Auto-inferred (add @pageContext for better AI)`);
    }
  }

  // Sort by route
  const sortedContexts = Object.fromEntries(
    Object.entries(contexts).sort(([a], [b]) => a.localeCompare(b))
  );

  // Write contexts file
  fs.writeFileSync(CONTEXTS_FILE, JSON.stringify(sortedContexts, null, 2));

  // Generate and write status report
  const coverage = pageFiles.length > 0
    ? Math.round((documentedRoutes.length / pageFiles.length) * 100)
    : 0;

  const status = {
    totalPages: pageFiles.length,
    documented: documentedRoutes.length,
    inferred: inferredRoutes.length,
    coverage: `${coverage}%`,
    documentedRoutes: documentedRoutes.sort(),
    inferredRoutes: inferredRoutes.sort(),
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));

  // Print summary
  console.log('\n' + '─'.repeat(70));
  console.log('\n📊 Generation Summary\n');
  console.log(`   Total pages found:    ${pageFiles.length}`);
  console.log(`   ✅ Documented:        ${documentedRoutes.length}`);
  console.log(`   ⚠️  Auto-inferred:     ${inferredRoutes.length}`);
  console.log(`   📈 Coverage:          ${coverage}%`);
  console.log('\n📁 Output Files:');
  console.log(`   ${CONTEXTS_FILE}`);
  console.log(`   ${STATUS_FILE}`);

  if (inferredRoutes.length > 0) {
    console.log('\n💡 To improve AI responses, add @pageContext to:');
    inferredRoutes.forEach(route => {
      console.log(`   - ${route}`);
    });
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

// ============================================================================
// Run
// ============================================================================

generatePageContexts();
