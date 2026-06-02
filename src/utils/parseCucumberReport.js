/**
 * Parse a Cucumber JSON report and convert it to the same format as parseFeature.js
 * This allows both .feature files and Cucumber reports to be processed uniformly
 */
export default function parseCucumberReport(jsonData) {
  // Parse JSON if it's a string
  const report = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
  
  // Cucumber reports are arrays of features
  if (!Array.isArray(report)) {
    throw new Error('Invalid Cucumber report format: expected an array');
  }

  // Process all features in the report
  const features = report.map(feature => parseFeature(feature));
  
  return features;
}

/**
 * Parse a single feature from the Cucumber report
 */
function parseFeature(featureData) {
  const title = featureData.name || 'Untitled Feature';
  const scenarios = [];
  
  // Process each scenario (called "elements" in Cucumber JSON)
  if (featureData.elements && Array.isArray(featureData.elements)) {
    featureData.elements.forEach(element => {
      // Only process scenarios (not hooks or backgrounds)
      if (element.type === 'scenario') {
        const scenario = parseScenario(element);
        if (scenario) {
          scenarios.push(scenario);
        }
      }
    });
  }
  
  // Convert feature-level tags (array of {name, line}) to array of strings
  let featureTags = [];
  if (Array.isArray(featureData.tags)) {
    featureTags = featureData.tags.map(t => typeof t === 'string' ? t : t.name || '');
  }
  return {
    title,
    scenarios,
    uri: featureData.uri, // Preserve original feature file path
    description: featureData.description || '',
    tags: featureTags,
    comment: featureData.comment || '' // Import custom comment field if present
  };
}

/**
 * Map Cucumber status to internal app status
 */
function mapCucumberStatusToInternal(cucumberStatus) {
  const statusMap = {
    'passed': 'pass',
    'failed': 'fail',
    'skipped': 'skip',
    'pending': 'undo',
    'undefined': 'undo',
    'ambiguous': 'fail'
  };
  
  return statusMap[cucumberStatus] || 'undo';
}

/**
 * Parse a single scenario from the Cucumber report
 */
function parseScenario(scenarioData) {
  const title = scenarioData.name || 'Untitled Scenario';
  const steps = [];
  const stepMetadata = [];
  const images = [];
  
  if (scenarioData.steps && Array.isArray(scenarioData.steps)) {
    scenarioData.steps.forEach((step, index) => {
      // Skip hidden steps (Before/After hooks)
      if (step.hidden) {
        return;
      }
      
      // Build step object with text
      const stepText = `${step.keyword}${step.name}`;
      const stepObj = { text: stepText };
      
      // Extract docString from arguments array
      if (step.arguments && Array.isArray(step.arguments) && step.arguments.length > 0) {
        const docStringArg = step.arguments.find(arg => arg.content !== undefined);
        if (docStringArg) {
          stepObj.docString = docStringArg.content;
        }
      }
      
      steps.push(stepObj);
      
      // Extract metadata
      const metadata = {
        status: mapCucumberStatusToInternal(step.result?.status || 'unknown'),
        duration: step.result?.duration || null,
        errorMessage: step.result?.error_message || null,
        matchLocation: step.match?.location || null
      };
      stepMetadata.push(metadata);
      
      // Extract embedded images (screenshots, etc.)
      if (step.embeddings && Array.isArray(step.embeddings)) {
        step.embeddings.forEach(embedding => {
          if (embedding.mime_type && embedding.mime_type.startsWith('image/')) {
            images.push({
              stepIndex: index,
              imageData: embedding.data, // base64 data
              mimeType: embedding.mime_type
            });
          }
        });
      }
    });
  }
  
  // Convert scenario-level tags (array of {name, line}) to array of strings
  let scenarioTags = [];
  if (Array.isArray(scenarioData.tags)) {
    scenarioTags = scenarioData.tags.map(t => typeof t === 'string' ? t : t.name || '');
  }
  return {
    title,
    steps,
    stepMetadata,
    images,
    tags: scenarioTags
  };
}

/**
 * Extract all images from a parsed report
 * Returns a flat array of images with feature/scenario context
 */
export function extractAllImages(parsedFeatures) {
  const allImages = [];
  
  parsedFeatures.forEach((feature, featureIndex) => {
    feature.scenarios.forEach((scenario, scenarioIndex) => {
      if (scenario.images && scenario.images.length > 0) {
        scenario.images.forEach(image => {
          allImages.push({
            ...image,
            featureIndex,
            scenarioIndex,
            featureTitle: feature.title,
            scenarioTitle: scenario.title
          });
        });
      }
    });
  });
  
  return allImages;
}
