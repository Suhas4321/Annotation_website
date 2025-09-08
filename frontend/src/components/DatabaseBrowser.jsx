import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function DatabaseBrowser() {
  const [stats, setStats] = useState({ total_projects: 0, annotated_projects: 0 });
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch stats
      const statsResponse = await fetch('/api/db/stats');
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch recent projects
      const projectsResponse = await fetch('/api/db/recent-projects');
      const projectsData = await projectsResponse.json();
      setRecentProjects(projectsData.projects || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🎯 Database Browser</h1>
      
      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '20px', 
        marginBottom: '30px',
        maxWidth: '800px',
        margin: '0 auto 30px auto'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '30px', 
          borderRadius: '12px', 
          textAlign: 'center', 
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)' 
        }}>
          <div style={{ fontSize: '3em', fontWeight: 'bold', color: '#8A2BE2' }}>
            {stats.total_projects}
          </div>
          <div>Total Projects</div>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '30px', 
          borderRadius: '12px', 
          textAlign: 'center', 
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)' 
        }}>
          <div style={{ fontSize: '3em', fontWeight: 'bold', color: '#8A2BE2' }}>
            {stats.annotated_projects}
          </div>
          <div>Annotated Projects</div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <Link to="/database/projects" style={{ 
          background: '#8A2BE2', 
          color: 'white', 
          padding: '12px 24px', 
          borderRadius: '8px', 
          textDecoration: 'none',
          fontWeight: '600'
        }}>
          📋 View All Projects
        </Link>
      </div>

      {/* Recent Projects */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#8A2BE2' }}>📈 Recent Projects</h2>
        {recentProjects.length > 0 ? (
          recentProjects.map(project => (
            <div key={project.id} style={{ 
              padding: '15px', 
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <Link to={`/database/project/${project.id}`} style={{ 
                  color: '#8A2BE2', 
                  fontWeight: '600',
                  textDecoration: 'none'
                }}>
                  {project.filename}
                </Link>
                <div style={{ color: '#999', fontSize: '0.8em' }}>
                  ID: {project.short_id || project.id?.slice(0, 16) + '...'}
                </div>
              </div>
              <div style={{ color: '#666', fontSize: '0.9em' }}>
                {new Date(project.created_at).toLocaleDateString()}
              </div>
            </div>
          ))
        ) : (
          <p>No projects found. Start by uploading your first annotation project!</p>
        )}
      </div>
    </div>
  );
}

export default DatabaseBrowser;
