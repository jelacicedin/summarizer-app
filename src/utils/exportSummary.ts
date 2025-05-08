import fs from 'fs';
import path from 'path';

export function exportStage3Summary(summary: string, pdfPath: string): void {
  const pdfDir = path.dirname(pdfPath);
  const pdfName = path.basename(pdfPath, path.extname(pdfPath));
  const exportPath = path.join(pdfDir, `${pdfName}_stage3_summary.md`);

  fs.writeFile(exportPath, `# Stage 3 Summary\n\n${summary}`, 'utf8', (err) => {
    if (err) {
      console.error('Failed to export summary:', err);
    } else {
      console.log(`Stage 3 summary exported to ${exportPath}`);
    }
  });
}