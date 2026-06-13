/**
 * Offline Lab entry point.
 *
 * Re-exports the REAL fill engine from apps/extension so the Playwright tests
 * exercise the exact source code that ships in the content script — not a copy.
 * esbuild bundles this into dist/engine.global.js exposing `window.PopulatteEngine`.
 *
 * The engine (executor -> selector -> actions) is pure DOM logic with no chrome.*
 * dependencies, so it runs verbatim inside any page under test.
 */
export { executeSteps } from '../../apps/extension/src/content/executor';
