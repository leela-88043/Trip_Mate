/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Compile only the pure helper; no Expo runtime or credentials are needed.
const source = fs.readFileSync(path.join(__dirname, '../src/utils/tripTimeline.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helperModule = { exports: {} };
new Function('module', 'exports', compiled)(helperModule, helperModule.exports);
const { getTodayKey, getTripStatus, isActiveTrip } = helperModule.exports;
const trip = (start_date, end_date) => ({ start_date, end_date });

test('India date changes at 18:30 UTC, regardless of device timezone', () => {
  assert.equal(getTodayKey(new Date('2026-10-28T18:29:59Z')), '2026-10-28');
  assert.equal(getTodayKey(new Date('2026-10-28T18:30:00Z')), '2026-10-29');
  assert.equal(getTodayKey(new Date('2026-12-31T18:30:00Z')), '2027-01-01');
});

test('completion uses the end date, preserving today and one-day trips', () => {
  assert.equal(getTripStatus(trip('2026-10-26', '2026-10-27'), '2026-10-28'), 'completed');
  assert.equal(getTripStatus(trip('2026-10-26', '2026-10-28'), '2026-10-28'), 'ongoing');
  assert.equal(getTripStatus(trip('2026-10-29', '2026-10-30'), '2026-10-28'), 'upcoming');
  assert.equal(getTripStatus(trip('2026-10-28', '2026-10-28'), '2026-10-28'), 'ongoing');
  assert.equal(getTripStatus(trip('2026-10-28', '2026-10-28'), '2026-10-29'), 'completed');
});

test('invalid/missing dates never qualify as completed or active', () => {
  assert.equal(getTripStatus(trip('2026-10-30', '2026-10-28'), '2026-10-28'), 'unknown');
  assert.equal(getTripStatus(trip('2026-02-30', '2026-03-02'), '2026-10-28'), 'unknown');
  assert.equal(getTripStatus(trip('', ''), '2026-10-28'), 'unknown');
  assert.equal(isActiveTrip(trip('', ''), '2026-10-28'), false);
});

test('active listings exclude past trips and include ongoing/upcoming trips', () => {
  assert.equal(isActiveTrip(trip('2026-10-26', '2026-10-27'), '2026-10-28'), false);
  assert.equal(isActiveTrip(trip('2026-10-29', '2026-10-30'), '2026-10-28'), true);
  assert.equal(isActiveTrip(trip('2026-10-28', '2026-10-28'), '2026-10-28'), true);
});

test('leap-day end dates work', () => {
  assert.equal(getTripStatus(trip('2028-02-28', '2028-02-29'), '2028-03-01'), 'completed');
});
