import Dexie from 'dexie';

const db = new Dexie('FeaturePilotDB');

db.version(1).stores({
  sessions: '++id, name, createdAt',
  features: '++id, sessionId, title, content',
  steps: '++id, sessionId, featureId, scenarioIndex, stepIndex, status, modifiedBy',
  activities: '++id, sessionId, timestamp' //also: user, message
});

db.version(2).stores({
  sessions: '++id, name, createdAt',
  features: '++id, sessionId, title, content',
  steps: '++id, sessionId, featureId, scenarioIndex, stepIndex, status, modifiedBy, duration, matchLocation',
  activities: '++id, sessionId, timestamp',
  attachments: '++id, sessionId, featureId, scenarioIndex, stepIndex, uploadedAt'
});

db.version(3).stores({
  sessions: '++id, name, createdAt',
  features: '++id, sessionId, title, content',
  steps: '[sessionId+featureId+scenarioIndex+stepIndex], [sessionId+featureId], sessionId, featureId',
  activities: '++id, sessionId, timestamp',
  attachments: '++id, sessionId, featureId, scenarioIndex, stepIndex, uploadedAt'
}).upgrade(tx => {
  // Clear existing data due to primary key change
  // Fine for demo
  return tx.table('steps').clear();
});

// Version 4: Support multiple file types (images, text, logs, JSON, XML, etc.)
// Fields: fileName, fileType (image/text/document), mimeType, imageData (base64)
db.version(4).stores({
  sessions: '++id, name, createdAt',
  features: '++id, sessionId, title, content',
  steps: '[sessionId+featureId+scenarioIndex+stepIndex], [sessionId+featureId], sessionId, featureId',
  activities: '++id, sessionId, timestamp',
  attachments: '++id, sessionId, featureId, scenarioIndex, stepIndex, uploadedAt, fileType'
});

// Version 5: Add comment field to features for custom notes
db.version(5).stores({
  sessions: '++id, name, createdAt',
  features: '++id, sessionId, title, content, comment',
  steps: '[sessionId+featureId+scenarioIndex+stepIndex], [sessionId+featureId], sessionId, featureId',
  activities: '++id, sessionId, timestamp',
  attachments: '++id, sessionId, featureId, scenarioIndex, stepIndex, uploadedAt, fileType'
});

export default db;