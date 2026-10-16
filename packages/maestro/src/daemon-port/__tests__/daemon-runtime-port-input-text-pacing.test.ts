import { describe, expect, test } from 'vitest';
import type { MaestroDaemonOperationRequest } from '../daemon-runtime-public-operation.ts';
import { createDaemonMaestroRuntimePort } from '../daemon-runtime-port.ts';
import { makeRuntimeEnvelope, makeDependencies } from './daemon-runtime-port-fixtures.ts';

async function typeRequestFor(platform: 'android' | 'ios'): Promise<MaestroDaemonOperationRequest> {
  const requests: MaestroDaemonOperationRequest[] = [];
  const port = createDaemonMaestroRuntimePort({
    ...makeRuntimeEnvelope({ flags: { platform, replayBackend: 'maestro' } }),
    invoke: async (request) => {
      requests.push(request);
      return request.command === 'snapshot'
        ? {
            ok: true,
            data: {
              createdAt: requests.length,
              nodes: [
                { index: 0, type: 'Application', rect: { x: 0, y: 0, width: 400, height: 800 } },
              ],
            },
          }
        : { ok: true, data: {} };
    },
    dependencies: makeDependencies(),
    platform,
  });
  await port.execute({
    command: { kind: 'inputText', source: { line: 2 }, text: 'hello' },
    generation: 0,
    env: {},
    invalidateObservation() {},
  });
  const request = requests.find((candidate) => candidate.command === 'type');
  if (!request) throw new Error('inputText did not reach the type command');
  return request;
}

const MAESTRO_2_5_1_ANDROID_INPUT_TEXT_DELAY_MS = 75;

describe('Maestro inputText pacing', () => {
  test('Android types with the pinned Maestro per-character delay', async () => {
    const request = await typeRequestFor('android');
    expect(request.positionals).toEqual(['hello']);
    expect(request.flags?.delayMs).toBe(MAESTRO_2_5_1_ANDROID_INPUT_TEXT_DELAY_MS);
  });

  test('iOS types without a delay', async () => {
    const request = await typeRequestFor('ios');
    expect(request.flags).not.toHaveProperty('delayMs');
  });
});
