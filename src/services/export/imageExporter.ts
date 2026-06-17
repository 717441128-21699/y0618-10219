import { toPng, toSvg, toJpeg } from 'html-to-image';

type Options = {
  width?: number;
  height?: number;
  pixelRatio?: number;
  backgroundColor?: string;
  cacheBust?: boolean;
  style?: Record<string, any>;
  quality?: number;
};

export type ExportFormat = 'png' | 'svg' | 'jpeg' | 'pdf';
export type ExportScope = 'main-view' | 'all-views' | 'analysis-only' | 'workspace';

export interface ExportConfig {
  format: ExportFormat;
  scope: ExportScope;
  width: number;
  height: number;
  dpi: number;
  quality: number;
  backgroundColor?: string;
  includeLegend: boolean;
  includeWatermark: boolean;
}

const DEFAULT_CONFIG: ExportConfig = {
  format: 'png',
  scope: 'main-view',
  width: 1920,
  height: 1080,
  dpi: 300,
  quality: 0.95,
  includeLegend: true,
  includeWatermark: false,
};

export const PRESET_SIZES: Record<string, { width: number; height: number; name: string }> = {
  'fig-a4-landscape': { width: 3508, height: 2480, name: 'A4 横向 (300 DPI)' },
  'fig-a4-portrait': { width: 2480, height: 3508, name: 'A4 纵向 (300 DPI)' },
  'fig-slide-16-9': { width: 1920, height: 1080, name: '幻灯片 16:9 (96 DPI)' },
  'fig-square-hd': { width: 2048, height: 2048, name: '方形 HD' },
  'fig-prl-single': { width: 2400, height: 1800, name: 'PRL 单栏' },
  'fig-prl-double': { width: 4800, height: 3200, name: 'PRL 双栏' },
};

function pixelRatioForDpi(dpi: number): number {
  const baseDpi = 96;
  return dpi / baseDpi;
}

function buildExportOptions(config: ExportConfig): Options {
  const pixelRatio = pixelRatioForDpi(config.dpi);
  return {
    width: config.width,
    height: config.height,
    pixelRatio,
    backgroundColor: config.backgroundColor || '#ffffff',
    cacheBust: true,
    style: {
      transform: `scale(${pixelRatio})`,
      transformOrigin: 'top left',
      width: `${config.width / pixelRatio}px`,
      height: `${config.height / pixelRatio}px`,
    },
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function nodeToDataURL(
  node: HTMLElement,
  config: ExportConfig,
): Promise<string> {
  const options = buildExportOptions(config);
  switch (config.format) {
    case 'png':
      return await toPng(node, options);
    case 'svg':
      return await toSvg(node, options);
    case 'jpeg':
      return await toJpeg(node, { ...options, quality: config.quality });
    case 'pdf':
      return await toPng(node, options);
  }
}

function getScopeElement(scope: ExportScope): HTMLElement | null {
  const map: Record<ExportScope, string> = {
    'main-view': '[data-export-scope="main-view"]',
    'all-views': '[data-export-scope="all-views"]',
    'analysis-only': '[data-export-scope="analysis"]',
    'workspace': '[data-export-scope="workspace"]',
  };
  return document.querySelector(map[scope]);
}

export async function exportVisualization(
  config: Partial<ExportConfig> = {},
): Promise<void> {
  const fullConfig: ExportConfig = { ...DEFAULT_CONFIG, ...config };
  const node = getScopeElement(fullConfig.scope);
  if (!node) {
    throw new Error(`无法定位导出范围: ${fullConfig.scope}`);
  }
  const dataUrl = await nodeToDataURL(node, fullConfig);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `hepviz_${fullConfig.scope}_${timestamp}.${fullConfig.format}`;
  if (fullConfig.format === 'pdf') {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 72 / 96;
      const w = fullConfig.width * scale;
      const h = fullConfig.height * scale;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = fullConfig.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
      }
      const pdfData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pdfData;
      link.download = filename;
      link.click();
    };
    img.src = dataUrl;
    return;
  }
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  downloadBlob(blob, filename);
}

export interface ExportCanvasOptions {
  width: number;
  height: number;
  dpi: number;
  format: 'png' | 'jpeg';
  backgroundColor?: string;
}

export function renderThreeCanvasToImage(
  canvas: HTMLCanvasElement,
  options: ExportCanvasOptions,
): string {
  const { width, height, dpi, format, backgroundColor } = options;
  const scale = dpi / 96;
  const out = document.createElement('canvas');
  out.width = width * scale;
  out.height = height * scale;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('无法创建2D Canvas上下文');
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, out.width, out.height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL(`image/${format}`, 0.95);
}
