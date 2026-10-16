import type { SnapshotResult } from '@agent-device/contracts/interactor-types';
import type { SnapshotNode, SnapshotState } from '@agent-device/kernel/snapshot';
import { sparseCaptureQuality } from '@agent-device/selectors/absence-observation';
import type { ScrollCaptureRefusal } from '@agent-device/capture-kit/scroll-edge-state';

/**
 * Whether a scroll capture can answer anything at all, for every scroll loop. Sparseness is the
 * question absence assertions ask, answered by the same helper rather than a second definition of
 * readable. Truncation is deliberately NOT refused: a truncated tree is real and readable with its
 * tail missing, and refusing it would fail large screens where the answer is plainly in view.
 */
export function scrollCaptureRefusal(result: SnapshotResult): ScrollCaptureRefusal | undefined {
  const nodes = result.nodes;
  if (nodes === undefined) {
    return { reason: 'no-capture', detail: 'the capture returned no accessibility tree' };
  }
  // Sparseness first: a backend that names why its tree is unusable (the Android helper's
  // presentation failure ships no nodes and a sparse verdict) gives the better answer.
  const sparse = sparseCaptureQuality({
    backend: result.backend as SnapshotState['backend'],
    nodes: nodes as SnapshotNode[],
    ...(result.quality ? { snapshotQuality: result.quality } : {}),
  });
  if (sparse) {
    return {
      reason: 'sparse-tree',
      detail: sparse.reason ?? 'the capture backend reported a sparse tree',
    };
  }
  if (nodes.length === 0) {
    return { reason: 'no-capture', detail: 'the capture returned an empty accessibility tree' };
  }
  return undefined;
}
