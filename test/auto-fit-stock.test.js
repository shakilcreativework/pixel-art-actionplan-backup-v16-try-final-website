import { describe, it, expect } from 'vitest';
import { AutoFitStockEngine } from '../src/core/marketplace/AutoFitStockEngine.js';
import { MarketplaceSafeCheck } from '../src/core/marketplace/MarketplaceSafeCheck.js';

describe('Intelligent Auto-Fit Stock Engine — Aspect Ratio & Zero Crop Tests', () => {
  it('should preserve original aspect ratio exactly when scaling up small images', () => {
    // 1024 x 576 (16:9 ratio = 1.7777777...)
    const origW = 1024;
    const origH = 576;

    const res = AutoFitStockEngine.calculateStockScale(origW, origH, 4.0);

    // Initial MP is ~0.59 MP
    expect(res.originalMP).toBeLessThan(4.0);
    // Target MP should hit or exceed 4.0 MP
    expect(res.targetMP).toBeGreaterThanOrEqual(4.0);

    // Check aspect ratios are identical
    const origAspect = origW / origH;
    const targetAspect = res.targetWidth / res.targetHeight;
    expect(Math.abs(origAspect - targetAspect)).toBeLessThan(0.01);
    expect(res.zeroCropGuaranteed).toBe(true);
  });

  it('should not scale artwork that is already >= 4.0 Megapixels', () => {
    // 3840 x 2160 (4K UHD = 8.29 MP)
    const res = AutoFitStockEngine.calculateStockScale(3840, 2160, 4.0);

    expect(res.scaleMultiplier).toBe(1.0);
    expect(res.targetWidth).toBe(3840);
    expect(res.targetHeight).toBe(2160);
    expect(res.originalMP).toBe(8.29);
    expect(res.targetMP).toBe(8.29);
  });

  it('should correctly scale portrait images (4:5 ratio) without distortion', () => {
    // 800 x 1000 (4:5 ratio = 0.8)
    const res = AutoFitStockEngine.calculateStockScale(800, 1000, 4.0);

    expect(res.targetMP).toBeGreaterThanOrEqual(4.0);

    const origAspect = 800 / 1000;
    const targetAspect = res.targetWidth / res.targetHeight;
    expect(Math.abs(origAspect - targetAspect)).toBeLessThan(0.01);
  });

  it('should correctly scale square images (1:1 ratio)', () => {
    // 1000 x 1000 (1.0 MP)
    const res = AutoFitStockEngine.calculateStockScale(1000, 1000, 4.0);

    expect(res.targetWidth).toBe(res.targetHeight);
    expect(res.targetMP).toBeGreaterThanOrEqual(4.0);
    expect(res.scaleMultiplier).toBe(2.0); // 2000x2000 = 4.0 MP
  });

  it('should provide comprehensive audit report data via getAuditReport', () => {
    const report = AutoFitStockEngine.getAuditReport({ width: 1280, height: 720 });

    expect(report.passed).toBe(false);
    expect(report.badgeText).toContain('Auto-Fit Recommended');
    expect(report.fitData.scaleMultiplier).toBeGreaterThan(1.0);
  });

  it('should integrate Auto-Fit recommendation into MarketplaceSafeCheck', () => {
    const report = MarketplaceSafeCheck.inspect({
      width: 1280,
      height: 720,
      format: 'svg'
    });

    const resCheck = report.technicalChecks.find(c => c.label.includes('Artboard Resolution'));
    expect(resCheck).toBeDefined();
    expect(resCheck.passed).toBe(false);
    expect(resCheck.detail).toContain('Auto-Fit recommended');

    const resWarning = report.findings.find(f => f.category === 'Document Dimensions');
    expect(resWarning).toBeDefined();
    expect(resWarning.message).toContain('1-Click Auto-Fit can scale dimensions');
  });
});
