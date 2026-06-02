import db from '../db/indexedDb';
import { exportCucumberJson } from './exportCucumberJson';
import { exportCucumberHtml } from './exportCucumberHtml';
import { exportAuditLog } from './exportAuditLog';
import JSZip from 'jszip';

/**
 * Download the Cucumber report as a ZIP file containing JSON, HTML, and audit log
 * All attachments are embedded in the JSON (in the embeddings array)
 */
export async function downloadCucumberReport(sessionId, user = null) {
  const report = await exportCucumberJson(sessionId);
  const json = JSON.stringify(report, null, 2);
  
  // Get session name
  const session = await db.sessions.get(sessionId);
  const sessionName = session?.name || 'Unknown Session';
  
  // Generate HTML report
  const html = await exportCucumberHtml(report, user, sessionName);
  
  // Export audit log as text
  const auditLog = await exportAuditLog(sessionId);
  
  // Create ZIP file
  const zip = new JSZip();
  zip.file(`featurepilot-report-${sessionId}.json`, json);
  zip.file(`featurepilot-report-${sessionId}.html`, html);
  zip.file(`audit-log-${sessionId}.txt`, auditLog);
  
  // Generate ZIP blob
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  // Download ZIP file
  const zipUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = zipUrl;
  link.download = `featurepilot-report-${sessionId}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(zipUrl);
}

