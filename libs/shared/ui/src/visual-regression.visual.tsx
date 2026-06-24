/// <reference types="vite/client" />
import { composeStories } from '@storybook/react-vite';
import { page } from '@vitest/browser/context';
import type { ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';

// Self-hosted visual regression for shared-ui (Chromatic replacement).
//
// Renders every story's INITIAL state (decorators + args applied, play
// functions NOT run) in a real browser and diffs a screenshot against a
// committed Linux baseline. Opt a story or component out of visual testing
// with `parameters: { visual: { disable: true } }`.
//
// Runs only in the Vitest `visual` project (VITEST_VISUAL=true); Jest ignores
// it because the file is `.visual.tsx`, not `.test`/`.spec`.

type StoryModule = Parameters<typeof composeStories>[0];
type ComposedStory = {
  parameters?: { visual?: { disable?: boolean; interact?: boolean } };
  play?: (context: { canvasElement: HTMLElement }) => Promise<void> | void;
};

const storyModules = import.meta.glob<StoryModule>('./lib/**/*.stories.tsx', {
  eager: true,
});

let container: HTMLElement;
let root: Root;

beforeAll(() => {
  // Freeze animations/transitions and hide the text caret so snapshots are
  // deterministic across runs (spinners, pulses, fades would otherwise flake).
  const style = document.createElement('style');
  style.textContent = `
  html, body { margin: 0 !important; padding: 0 !important; }
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }`;
  document.head.appendChild(style);
});

beforeEach(() => {
  container = document.createElement('div');
  container.setAttribute('data-testid', 'visual-root');
  // Fill the viewport so fixed/overlay components (Modal, Dropdown, Tooltip,
  // Toast) and any portaled content land inside the captured region rather than
  // being clipped to the story's flow box.
  container.style.width = '100%';
  container.style.minHeight = '100vh';
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  root.unmount();
  container.remove();
});

for (const [filePath, storyModule] of Object.entries(storyModules)) {
  const componentName =
    filePath.split('/').pop()?.replace('.stories.tsx', '') ?? filePath;

  let composed: Record<string, ComposedStory>;
  try {
    composed = composeStories(storyModule) as Record<string, ComposedStory>;
  } catch {
    // Skip modules with no composable stories (e.g. docs-only).
    continue;
  }

  describe(componentName, () => {
    for (const [storyName, story] of Object.entries(composed)) {
      const disabled = story.parameters?.visual?.disable === true;
      const runTest = disabled ? test.skip : test;

      runTest(storyName, async () => {
        const Story = story as ComponentType;
        await new Promise<void>(resolve => {
          root.render(<Story />);
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        // Wait for web fonts so text rendering is stable (small text otherwise
        // flakes between the pre- and post-font-load frame).
        await document.fonts.ready;
        // Overlay components (Tooltip, Dropdown) only show their popup after
        // interaction. Opt in with `parameters.visual.interact` to run the
        // story's play — which opens and leaves the overlay open — before the
        // capture, so the opened state is snapshotted instead of just the
        // trigger.
        if (story.parameters?.visual?.interact && story.play) {
          await story.play({ canvasElement: container });
          await new Promise<void>(resolve =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          );
          await document.fonts.ready;
        }
        await expect(page.getByTestId('visual-root')).toMatchScreenshot(
          `${componentName}-${storyName}`
        );
      });
    }
  });
}
