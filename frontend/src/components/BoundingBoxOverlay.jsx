import React, { useState, useEffect, useRef } from 'react';

const BoundingBoxOverlay = ({ imageSrc, elements, projectId, shortId, onSaveSuccess }) => {
  const canvasRef = useRef(null);
  const [visibleBoxes, setVisibleBoxes] = useState(new Set(elements?.map(el => el.id) || []));

  useEffect(() => {
    if (!imageSrc || !elements?.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const image = new Image();

    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);

      // Draw bounding boxes for visible elements
      elements.forEach((element) => {
        if (!visibleBoxes.has(element.id)) return;

        const { x1, y1, x2, y2 } = element.bounds;
        const width = x2 - x1;
        const height = y2 - y1;

        // Draw red rectangle border
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, width, height);

        // Draw element ID label
        ctx.fillStyle = 'red';
        ctx.font = '14px Arial';
        ctx.fillText(`#${element.id}`, x1 + 2, y1 > 14 ? y1 - 4 : y1 + 14);
      });
    };

    image.src = imageSrc;
  }, [imageSrc, elements, visibleBoxes]);

  const toggleBox = (id) => {
    setVisibleBoxes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setVisibleBoxes(new Set(elements.map((el) => el.id)));
  };

  const deselectAll = () => {
    setVisibleBoxes(new Set());
  };

  // 🔄 Function to notify database browser to refresh
  const notifyDatabaseRefresh = async () => {
    try {
      console.log('📡 Notifying database browser to refresh...');
      localStorage.setItem('lastAnnotationSave', new Date().toISOString());
    } catch (error) {
      console.log('Database refresh notification failed:', error);
    }
  };

  // 🎯 Save to database with refresh notification
  const saveAnnotationsToDatabase = async (successMessage) => {
    if (!projectId) {
      console.log('⚠️ No project ID - skipping database save');
      return false;
    }

    const selectedElements = elements.filter(element => visibleBoxes.has(element.id));
    
    const annotationData = {
      image_info: {
        filename: "screenshot.png",
        width: selectedElements[0]?.bounds ? Math.max(...selectedElements.map(el => el.bounds.x2)) : 1080,
        height: selectedElements[0]?.bounds ? Math.max(...selectedElements.map(el => el.bounds.y2)) : 1920
      },
      annotations: selectedElements.map(element => ({
        id: element.id,
        element_class: element.class,
        text_content: element.text || "",
        resource_id: element.resource_id || "",
        bounding_box: {
          x1: element.bounds.x1,
          y1: element.bounds.y1,
          x2: element.bounds.x2,
          y2: element.bounds.y2,
          width: element.bounds.x2 - element.bounds.x1,
          height: element.bounds.y2 - element.bounds.y1
        },
        properties: {
          clickable: element.clickable,
          enabled: element.enabled,
          visible: element.visible
        }
      })),
      metadata: {
        total_elements: selectedElements.length,
        created_at: new Date().toISOString(),
        annotation_tool: "Drizz UI Testing Tool"
      }
    };

    try {
      console.log('💾 Sending to database:', { project_id: projectId, annotations: annotationData });
      
      const response = await fetch('http://localhost:8000/api/save-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          annotations: annotationData
        })
      });

      console.log('📨 Database response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📊 Database response:', result);
      
      if (result.success) {
        alert(`✅ ${successMessage}`);
        
        // 🔄 Notify database browser to refresh
        await notifyDatabaseRefresh();
        
        if (onSaveSuccess) onSaveSuccess();
        return true;
      } else {
        alert('❌ Failed to save to database: ' + result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Database save failed:', error);
      alert('❌ Database save failed: ' + error.message);
      return false;
    }
  };

  // 🎯 Save image with database auto-save
  const saveImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      alert('Canvas not ready!');
      return;
    }

    // Download image file
    const link = document.createElement('a');
    link.download = `drizz-annotated-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Auto-save to database if project ID exists
    if (projectId) {
      await saveAnnotationsToDatabase('Image saved locally and to database!');
    } else {
      alert('✅ Image saved locally!');
    }
  };

  // 🎯 Save JSON with database auto-save
  const saveSelectedJSON = async () => {
    const selectedElements = elements.filter(element => visibleBoxes.has(element.id));
    
    // Create annotation JSON format
    const annotationData = {
      image_info: {
        filename: "screenshot.png",
        width: selectedElements[0]?.bounds ? Math.max(...selectedElements.map(el => el.bounds.x2)) : 1080,
        height: selectedElements[0]?.bounds ? Math.max(...selectedElements.map(el => el.bounds.y2)) : 1920
      },
      annotations: selectedElements.map(element => ({
        id: element.id,
        element_class: element.class,
        text_content: element.text || "",
        resource_id: element.resource_id || "",
        bounding_box: {
          x1: element.bounds.x1,
          y1: element.bounds.y1,
          x2: element.bounds.x2,
          y2: element.bounds.y2,
          width: element.bounds.x2 - element.bounds.x1,
          height: element.bounds.y2 - element.bounds.y1
        },
        properties: {
          clickable: element.clickable,
          enabled: element.enabled,
          visible: element.visible
        }
      })),
      metadata: {
        total_elements: selectedElements.length,
        created_at: new Date().toISOString(),
        annotation_tool: "Drizz UI Testing Tool"
      }
    };

    // Download JSON file
    const blob = new Blob([JSON.stringify(annotationData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drizz-annotations-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Auto-save to database if project ID exists
    if (projectId) {
      await saveAnnotationsToDatabase(`JSON saved locally and to database! (${selectedElements.length} elements)`);
    } else {
      alert(`✅ JSON saved locally! (${selectedElements.length} elements)`);
    }
  };

  if (!elements || elements.length === 0) {
    return <div>No elements to display</div>;
  }

  return (
    <div style={{ display: 'flex', gap: '20px', height: '85vh' }}>
      
      {/* LEFT PANEL - UI Elements List with Controls */}
      <div style={{
        width: '350px',
        background: '#f8f9fa',
        borderRadius: '8px',
        padding: '20px',
        overflowY: 'auto',
        maxHeight: '100%'
      }}>
        {/* Control Buttons at Top */}
        <div style={{ 
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={selectAll} 
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                flex: 1
              }}
            >
              ✅ Select All
            </button>
            
            <button 
              onClick={deselectAll}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                flex: 1
              }}
            >
              ❌ Deselect All
            </button>
          </div>

          {/* 🎯 SAVE BUTTONS with Database Auto-Refresh */}
          <button 
            onClick={saveImage}
            style={{
              background: '#8A2BE2',
              color: 'white',
              border: 'none',
              padding: '12px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              width: '100%'
            }}
          >
            💾 Save Image {projectId && '& DB'}
          </button>

          <button 
            onClick={saveSelectedJSON}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '12px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              width: '100%'
            }}
          >
            📄 Save JSON ({visibleBoxes.size}) {projectId && '& DB'}
          </button>
          
          {/* 🔄 Manual Refresh Database Button */}
          {projectId && (
            <button 
              onClick={() => {
                window.open('http://localhost:5000', '_blank');
                setTimeout(() => {
                  const dbWindow = window.open('http://localhost:5000', '_blank');
                  if (dbWindow) dbWindow.location.reload();
                }, 1000);
              }}
              style={{
                background: '#17a2b8',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                width: '100%',
                fontSize: '12px'
              }}
            >
              🔄 View Updated Database
            </button>
          )}
        </div>

        {/* Element Count with Short ID Display */}
        <h3 style={{ margin: '0 0 16px 0', color: '#8A2BE2' }}>
          UI Elements ({visibleBoxes.size}/{elements.length})
          {projectId && (
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              Project: #{shortId || projectId.substring(0, 8) + '...'}
            </div>
          )}
        </h3>
        
        {/* Elements List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {elements.map((element) => (
            <div
              key={element.id}
              style={{
                backgroundColor: visibleBoxes.has(element.id) ? '#e3f2fd' : '#fff',
                borderRadius: '8px',
                border: visibleBoxes.has(element.id) ? '2px solid #2196F3' : '1px solid #ddd',
                transition: 'all 0.2s ease',
                overflow: 'hidden'
              }}
            >
              <label 
                htmlFor={`checkbox-${element.id}`}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '12px',
                  cursor: 'pointer',
                  width: '100%',
                  margin: 0,
                  boxSizing: 'border-box'
                }}
              >
                <input
                  id={`checkbox-${element.id}`}
                  type="checkbox"
                  checked={visibleBoxes.has(element.id)}
                  onChange={() => toggleBox(element.id)}
                  style={{ 
                    marginRight: '12px',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ fontSize: '13px', flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#8A2BE2', marginBottom: '2px' }}>
                    #{element.id}
                  </div>
                  <div style={{ color: '#6c757d', marginBottom: '4px' }}>
                    {element.class?.split('.').pop() || 'Unknown'}
                  </div>
                  {element.text && (
                    <div style={{ 
                      fontStyle: 'italic', 
                      color: '#28a745',
                      fontSize: '12px',
                      wordBreak: 'break-word'
                    }}>
                      "{element.text.slice(0, 30)}{element.text.length > 30 ? '...' : ''}"
                    </div>
                  )}
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL - Large Canvas Display */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <canvas
          ref={canvasRef}
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}
        />
      </div>
    </div>
  );
};

export default BoundingBoxOverlay;
