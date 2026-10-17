import { test } from 'vitest';
import assert from 'node:assert/strict';
import { runScrollEdgePasses } from '../scroll-edge-state.ts';
import { capture, scrollNode, windowRoot } from './scroll-edge-state-fixtures.ts';
import { settingsHomeTree } from './scroll-edge-state-android-settings-fixture.ts';

// ---------------------------------------------------------------------------
// A scroller nested in a scrollable ancestor with the same rect takes its edge hints from that
// ancestor (#3737): the inner RecyclerView on Android Settings claims hidden content above even at
// the top, while the outer ScrollView framing the same pixels reports where the content is.
// ---------------------------------------------------------------------------

test('scroll top edge: the Android Settings list at the top reports no hidden content above', async () => {
  const state = await capture(settingsHomeTree('at-top'), 'top');
  assert.equal(state.canScroll, false);
});

test('scroll top edge: the ancestor answers only the verdict, so selection still names the nested list', async () => {
  const state = await capture(settingsHomeTree('at-top'), 'top');
  assert.equal(state.scope, 'com.android.settings:id/recycler_view');
});

test('scroll top edge: a cyclic chain of same-rect scrollables ends the ancestor walk', async () => {
  const rect = { x: 0, y: 100, width: 400, height: 600 };
  const nodes = [
    windowRoot(),
    scrollNode(1, { parentIndex: 2, identifier: 'first', hiddenContentAbove: true, rect }),
    scrollNode(2, { parentIndex: 1, identifier: 'second', rect }),
  ];
  const state = await capture(nodes, 'top');
  assert.equal(state.scope, 'first');
  assert.equal(state.canScroll, false);
});

test('scroll top edge: the Android Settings list scrolled down still reports hidden content above', async () => {
  const state = await capture(settingsHomeTree('scrolled-down'), 'top');
  assert.equal(state.canScroll, true);
});

test('scroll bottom edge: the Android Settings list at the top still reports hidden content below', async () => {
  const state = await capture(settingsHomeTree('at-top'), 'bottom');
  assert.equal(state.canScroll, true);
});

test('scroll top on Android Settings stops at the top instead of reporting no progress', async () => {
  const frames = [settingsHomeTree('scrolled-down'), settingsHomeTree('at-top')];
  let scrolls = 0;
  const outcome = await runScrollEdgePasses({
    edge: 'top',
    captureState: async () => await capture(frames[Math.min(scrolls, frames.length - 1)]!, 'top'),
    scroll: async () => {
      scrolls += 1;
    },
  });
  assert.equal(outcome.passes, 1);
});

test('scroll top edge: a nested scroller whose rect differs from its scrollable ancestor keeps its own hint', async () => {
  const nodes = [
    windowRoot(),
    scrollNode(1, { identifier: 'outer', rect: { x: 0, y: 0, width: 400, height: 800 } }),
    scrollNode(2, {
      parentIndex: 1,
      identifier: 'inner',
      hiddenContentAbove: true,
      rect: { x: 0, y: 100, width: 400, height: 600 },
    }),
  ];
  const state = await capture(nodes, 'top');
  assert.equal(state.scope, 'inner');
  assert.equal(state.canScroll, true);
});
