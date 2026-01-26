#!/usr/bin/env node

/**
 * Test Runner for Laxmi Wallet Tracker
 * Runs all test files in the tests directory
 */

import { spawn } from 'child_process';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFiles = readdirSync(__dirname)
  .filter(file => file.endsWith('.test.js'))
  .sort();

console.log('🚀 Running Test Suite\n');
console.log('=' .repeat(50));
console.log(`Found ${testFiles.length} test file(s)\n`);

let totalPassed = 0;
let totalFailed = 0;

async function runTest(testFile) {
  return new Promise((resolve) => {
    console.log(`\n📦 Running: ${testFile}`);
    console.log('─'.repeat(50));

    const testPath = join(__dirname, testFile);
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${testFile} passed`);
        totalPassed++;
      } else {
        console.log(`❌ ${testFile} failed with exit code ${code}`);
        totalFailed++;
      }
      resolve(code);
    });
  });
}

async function runAllTests() {
  for (const testFile of testFiles) {
    await runTest(testFile);
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Summary:');
  console.log(`  ✅ Passed: ${totalPassed}`);
  console.log(`  ❌ Failed: ${totalFailed}`);
  console.log(`  📦 Total:  ${testFiles.length}\n`);

  if (totalFailed > 0) {
    console.log('❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

runAllTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
