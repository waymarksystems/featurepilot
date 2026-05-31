import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, ButtonGroup, Image, Badge } from 'react-bootstrap';
import { FaCheckCircle, FaTimesCircle, FaForward, FaQuestionCircle, FaPaperclip, FaPencilAlt, FaFile, FaFileAlt, FaFileCode, FaFileCsv, FaFilePdf } from 'react-icons/fa';
import DragDropZone from '../components/DragDropZone';
import FeatureSidebar from '../components/FeatureSidebar';
import db from '../db/indexedDb';
import parseFeature from '../utils/parseFeature';
import parseCucumberReport from '../utils/parseCucumberReport';
import { downloadCucumberReport } from '../utils/exportCucumberReport';
import { auth } from '../firebase';

function SessionViewer() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [features, setFeatures] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [stepResults, setStepResults] = useState({});
  const [stepMetadata, setStepMetadata] = useState({});
  const [scenarioImages, setScenarioImages] = useState({});
  const [dragOverStep, setDragOverStep] = useState(null);
  const [featureComment, setFeatureComment] = useState('');
  const [commentExpanded, setCommentExpanded] = useState(false);
  const [attachmentTarget, setAttachmentTarget] = useState(null);
  const [featureNameEditing, setFeatureNameEditing] = useState(false);
  const [featureNameValue, setFeatureNameValue] = useState('');
  const uploadZoneRef = useRef(null);
  const fileInputRef = useRef(null);

  // Helper function to get React icon component for file types
  const getFileIcon = (mimeType) => {
    if (!mimeType) return FaFile;
    if (mimeType.includes('json')) return FaFileCode;
    if (mimeType.includes('xml')) return FaFileCode;
    if (mimeType.includes('csv')) return FaFileCsv;
    if (mimeType.includes('yaml')) return FaFileCode;
    if (mimeType.includes('pdf')) return FaFilePdf;
    if (mimeType.includes('text')) return FaFileAlt;
    return FaFile;
  };

  // Helper function to truncate long filenames
  const truncateFileName = (fileName, maxLength = 20) => {
    if (!fileName || fileName.length <= maxLength) return fileName;
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    if (nameWithoutExt.length + extension.length <= maxLength) return fileName;
    const charsToShow = maxLength - extension.length - 3; // 3 for '...'
    const frontChars = Math.ceil(charsToShow / 2);
    const backChars = Math.floor(charsToShow / 2);
    return nameWithoutExt.substring(0, frontChars) + '...' + nameWithoutExt.substring(nameWithoutExt.length - backChars) + extension;
  };

  useEffect(() => {
    const fetchData = async () => {
      // Reset selected feature when session changes
      setSelectedFeature(null);
      setParsed(null);
      setStepResults({});
      setStepMetadata({});
      setScenarioImages({});
      setFeatureComment('');
      setCommentExpanded(false);
      setAttachmentTarget(null);
      setFeatureNameEditing(false);
      setFeatureNameValue('');
      setAttachmentTarget(null);
      setFeatureNameEditing(false);
      setFeatureNameValue('');
      const loaded = await db.features
        .where('sessionId')
        .equals(Number(sessionId))
        .toArray();
      setFeatures(loaded);
    };

    fetchData();
  }, [sessionId]);
      const loaded = await db.features
        .where('sessionId')
        .equals(Number(sessionId))
        .toArray();
      setFeatures(loaded);
    };

    fetchData();
  }, [sessionId]);

  const handleFileUpload = async (files) => {
    for (const file of files) {
      if (file.type === 'cucumber-report') {
        // Parse Cucumber JSON report
        const parsedFeatures = parseCucumberReport(file.content);
        
        // Store each feature from the report
        for (const parsedFeature of parsedFeatures) {
          // Create feature record
          const featureId = await db.features.add({
            sessionId: Number(sessionId),
            title: parsedFeature.title,
            content: JSON.stringify(parsedFeature), // Store parsed data as content
            comment: parsedFeature.comment || '' // Import comment field if present
          });

          // Store steps with metadata
          for (let sIdx = 0; sIdx < parsedFeature.scenarios.length; sIdx++) {
            const scenario = parsedFeature.scenarios[sIdx];
            
            for (let stepIdx = 0; stepIdx < scenario.steps.length; stepIdx++) {
              const metadata = scenario.stepMetadata?.[stepIdx] || {};
              
              await db.steps.add({
                sessionId: Number(sessionId),
                featureId,
                scenarioIndex: sIdx,
                stepIndex: stepIdx,
                status: metadata.status || 'undo',
                modifiedBy: 'Imported from report',
                duration: metadata.duration,
                errorMessage: metadata.errorMessage,
                matchLocation: metadata.matchLocation
              });
            }

            // Store attachments from the report
            if (scenario.images && scenario.images.length > 0) {
              for (const image of scenario.images) {
                await db.attachments.add({
                  sessionId: Number(sessionId),
                  featureId,
                  scenarioIndex: sIdx,
                  stepIndex: image.stepIndex,
                  imageData: image.imageData,
                  mimeType: image.mimeType,
                  uploadedAt: new Date().toISOString()
                });
              }
            }
          }
        }
      } else {
        // Handle regular .feature file
        await db.features.add({
          sessionId: Number(sessionId),
          title: file.name,
          content: file.content
        });
      }
    }

    // Reload features
    const loaded = await db.features
      .where('sessionId')
      .equals(Number(sessionId))
      .toArray();
    setFeatures(loaded);
  };

  const handleSelectFeature = async (feature) => {
    setSelectedFeature(feature);
    
    // Load feature comment and expand if it exists
    setFeatureComment(feature.comment || '');
    setCommentExpanded(!!feature.comment);
    
    // Check if content is JSON (from Cucumber report) or plain text (.feature file)
    let parsedFeature;
    try {
      const jsonContent = JSON.parse(feature.content);
      // If it parses as JSON, it's from a Cucumber report
      parsedFeature = jsonContent;
    } catch {
      // Otherwise, parse as .feature file
      parsedFeature = parseFeature(feature.content);
    }
    
    setParsed(parsedFeature);

    const steps = await db.steps
      .where({ sessionId: Number(sessionId), featureId: feature.id })
      .toArray();

    const mapped = {};
    const metadata = {};
    steps.forEach(s => {
      const key = `${s.scenarioIndex}-${s.stepIndex}`;
      mapped[key] = s.status;
      metadata[key] = {
        duration: s.duration,
        errorMessage: s.errorMessage,
        matchLocation: s.matchLocation
      };
    });

    setStepResults(mapped);
    setStepMetadata(metadata);

    // Load attachments for this feature
    const images = await db.attachments
      .where({ sessionId: Number(sessionId), featureId: feature.id })
      .toArray();

    const imagesByScenario = {};
    images.forEach(img => {
      const key = `${img.scenarioIndex}-${img.stepIndex}`;
      if (!imagesByScenario[key]) {
        imagesByScenario[key] = [];
      }
      imagesByScenario[key].push(img);
    });

    setScenarioImages(imagesByScenario);
  };

  const handleMarkStep = async (scenarioIndex, stepIndex, status) => {
    console.log('handleMarkStep called:', { scenarioIndex, stepIndex, status });
    const key = `${scenarioIndex}-${stepIndex}`;
    const currentStatus = stepResults[key];

    if (currentStatus === status) {
      status = 'undo';
    }

    const currentUser = auth.currentUser;

    const stepData = {
      sessionId: Number(sessionId),
      featureId: selectedFeature.id,
      scenarioIndex,
      stepIndex,
      status,
      modifiedBy: currentUser?.displayName || currentUser?.email || 'Unknown'
    };
    
    console.log('Saving step to DB:', stepData);

    try {
      await db.steps.put(stepData);
      console.log('Step saved successfully');
    } catch (error) {
      console.error('Error saving step:', error);
    }

    await logActivity(`Marked step ${scenarioIndex + 1}.${stepIndex + 1} as "${status}"`);

    setStepResults(prev => ({
      ...prev,
      [key]: status
    }));
  };

  const handleMarkAllInScenario = async (scenarioIndex, status) => {
    console.log('handleMarkAllInScenario called:', { scenarioIndex, status });
    const stepCount = parsed?.scenarios?.[scenarioIndex]?.steps?.length || 0;
    console.log(`Marking ${stepCount} steps in scenario ${scenarioIndex}`);
    const currentUser = auth.currentUser;

    const updates = [];
    for (let stepIndex = 0; stepIndex < stepCount; stepIndex++) {
      updates.push({
        sessionId: Number(sessionId),
        featureId: selectedFeature.id,
        scenarioIndex,
        stepIndex,
        status,
        modifiedBy: currentUser?.displayName || currentUser?.email || 'Unknown'
      });
    }

    console.log('Bulk saving steps to DB:', updates);

    try {
      await db.steps.bulkPut(updates);
      console.log('All steps saved successfully');
    } catch (error) {
      console.error('Error saving steps:', error);
    }

    await logActivity(`Marked all steps in Scenario ${scenarioIndex + 1} as "${status}"`);

    setStepResults(prev => {
      const updated = { ...prev };
      for (let stepIndex = 0; stepIndex < stepCount; stepIndex++) {
        const key = `${scenarioIndex}-${stepIndex}`;
        updated[key] = status;
      }
      return updated;
    });
  };

  const handleDeleteSession = async () => {
    if (!window.confirm('Are you sure you want to delete this session and all associated data?')) return;

    const id = Number(sessionId);
    await db.steps.where('sessionId').equals(id).delete();
    await db.features.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);

    navigate('/');
  };

  const handleDeleteFeature = async (featureId, featureTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${featureTitle}"?`)) return;

    // Delete all related data
    await db.steps.where({ sessionId: Number(sessionId), featureId }).delete();
    await db.attachments.where({ sessionId: Number(sessionId), featureId }).delete();
    await db.features.delete(featureId);

    // Update local state
    setFeatures(prev => prev.filter(f => f.id !== featureId));
    
    // If this was the selected feature, deselect it
    if (selectedFeature?.id === featureId) {
      setSelectedFeature(null);
      setParsed(null);
    }

    await logActivity(`Deleted feature: ${featureTitle}`);
  };

  const handleExportReport = async () => {
    try {
      await downloadCucumberReport(Number(sessionId));
      await logActivity('Exported report as Cucumber report');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report. See console for details.');
    }
  };

  const getStepStyle = (status) => {
    switch (status) {
      case 'pass': return { backgroundColor: '#d4edda' };
      case 'fail': return { backgroundColor: '#f8d7da' };
      case 'skip': return { backgroundColor: '#fff3cd' };
      default: return {};
    }
  };

  const highlightKeyword = (text) => {
    if (!text) return null;
    const words = text.split(' ');
    const firstWord = words.shift();
    return (
      <span>
        <span style={{ color: '#0056b3', fontWeight: 'bold' }}>{firstWord}</span>{' '}
        {words.join(' ')}
      </span>
    );
  };

  const logActivity = async (message) => {
    const user = auth.currentUser;

    await db.activities.add({
      sessionId: Number(sessionId),
      timestamp: new Date().toISOString(),
      user: user?.displayName || user?.email || 'Unknown',
      message
    });
  };

  const handleSaveComment = async (comment) => {
    if (!selectedFeature) return;
    
    await db.features.update(selectedFeature.id, { comment });
    setFeatureComment(comment);
    
    // Update the selectedFeature object
    setSelectedFeature(prev => ({ ...prev, comment }));
    
    // Update the features array to keep it in sync
    setFeatures(prev => prev.map(f => 
      f.id === selectedFeature.id ? { ...f, comment } : f
    ));
    
    await logActivity(`Updated feature comment`);
  };

  const handleStartEditFeatureName = () => {
    // Use persisted title from selectedFeature to avoid stale data
    setFeatureNameValue(selectedFeature?.title || parsed.title);
    setFeatureNameEditing(true);
  };

  const handleSaveFeatureName = async () => {
    if (!selectedFeature) return;

    const trimmed = featureNameValue.trim();
    if (!trimmed) {
      setFeatureNameValue(selectedFeature.title || '');
      setFeatureNameEditing(false);
      return;
    }

    const newTitle = trimmed;
    // Short-circuit if title hasn't changed
    if (newTitle === selectedFeature.title) {
      setFeatureNameEditing(false);
      return;
    }

    // Update content: either JSON or .feature text
    let newContent = selectedFeature.content;
    try {
      // Try JSON first (Cucumber report)
      const jsonContent = JSON.parse(selectedFeature.content);
      jsonContent.title = newTitle;
      newContent = JSON.stringify(jsonContent, null, 2);
    } catch {
      // Otherwise, replace Feature: line in .feature text
      newContent = selectedFeature.content.replace(
        /^(\s*)Feature:\s*.*/m,
        `$1Feature: ${newTitle}`
      );
    }

    await db.features.update(selectedFeature.id, { title: newTitle, content: newContent });
    setParsed(prev => ({ ...prev, title: newTitle }));
    setSelectedFeature(prev => ({ ...prev, title: newTitle, content: newContent }));
    setFeatures(prev => prev.map(f =>
      f.id === selectedFeature.id ? { ...f, title: newTitle, content: newContent } : f
    ));
    setFeatureNameEditing(false);
    await logActivity(`Updated feature name to "${newTitle}"`);
  };

  const handleBackToUpload = () => {
    setSelectedFeature(null);
    setParsed(null);
    // Scroll to upload zone
    setTimeout(() => {
      uploadZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDeleteImage = async (imageId, scenarioIndex, stepIndex) => {
    await db.attachments.delete(imageId);
    
    // Reload attachments
    const images = await db.attachments
      .where({ sessionId: Number(sessionId), featureId: selectedFeature.id })
      .toArray();

    const imagesByScenario = {};
    images.forEach(img => {
      const key = `${img.scenarioIndex}-${img.stepIndex}`;
      if (!imagesByScenario[key]) {
        imagesByScenario[key] = [];
      }
      imagesByScenario[key].push(img);
    });

    setScenarioImages(imagesByScenario);
    
    await logActivity(`Deleted image from step ${scenarioIndex + 1}.${stepIndex + 1}`);
  };

  const handleDragOver = (e, scenarioIndex, stepIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStep(`${scenarioIndex}-${stepIndex}`);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStep(null);
  };

  const handleDrop = async (e, scenarioIndex, stepIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStep(null);

    const files = Array.from(e.dataTransfer.files);
    // Support images and various document types
    const validFiles = files.filter(file => {
      return file.type.startsWith('image/') || 
             file.type === 'text/plain' ||
             file.type === 'application/json' ||
             file.type === 'application/xml' ||
             file.type === 'text/xml' ||
             file.type === 'text/csv' ||
             file.type === 'application/yaml' ||
             file.type === 'text/yaml' ||
             file.type === 'application/pdf' ||
             file.name.match(/\.(txt|log|json|xml|csv|ya?ml|pdf)$/i);
    });
    
    if (validFiles.length === 0) {
      return;
    }

    // Read all files as base64
    const fileReads = validFiles.map(file => 
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = e.target.result.split(',')[1];
          const fileType = file.type.startsWith('image/') ? 'image' : 'document';
          
          resolve({
            sessionId: Number(sessionId),
            featureId: selectedFeature.id,
            scenarioIndex,
            stepIndex,
            fileName: file.name,
            fileType: fileType,
            imageData: base64Data,
            mimeType: file.type,
            uploadedAt: new Date().toISOString()
          });
        };
        reader.readAsDataURL(file);
      })
    );

    const fileData = await Promise.all(fileReads);
    
    // Add all files to database
    await db.attachments.bulkAdd(fileData);

    // Reload attachments
    const images = await db.attachments
      .where({ sessionId: Number(sessionId), featureId: selectedFeature.id })
      .toArray();

    const imagesByScenario = {};
    images.forEach(img => {
      const key = `${img.scenarioIndex}-${img.stepIndex}`;
      if (!imagesByScenario[key]) {
        imagesByScenario[key] = [];
      }
      imagesByScenario[key].push(img);
    });

    setScenarioImages(imagesByScenario);
    
    const fileTypeText = validFiles.length === 1 
      ? (validFiles[0].type.startsWith('image/') ? 'image' : 'text file')
      : `${validFiles.length} files`;
    await logActivity(`Added ${fileTypeText} to step ${scenarioIndex + 1}.${stepIndex + 1}`);
  };

  const handleAttachmentClick = (scenarioIndex, stepIndex) => {
    setAttachmentTarget({ scenarioIndex, stepIndex });
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e) => {
    if (!attachmentTarget || !e.target.files?.length) {
      setAttachmentTarget(null);
      return;
    }

    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      return file.type.startsWith('image/') ||
             file.type === 'text/plain' ||
             file.type === 'application/json' ||
             file.type === 'application/xml' ||
             file.type === 'text/xml' ||
             file.type === 'text/csv' ||
             file.type === 'application/yaml' ||
             file.type === 'text/yaml' ||
             file.type === 'application/pdf' ||
             file.name.match(/\.(txt|log|json|xml|csv|ya?ml|pdf)$/i);
    });

    if (validFiles.length === 0) {
      setAttachmentTarget(null);
      return;
    }

    const { scenarioIndex, stepIndex } = attachmentTarget;

    const fileReads = validFiles.map(file =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = e.target.result.split(',')[1];
          const fileType = file.type.startsWith('image/') ? 'image' : 'document';

          resolve({
            sessionId: Number(sessionId),
            featureId: selectedFeature.id,
            scenarioIndex,
            stepIndex,
            fileName: file.name,
            fileType: fileType,
            imageData: base64Data,
            mimeType: file.type,
            uploadedAt: new Date().toISOString()
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      })
    );

    const fileData = (await Promise.all(fileReads)).filter(Boolean);
    if (fileData.length === 0) {
      setAttachmentTarget(null);
      e.target.value = '';
      return;
    }
    await db.attachments.bulkAdd(fileData);

    const images = await db.attachments
      .where({ sessionId: Number(sessionId), featureId: selectedFeature.id })
      .toArray();

    const imagesByScenario = {};
    images.forEach(img => {
      const key = `${img.scenarioIndex}-${img.stepIndex}`;
      if (!imagesByScenario[key]) {
        imagesByScenario[key] = [];
      }
      imagesByScenario[key].push(img);
    });

    setScenarioImages(imagesByScenario);

    const fileTypeText = validFiles.length === 1
      ? (validFiles[0].type.startsWith('image/') ? 'image' : 'text file')
      : `${validFiles.length} files`;
    await logActivity(`Added ${fileTypeText} to step ${scenarioIndex + 1}.${stepIndex + 1}`);

    setAttachmentTarget(null);
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex' }}>
      <style>{`
        .image-container .delete-image-btn {
          opacity: 0;
          transition: opacity 0.2s, color 0.2s;
        }
        .image-container:hover .delete-image-btn {
          opacity: 1 !important;
        }
        .delete-image-btn:hover {
          color: #bd2130 !important;
        }
        .step-drag-over {
          background-color: #e3f2fd !important;
          border: 2px dashed #2196f3 !important;
          padding: 8px;
          border-radius: 4px;
        }
        .btn-step-action {
          transition: all 0.2s;
        }
        .btn-step-action.btn-pass-hint:hover {
          background-color: #28a745 !important;
          opacity: 0.85 !important;
          border-color: #28a745 !important;
          color: white !important;
        }
        .btn-step-action.btn-fail-hint:hover {
          background-color: #dc3545 !important;
          opacity: 0.85 !important;
          border-color: #dc3545 !important;
          color: white !important;
        }
        .btn-step-action.btn-skip-hint:hover {
          background-color: #ffc107 !important;
          opacity: 0.9 !important;
          border-color: #ffc107 !important;
          color: #212529 !important;
        }
        .btn-step-action.btn-undo-hint:hover {
          background-color: #17a2b8 !important;
          opacity: 0.85 !important;
          border-color: #17a2b8 !important;
          color: white !important;
        }
      `}</style>
      <div className="d-flex flex-column border-end pe-2" style={{ width: '300px', flexShrink: 0 }}>
        <FeatureSidebar
          features={features}
          selectedId={selectedFeature?.id}
          onSelect={handleSelectFeature}
          onDelete={handleDeleteFeature}
        />
      </div>

      <div className="p-4 flex-grow-1" style={{ minWidth: 0 }}>
        <div className="d-flex justify-content-between align-items-center">
          <h2 
            onClick={handleBackToUpload}
            style={{ cursor: 'pointer' }}
            title="Click to add more features"
          >
            Session #{sessionId}
          </h2>
          <div className="d-flex gap-2">
            <Button variant="primary" size="sm" onClick={handleExportReport}>
              Export Report
            </Button>
            <Button variant="outline-danger" size="sm" onClick={handleDeleteSession}>
              Delete Session
            </Button>
          </div>
        </div>

        {features.length === 0 && (
          <div className="mt-4 text-muted">
            <p>No features added yet. Add some .feature files.</p>
          </div>
        )}

        {features.length > 0 && !selectedFeature && (
          <div className="mt-4 text-muted">
            <p>Select a feature to begin testing.</p>
          </div>
        )}

        {parsed && (
          <div className="mt-4">
            <div className="mb-2">
              <h4 className="mb-0 d-inline" style={{ lineHeight: 1.2 }}>
                Feature: {featureNameEditing ? (
                  <input
                    type="text"
                    className="form-control form-control-sm d-inline-block"
                    style={{ width: '400px' }}
                    value={featureNameValue}
                    onChange={(e) => setFeatureNameValue(e.target.value)}
                    onBlur={handleSaveFeatureName}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveFeatureName()}
                    autoFocus
                  />
                ) : (
                  <>
                    {parsed.title}
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 ms-2 text-decoration-none"
                      onClick={handleStartEditFeatureName}
                      title="Edit feature name"
                      aria-label="Edit feature name"
                    >
                      <FaPencilAlt />
                    </Button>
                  </>
                )}
                {parsed.tags && parsed.tags.length > 0 && (
                  <span className="ms-2">
                    {parsed.tags.map((tag, i) => (
                      <Badge key={i} bg="secondary" className="ms-1" style={{ fontSize: '0.5em', fontWeight: 500}}>
                        {typeof tag === 'string' ? tag : tag?.name || JSON.stringify(tag)}
                      </Badge>
                    ))}
                  </span>
                )}
              </h4>
            </div>
            
            {/* Feature Comment Section */}
            <div className="mb-3">
              <Button
                variant="link"
                size="sm"
                onClick={() => setCommentExpanded(!commentExpanded)}
                className="p-0 text-decoration-none"
                style={{ fontSize: '0.9rem' }}
              >
                {commentExpanded ? '▼' : '▶'} Notes/Comments
              </Button>
              {commentExpanded && (
                <div className="mt-2">
                  <textarea
                    className="form-control"
                    value={featureComment}
                    onChange={(e) => setFeatureComment(e.target.value)}
                    onBlur={(e) => handleSaveComment(e.target.value)}
                    placeholder="Add notes or comments about this feature..."
                    style={{ 
                      resize: 'vertical',
                      minHeight: '80px',
                      fontFamily: 'inherit',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
              )}
            </div>
            
            {/* Feature description */}
            {parsed.description && (
              <div className="mb-4" style={{ 
                padding: '12px', 
                backgroundColor: '#f8f9fa', 
                borderLeft: '3px solid #6c757d',
                whiteSpace: 'pre-line',
                fontStyle: 'italic'
              }}>
                {parsed.description}
              </div>
            )}
            
            {/* Background section */}
            {parsed.background && (
              <div className="mb-4">
                <h5 style={{ color: '#6c757d' }}>Background:</h5>
                <div style={{ marginLeft: '20px' }}>
                  {parsed.background.steps.map((step, idx) => (
                    <div 
                      key={`bg-${idx}`}
                      style={{
                        padding: '8px',
                        marginBottom: '6px',
                        borderRadius: '4px',
                        backgroundColor: '#e9ecef',
                        border: '1px solid #ced4da',
                        fontStyle: 'italic'
                      }}
                    >
                      {highlightKeyword(step)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {parsed.scenarios.map((sc, sIdx) => (
              <div key={sIdx} className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div style={{ flexGrow: 1, minWidth: 0, marginRight: '12px' }}>
                    <h5 className="mb-0 d-inline" style={{ lineHeight: 1.2 }}>
                      Scenario: {sc.title}
                      {sc.tags && sc.tags.length > 0 && (
                        <span className="ms-2" style={{ verticalAlign: 'middle' }}>
                          {sc.tags.map((tag, i) => (
                            <Badge key={i} bg="secondary" className="ms-1" style={{ fontSize: '0.6em', fontWeight: 500 }}>
                              {typeof tag === 'string' ? tag : tag?.name || JSON.stringify(tag)}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </h5>
                  </div>
                  <ButtonGroup style={{ flexShrink: 0 }}>
                    <Button 
                      size="sm" 
                      variant="success" 
                      onClick={() => handleMarkAllInScenario(sIdx, 'pass')}
                      title="Mark all steps in this scenario as Passed"
                    >
                      <FaCheckCircle className="me-1" /> All
                    </Button>
                    <Button 
                      size="sm" 
                      variant="danger" 
                      onClick={() => handleMarkAllInScenario(sIdx, 'fail')}
                      title="Mark all steps in this scenario as Failed"
                    >
                      <FaTimesCircle className="me-1" /> All
                    </Button>
                    <Button 
                      size="sm" 
                      variant="warning" 
                      onClick={() => handleMarkAllInScenario(sIdx, 'skip')}
                      title="Mark all steps in this scenario as Skipped"
                    >
                      <FaForward className="me-1" /> All
                    </Button>
                    <Button 
                      size="sm" 
                      variant="info" 
                      onClick={() => handleMarkAllInScenario(sIdx, 'undo')}
                      title="Mark all steps in this scenario as Undefined"
                    >
                      <FaQuestionCircle className="me-1" /> All
                    </Button>
                  </ButtonGroup>
                </div>
                <div>
                  {sc.steps.map((step, stepIdx) => {
                    const key = `${sIdx}-${stepIdx}`;
                    const status = stepResults[key];
                    const metadata = stepMetadata[key] || {};
                    const images = scenarioImages[key] || [];
                    const isDragOver = dragOverStep === key;
                    
                    return (
                      <div 
                        key={stepIdx} 
                        className={isDragOver ? 'step-drag-over' : ''}
                        style={{
                          ...getStepStyle(status),
                          transition: 'all 0.2s',
                          padding: '12px',
                          marginBottom: '8px',
                          borderRadius: '4px',
                          border: '1px solid #dee2e6'
                        }}
                        onDragOver={(e) => handleDragOver(e, sIdx, stepIdx)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, sIdx, stepIdx)}
                      >
                        <div className="d-flex align-items-start justify-content-between">
                          <div className="flex-grow-1">
                            {highlightKeyword(step)}{' '}
                            
                            {/* Display metadata if available */}
                            {metadata.duration && (
                              <Badge bg="secondary" className="ms-2">
                                {(metadata.duration / 1000000).toFixed(0)}ms
                              </Badge>
                            )}
                            {metadata.matchLocation && (
                              <small className="ms-2 text-muted">
                                {metadata.matchLocation}
                              </small>
                            )}
                          </div>
                          
                          <ButtonGroup size="sm" className="ms-2">
                            <Button 
                              variant={status === 'pass' ? 'success' : 'secondary'} 
                              className={status !== 'pass' ? 'btn-step-action btn-pass-hint' : ''}
                              style={status !== 'pass' ? { opacity: 0.6 } : {}}
                              onClick={() => handleMarkStep(sIdx, stepIdx, 'pass')}
                              title="Mark as Passed"
                            >
                              <FaCheckCircle />
                            </Button>
                            <Button 
                              variant={status === 'fail' ? 'danger' : 'secondary'} 
                              className={status !== 'fail' ? 'btn-step-action btn-fail-hint' : ''}
                              style={status !== 'fail' ? { opacity: 0.6 } : {}}
                              onClick={() => handleMarkStep(sIdx, stepIdx, 'fail')}
                              title="Mark as Failed"
                            >
                              <FaTimesCircle />
                            </Button>
                            <Button 
                              variant={status === 'skip' ? 'warning' : 'secondary'} 
                              className={status !== 'skip' ? 'btn-step-action btn-skip-hint' : ''}
                              style={status !== 'skip' ? { opacity: 0.6 } : {}}
                              onClick={() => handleMarkStep(sIdx, stepIdx, 'skip')}
                              title="Mark as Skipped"
                            >
                              <FaForward />
                            </Button>
                            <Button
                              variant={status === 'undo' ? 'info' : 'secondary'}
                              className={status !== 'undo' ? 'btn-step-action btn-undo-hint' : ''}
                              style={status !== 'undo' ? { opacity: 0.6 } : {}}
                              onClick={() => handleMarkStep(sIdx, stepIdx, 'undo')}
                              title="Mark as Undefined"
                            >
                              <FaQuestionCircle />
                            </Button>
                            <Button
                              variant="secondary"
                              className="btn-step-action"
                              onClick={() => handleAttachmentClick(sIdx, stepIdx)}
                              title="Attach File"
                              aria-label="Attach file to step"
                            >
                              <FaPaperclip />
                            </Button>
                          </ButtonGroup>
                        </div>
                        
                        {metadata.errorMessage && (
                          <div className="text-danger small mt-2">
                            {metadata.errorMessage}
                          </div>
                        )}
                        
                        {/* Display images and files */}
                        {images.length > 0 && (
                          <div className="mt-2 d-flex gap-2 flex-wrap">
                            {images.map((img, imgIdx) => (
                              <div 
                                key={imgIdx} 
                                style={{ position: 'relative' }}
                                className="image-container"
                              >
                                {(!img.fileType || img.fileType === 'image') ? (
                                  <Image
                                    src={`data:${img.mimeType};base64,${img.imageData}`}
                                    thumbnail
                                    style={{ maxHeight: '120px', cursor: 'pointer' }}
                                    onClick={() => window.open(`data:${img.mimeType};base64,${img.imageData}`, '_blank')}
                                  />
                                ) : (
                                  <div
                                    className="border rounded p-3 d-flex flex-column align-items-center justify-content-center"
                                    style={{ 
                                      width: '120px',
                                      height: '120px',
                                      backgroundColor: '#f8f9fa',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                      const blob = new Blob([atob(img.imageData)], { type: img.mimeType });
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = img.fileName;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      URL.revokeObjectURL(url);
                                    }}
                                  >
                                    {React.createElement(getFileIcon(img.mimeType), { 
                                      style: { fontSize: '32px', color: '#6c757d', marginBottom: '8px' } 
                                    })}
                                    <small className="text-muted text-center" style={{ wordBreak: 'break-word', maxWidth: '100px', fontSize: '0.75rem' }} title={img.fileName}>
                                      {truncateFileName(img.fileName)}
                                    </small>
                                  </div>
                                )}
                                <button
                                  className="delete-image-btn"
                                  style={{ 
                                    position: 'absolute', 
                                    top: '5px', 
                                    right: '5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '24px',
                                    height: '24px',
                                    padding: 0,
                                    border: 'none',
                                    background: 'none',
                                    color: '#dc3545',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const fileTypeLabel = (!img.fileType || img.fileType === 'image') ? 'image' : 'file';
                                    if (window.confirm(`Are you sure you want to delete this ${fileTypeLabel}?`)) {
                                      handleDeleteImage(img.id, sIdx, stepIdx);
                                    }
                                  }}
                                >
                                  <FaTimesCircle />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
          multiple
          accept="image/*,.txt,.log,.json,.xml,.csv,.yml,.yaml,.pdf"
        />

        <div className="mt-4" ref={uploadZoneRef}>
          <DragDropZone onFiles={handleFileUpload} />
        </div>
      </div>
    </div>
  );
}

export default SessionViewer;
