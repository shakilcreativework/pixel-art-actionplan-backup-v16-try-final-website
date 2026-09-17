import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Responsive Layout & Markup Audit', () => {
  const htmlPath = path.resolve(__dirname, '../index.html');
  const cssPath = path.resolve(__dirname, '../src/styles/index.css');
  const mainPath = path.resolve(__dirname, '../src/main.js');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const css = fs.readFileSync(cssPath, 'utf-8');
  const main = fs.readFileSync(mainPath, 'utf-8');

  it('includes mobile-friendly viewport meta tag', () => {
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0');
  });

  it('contains responsive drawer toggle button with accessible aria-label', () => {
    expect(html).toContain('id="sidebarToggleBtn"');
    expect(html).toContain('aria-label="Toggle Controls Sidebar"');
    expect(html).toContain('id="sidebarCloseBtn"');
    expect(html).toContain('id="sidebarBackdrop"');
  });

  it('contains overflow menu container and secondary actions for tablet/mobile', () => {
    expect(html).toContain('id="overflowMenuContainer"');
    expect(html).toContain('id="overflowMenuBtn"');
    expect(html).toContain('id="overflowDropdown"');
    expect(html).toContain('id="overflowSafeCheckBtn"');
    expect(html).toContain('id="overflowSplitViewBtn"');
    expect(html).toContain('id="overflowSaveProjectBtn"');
    expect(html).toContain('id="overflowOpenProjectLabel"');
  });

  it('contains all 7 engine mode buttons with clean SVGs and scroll navigation', () => {
    const modes = ['pixel-art', 'halftone', 'line-art', 'random-flow', 'camo-mesh', 'mosaic', 'pencil'];
    modes.forEach(mode => {
      expect(html).toContain(`data-mode="${mode}"`);
    });
    expect(html).toContain('id="modeScrollPrev"');
    expect(html).toContain('id="modeScrollNext"');
  });

  it('contains modal close buttons with aria-labels', () => {
    expect(html).toContain('id="modalCloseXBtn"');
    expect(html).toContain('id="safeCheckCloseXBtn"');
  });

  it('defines responsive media queries in CSS for all major screen breakpoints', () => {
    expect(css).toContain('@media (min-width: 1024px)');
    expect(css).toContain('@media (max-width: 1480px)');
    expect(css).toContain('@media (max-width: 1280px)');
    expect(css).toContain('@media (max-width: 1023px)');
    expect(css).toContain('@media (max-width: 767px)');
    expect(css).toContain('@media (max-width: 379px)');
  });

  it('handles dynamic viewport height and touch actions without horizontal overflow', () => {
    expect(css).toContain('100dvh');
    expect(css).toContain('overflow-x: hidden');
    expect(css).toContain('touch-action: none');
  });

  it('contains streamlined Mosaic background removal options', () => {
    expect(html).toContain('id="msBgModeGroup"');
    expect(html).toContain('data-mode="white"');
    expect(html).toContain('data-mode="black"');
    expect(html).toContain('data-mode="custom"');
    expect(html).toContain('Remove White');
    expect(html).toContain('Remove Black');
    expect(html).toContain('Pick Color');
  });

  it('wires Auto-Fit to a concrete document-dimension update method', () => {
    expect(main).toContain('updateDocumentDimensions(width, height)');
    expect(main).toContain('this.docManager.setCustomSize(width, height)');
  });

  it('registers one canonical handler for each Mosaic mode confirmation control', () => {
    expect(main.match(/msConfirmPixelArtBtn\.addEventListener/g)).toHaveLength(1);
    expect(main.match(/msOverridePhotoBtn\.addEventListener/g)).toHaveLength(1);
  });

  it('keeps the Mosaic reset path free of stale controller calls', () => {
    expect(main).toContain('manualRestoreIds: new Set()');
    expect(main).not.toContain('toggleMosaicPaintEyedropper');
  });
});
