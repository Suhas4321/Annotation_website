import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/list-projects');
      const data = await response.json();
      setProjects(data.projects || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading projects...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h1>📋 All Projects ({projects.length})</h1>
        <Link to="/database" style={{
          background: '#8A2BE2',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '6px',
          textDecoration: 'none'
        }}>
          ← Back to Dashboard
        </Link>
      </div>

      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        overflow: 'hidden',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#8A2BE2', color: 'white' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}>Short ID</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Filename</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Created</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(project => (
              <tr key={project.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '15px' }}>
                  <strong>{project.short_id || project.id.slice(0, 8)}</strong>
                </td>
                <td style={{ padding: '15px' }}>{project.filename}</td>
                <td style={{ padding: '15px' }}>
                  {new Date(project.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '15px' }}>
                  <span style={{
                    padding: '5px 12px',
                    borderRadius: '15px',
                    fontSize: '0.8em',
                    fontWeight: '600',
                    background: project.has_annotations ? '#d4edda' : '#fff3cd',
                    color: project.has_annotations ? '#155724' : '#856404'
                  }}>
                    {project.has_annotations ? 'Annotated' : 'Pending'}
                  </span>
                </td>
                <td style={{ padding: '15px' }}>
                  <Link to={`/database/project/${project.id}`} style={{
                    background: '#8A2BE2',
                    color: 'white',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '0.8em'
                  }}>
                    👁️ View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProjectsList;
