/**
 * Capture Module
 *
 * Content script capture mode implementation for visual element selection.
 *
 * Exports:
 * - ElementHighlighter: Blue outline overlay on interactive elements
 * - BadgeTracker: Numbered badges on captured elements
 * - CaptureMode: Main coordinator
 * - generateSelector, detectAction: Selector generation utilities
 */

export * from './highlighter';
export * from './selector-gen';
export * from './badge-tracker';
export * from './capture-mode';
