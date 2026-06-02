export default function parseFeature(text) {
  const lines = text.split('\n');
  let title = 'Untitled Feature';
  let featureTags = [];
  let description = '';
  let descriptionLines = [];
  let lastTags = [];

  // Collect feature-level tags (before Feature:)
  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();
    if (trimmedLine.startsWith('Feature:')) {
      title = trimmedLine.replace('Feature:', '').trim();
      break;
    }
    if (trimmedLine.startsWith('@')) {
      featureTags = trimmedLine.split(/\s+/).filter(t => t.startsWith('@'));
    }
  }

  // Extract feature description (lines between Feature: and first Background/Scenario), only non-comment, non-blank lines
  let afterFeature = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();
    if (!afterFeature) {
      if (trimmedLine.startsWith('Feature:')) {
        afterFeature = true;
      }
      continue;
    }
    if (
      trimmedLine.startsWith('Background:') ||
      trimmedLine.startsWith('Scenario:') ||
      trimmedLine.startsWith('Scenario Outline:') ||
      trimmedLine.startsWith('@')
    ) {
      break;
    }
    if (trimmedLine.length > 0 && !trimmedLine.startsWith('#')) {
      descriptionLines.push(trimmedLine);
    }
  }
  description = descriptionLines.join('\n');

  // Extract Background steps
  let background = null;
  let inBackground = false;
  const scenarios = [];
  let currentScenario = null;
  let inScenarioOutline = false;
  let scenarioOutline = null;
  let examplesHeader = null;
  let examplesRows = [];
  let collectingExamples = false;
  let collectingDocString = false;
  let docStringLines = [];
  let pendingStep = null;
  lastTags = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Handle DocString collection
    if (collectingDocString) {
      if (line === '"""' || line === "'''") {
        // End of DocString
        collectingDocString = false;
        if (pendingStep) {
          pendingStep.docString = docStringLines.join('\n');
          pendingStep = null;
        }
        docStringLines = [];
        continue;
      } else {
        // Collect DocString lines (preserve original indentation within the docstring)
        const originalLine = lines[i];
        // Remove leading whitespace but preserve relative indentation
        const trimmedOriginal = originalLine.replace(/^\s+/, '');
        docStringLines.push(trimmedOriginal);
        continue;
      }
    }
    
    // Check for DocString start after we've added a step
    if (line === '"""' || line === "'''") {
      collectingDocString = true;
      docStringLines = [];
      continue;
    }
    
    if (line.startsWith('@')) {
      lastTags = line.split(/\s+/).filter(t => t.startsWith('@'));
      continue;
    }
    if (line.startsWith('Background:')) {
      inBackground = true;
      background = {
        title: 'Background',
        steps: []
      };
      continue;
    }
    if (line.startsWith('Scenario Outline:')) {
      inBackground = false;
      if (currentScenario) {
        scenarios.push(currentScenario);
      }
      if (scenarioOutline) {
        if (examplesHeader && examplesRows.length > 0) {
          scenarios.push(...expandScenarioOutline(scenarioOutline, examplesHeader, examplesRows, lastTags));
        }
      }
      inScenarioOutline = true;
      scenarioOutline = {
        title: line.replace('Scenario Outline:', '').trim(),
        steps: [],
        tags: lastTags
      };
      examplesHeader = null;
      examplesRows = [];
      collectingExamples = false;
      lastTags = [];
      continue;
    }
    if (line.startsWith('Scenario:')) {
      inBackground = false;
      if (currentScenario) {
        scenarios.push(currentScenario);
      }
      if (scenarioOutline) {
        if (examplesHeader && examplesRows.length > 0) {
          scenarios.push(...expandScenarioOutline(scenarioOutline, examplesHeader, examplesRows, lastTags));
        }
        scenarioOutline = null;
        examplesHeader = null;
        examplesRows = [];
        collectingExamples = false;
        inScenarioOutline = false;
      }
      currentScenario = {
        title: line.replace('Scenario:', '').trim(),
        steps: [],
        tags: lastTags
      };
      lastTags = [];
      continue;
    }
    if (inScenarioOutline) {
      if (/^(Given|When|Then|And|But)/.test(line)) {
        const step = { text: line };
        scenarioOutline.steps.push(step);
        pendingStep = step;
      } else if (line.startsWith('Examples:')) {
        collectingExamples = true;
      } else if (collectingExamples && line.startsWith('|')) {
        const row = line.split('|').slice(1, -1).map(cell => cell.trim());
        if (!examplesHeader) {
          examplesHeader = row;
        } else {
          examplesRows.push(row);
        }
      } else if (collectingExamples && !line.startsWith('|') && line !== '') {
        collectingExamples = false;
      }
      continue;
    }
    if (/^(Given|When|Then|And|But)/.test(line)) {
      const step = { text: line };
      if (inBackground) {
        background?.steps.push(step);
        pendingStep = step;
      } else {
        currentScenario?.steps.push(step);
        pendingStep = step;
      }
    }
  }
  if (scenarioOutline && examplesHeader && examplesRows.length > 0) {
    scenarios.push(...expandScenarioOutline(scenarioOutline, examplesHeader, examplesRows, scenarioOutline.tags));
  }
  if (currentScenario) {
    scenarios.push(currentScenario);
  }
  return {
    title,
    description,
    background,
    scenarios,
    tags: featureTags
  };
}

// Helper to expand scenario outlines
function expandScenarioOutline(outline, header, rows, tags) {
  // outline: { title, steps, tags }
  // header: [var1, var2, ...]
  // rows: [[val1, val2, ...], ...]
  const scenarios = [];
  for (const row of rows) {
    let scenarioTitle = outline.title;
    let steps = outline.steps.map(step => {
      // step is now an object with {text, docString?}
      let newStepText = step.text;
      let newDocString = step.docString;
      header.forEach((h, idx) => {
        newStepText = newStepText.replaceAll(`<${h.trim()}>`, row[idx]);
        if (newDocString) {
          newDocString = newDocString.replaceAll(`<${h.trim()}>`, row[idx]);
        }
      });
      const newStep = { text: newStepText };
      if (newDocString) {
        newStep.docString = newDocString;
      }
      return newStep;
    });
    scenarios.push({ title: scenarioTitle, steps, tags: tags || outline.tags || [] });
  }
  return scenarios;
}