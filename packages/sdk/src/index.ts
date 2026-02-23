#!/usr/bin/env node

import { main } from './cli';
import { logError } from './prompts';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  @knowstack/sdk — CLI toolkit for KnowStack project setup

  Usage:
    npx @knowstack/sdk --init [--profile <name>]

  Options:
    --init              Initialize a KnowStack project
    --profile <name>    Use or create a named profile
    --help, -h          Show this help message
    --version, -v       Show version
  `);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../package.json');
    console.log(pkg.version);
  } catch {
    console.log('0.1.0');
  }
  process.exit(0);
}

if (args.includes('--init')) {
  const profileIdx = args.indexOf('--profile');
  const profile = profileIdx !== -1 && profileIdx + 1 < args.length
    ? args[profileIdx + 1]
    : undefined;

  main({ profile }).catch((error) => {
    logError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
} else {
  console.log('Usage: npx @knowstack/sdk --init [--profile <name>]');
  console.log('Run with --help for more information.');
  process.exit(1);
}
