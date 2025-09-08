import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [annotations, setAnnotations] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectDetail();
  }, [id]);

  const fetchProjectDetail = async () => {
    try {
      // Fetch project data from your existing API endpoints
      const response = await fetch(`/api/get-saved-annotations/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setAnnotations(data.annotations);
      }
      
      // You might need to create a new endpoint to get full project details
      // For now, we'll show what we can
      setProject({ id: id });
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading project...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h1>🔍 Project Details</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/database/projects" style={{
            background: '#8A2BE2',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '6px',
            textDecoration: 'none'
          }}>
            📋 All Projects
          </Link>
          <Link to="/database" style={{
            background: '#6c757d',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '6px',
            textDecoration: 'none'
          }}>
            🏠 Dashboard
          </Link>
        </div>
      </div>

      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '25px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }}>
        <h2>📄 Project Information</h2>
        <div style={{ marginBottom: '20px' }}>
          <strong>Project ID:</strong> {id}
        </div>

        {annotations ? (
          <div>
            <h3>🎯 Annotation Data</h3>
            <pre style={{ 
              background: '#f8f9fa', 
              padding: '15px', 
              borderRadius: '6px',
              overflow: 'auto',
              maxHeight: '400px'
            }}>
              {JSON.stringify(annotations, null, 2)}
            </pre>
          </div>
        ) : (
          <div style={{ 
            background: '#fff3cd', 
            color: '#856404', 
            padding: '15px', 
            borderRadius: '6px'
          }}>
            No annotations found for this project.
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectDetail;
