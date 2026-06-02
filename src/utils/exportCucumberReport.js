import db from '../db/indexedDb';
import { generateCucumberHtml } from './exportCucumberHtml';
import { exportAuditLog } from './exportAuditLog';
import parseFeature from './parseFeature';
import JSZip from 'jszip';


/**
 * Export a report as a Cucumber JSON report
 * @param {number} sessionId - The ID of the session containing the data to export as a report
 * @returns {Object} Cucumber-compliant JSON report
 */
export async function exportCucumberReport(sessionId) {
  // Fetch all features for this session
  const features = await db.features
    .where('sessionId')
    .equals(sessionId)
    .toArray();

  const cucumberReport = [];

  for (const feature of features) {
    // Parse the feature content
    let parsedFeature;
    try {
      parsedFeature = JSON.parse(feature.content);
    } catch {
      // If not JSON, skip metadata (was a plain .feature file)
      parsedFeature = parseFeature(feature.content);
    }

    console.log('parseFeature function:', parseFeature);
    console.log('parsedFeature result:', parsedFeature);

    // Fetch all steps for this feature
    const steps = await db.steps
      .where({ sessionId, featureId: feature.id })
      .toArray();
    
    console.log('Steps from DB:', steps);
    if (steps.length > 0) {
      console.log('First step example (full):', JSON.stringify(steps[0], null, 2));
      console.log('All step statuses:', steps.map((s, i) => `${i}: ${s.status}`));
    }

    // Fetch all attachments for this feature
    const images = await db.attachments
      .where({ sessionId, featureId: feature.id })
      .toArray();

    // Build scenarios (elements in Cucumber JSON)
    const elements = parsedFeature.scenarios.map((scenario, scenarioIndex) => {
      console.log(`\nProcessing scenario ${scenarioIndex}:`, scenario.title);
      console.log('Scenario steps:', scenario.steps);
      
      // Build steps for this scenario
      const scenarioSteps = scenario.steps.map((step, stepIndex) => {
        // Handle both old format (string) and new format (object)
        const stepText = typeof step === 'string' ? step : step.text;
        const docString = typeof step === 'object' ? step.docString : null;
        
        const stepKey = steps.find(
          s => s.scenarioIndex === scenarioIndex && s.stepIndex === stepIndex
        );
        
        console.log(`  Step ${stepIndex}: "${stepText}"`);
        console.log(`    Found stepKey:`, stepKey);
        console.log(`    Status: ${stepKey?.status}`);

        // Extract keyword and name from step text
        const match = stepText.match(/^(Given|When|Then|And|But)\s+(.+)$/);
        const keyword = match ? `${match[1]} ` : '';
        const name = match ? match[2] : stepText;

        // Build arguments array (for docStrings)
        const args = [];
        if (docString) {
          args.push({
            content: docString,
            line: stepIndex + 1 // Placeholder line number
          });
        }

        // Get all attachments (images and document files) for this step
        const stepAttachments = images.filter(
          img => img.scenarioIndex === scenarioIndex && img.stepIndex === stepIndex
        );

        // All attachments go into embeddings (Cucumber supports any MIME type)
        const embeddings = stepAttachments.map(attachment => ({
          data: attachment.imageData,
          mime_type: attachment.mimeType,
          ...(attachment.fileName && { name: attachment.fileName })
        }));

        // Determine match location based on step execution status
        let matchLocation = 'unknown';
        if (stepKey?.matchLocation) {
          // Preserve existing match location from imported reports
          matchLocation = stepKey.matchLocation;
        } else if (stepKey?.status && stepKey.status !== 'undo') {
          // Mark as 'manual' only if step has been executed (not undefined)
          matchLocation = 'manual';
        }

        return {
          arguments: args,
          keyword,
          line: stepIndex + 1, // Placeholder line number
          name,
          match: {
            location: matchLocation
          },
          result: {
            status: mapStatusToCucumber(stepKey?.status || 'unknown'),
            duration: stepKey?.duration || 0,
            ...(stepKey?.errorMessage && { error_message: stepKey.errorMessage })
          },
          ...(embeddings.length > 0 && { embeddings })
        };
      });

      return {
        id: `${feature.title.toLowerCase().replace(/\s+/g, '-')};${scenario.title.toLowerCase().replace(/\s+/g, '-')}`,
        keyword: 'Scenario',
        name: scenario.title,
        description: '',
        line: scenarioIndex + 1, // Placeholder line number
        type: 'scenario',
        tags: scenario.tags || [],
        steps: scenarioSteps
      };
    });

    cucumberReport.push({
      keyword: 'Feature',
      name: parsedFeature.title,
      description: parsedFeature.description || '',
      line: 1,
      id: feature.title.toLowerCase().replace(/\s+/g, '-'),
      tags: [],
      uri: parsedFeature.uri || `features/${feature.title}.feature`,
      elements,
      // Custom field for feature comment (non-standard but allowed)
      ...(feature.comment && { comment: feature.comment })
    });
  }

  return cucumberReport;
}

/**
 * Map internal status to Cucumber status
 */
function mapStatusToCucumber(status) {
  const statusMap = {
    'pass': 'passed',
    'passed': 'passed',
    'fail': 'failed',
    'failed': 'failed',
    'skip': 'skipped',
    'skipped': 'skipped',
    'undo': 'undefined',
    'unknown': 'undefined'
  };
  
  return statusMap[status] || 'undefined';
}

/**
 * Download the Cucumber report as a ZIP file containing JSON, HTML, and audit log
 * All attachments are embedded in the JSON (in the embeddings array)
 */
export async function downloadCucumberReport(sessionId) {
  const report = await exportCucumberReport(sessionId);
  const json = JSON.stringify(report, null, 2);
  
  // Generate HTML report
  const html = await generateCucumberHtml(report);
  
  // Export audit log as text
  const auditLog = await exportAuditLog(sessionId);
  
  // Create ZIP file
  const zip = new JSZip();
  zip.file(`cucumber-report-${sessionId}.json`, json);
  zip.file(`cucumber-report-${sessionId}.html`, html);
  zip.file(`audit-log-${sessionId}.txt`, auditLog);
  
  // Generate ZIP blob
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  // Download ZIP file
  const zipUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = zipUrl;
  link.download = `cucumber-report-${sessionId}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(zipUrl);
}
