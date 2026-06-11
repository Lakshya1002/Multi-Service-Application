import { useState, useEffect } from 'react'
import './App.css'

function App() {
  // Services status state
  const [services, setServices] = useState({
    proxy: { name: 'Nginx Proxy', status: 'checking', details: 'Reverse Proxy (Port 80)', network: 'frontend-tier, backend-tier' },
    frontend: { name: 'React Frontend', status: 'online', details: 'Static Client SPA (Port 80)', network: 'frontend-tier' },
    backend: { name: 'Express API', status: 'checking', details: 'Node.js Service (Port 5000)', network: 'backend-tier' },
    database: { name: 'MongoDB', status: 'checking', details: 'NoSQL Database (Port 27017)', network: 'backend-tier' },
    cache: { name: 'Redis Cache', status: 'checking', details: 'Key-Value Cache (Port 6379)', network: 'backend-tier' }
  });

  // Telemetry and CRUD state
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Performance metrics
  const [telemetry, setTelemetry] = useState({
    latency: null,
    source: null,
    cacheHits: 0,
    dbMisses: 0
  });

  // Active tab in details section
  const [activeTab, setActiveTab] = useState('networks');

  // Fetch health of all services
  const checkHealth = async () => {
    // Check Nginx Proxy health
    let proxyUp = false;
    try {
      const res = await fetch('/health');
      if (res.status === 200) proxyUp = true;
    } catch (err) {
      proxyUp = false;
    }

    // Check Backend health (which also reports DB and Cache health)
    let backendUp = false;
    let mongoUp = false;
    let redisUp = false;

    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        backendUp = data.status === 'OK';
        mongoUp = data.mongodb === 'UP';
        redisUp = data.redis === 'UP';
      } else {
        // Express backend is up but returned 500 (one of its dependencies is offline)
        backendUp = true;
        const data = await res.json();
        mongoUp = data.mongodb === 'UP';
        redisUp = data.redis === 'UP';
      }
    } catch (err) {
      backendUp = false;
      mongoUp = false;
      redisUp = false;
    }

    setServices(prev => ({
      ...prev,
      proxy: { ...prev.proxy, status: proxyUp ? 'online' : 'offline' },
      backend: { ...prev.backend, status: backendUp ? 'online' : 'offline' },
      database: { ...prev.database, status: mongoUp ? 'online' : 'offline' },
      cache: { ...prev.cache, status: redisUp ? 'online' : 'offline' }
    }));
  };

  // Fetch data items from API
  const fetchItems = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const startTime = Date.now();
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error('Failed to fetch items');
      
      const data = await res.json();
      const endTime = Date.now();
      
      setItems(data.data || []);
      
      // Update telemetry
      const queryLatency = endTime - startTime;
      const querySource = data.source; // "Redis Cache" or "MongoDB Database"
      
      setTelemetry(prev => ({
        ...prev,
        latency: queryLatency,
        source: querySource,
        cacheHits: querySource === 'Redis Cache' ? prev.cacheHits + 1 : prev.cacheHits,
        dbMisses: querySource === 'MongoDB Database' ? prev.dbMisses + 1 : prev.dbMisses
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Add a new document
  const addItem = async (e) => {
    e.preventDefault();
    if (!name || !value) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value })
      });
      
      if (!res.ok) throw new Error('Failed to save item');
      
      setName('');
      setValue('');
      
      // Refresh items list
      await fetchItems();
      // Run health check in case services changed state
      checkHealth();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Clear all database data and flush cache
  const clearAll = async () => {
    if (!window.confirm('Are you sure you want to flush all data from MongoDB and clear the Redis cache?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/items', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear data');
      
      setItems([]);
      setTelemetry(prev => ({
        ...prev,
        latency: null,
        source: null
      }));
      
      // Run health check
      checkHealth();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load health check and initial items on mount
  useEffect(() => {
    checkHealth();
    fetchItems(true);

    // Periodically refresh service health every 8 seconds
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-root">
      {/* Header */}
      <header className="dashboard-header">
        <div className="brand">
          <svg className="docker-logo" viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
            <path d="M13.962 8.075h-2.73a.25.25 0 0 0-.25.25v2.729a.25.25 0 0 0 .25.25h2.73a.25.25 0 0 0 .25-.25V8.325a.25.25 0 0 0-.25-.25zm-3.637 0h-2.73a.25.25 0 0 0-.25.25v2.729a.25.25 0 0 0 .25.25h2.73a.25.25 0 0 0 .25-.25V8.325a.25.25 0 0 0-.25-.25zm-3.637 0H3.957a.25.25 0 0 0-.25.25v2.729a.25.25 0 0 0 .25.25h2.73a.25.25 0 0 0 .25-.25V8.325a.25.25 0 0 0-.25-.25zm0-3.637H3.957a.25.25 0 0 0-.25.25v2.73a.25.25 0 0 0 .25.25h2.73a.25.25 0 0 0 .25-.25V4.688a.25.25 0 0 0-.25-.25zm3.637 0h-2.73a.25.25 0 0 0-.25.25v2.73a.25.25 0 0 0 .25.25h2.73a.25.25 0 0 0 .25-.25V4.688a.25.25 0 0 0-.25-.25zm3.637 0h-2.73a.25.25 0 0 0-.25.25v2.73a.25.25 0 0 0 .25.25h2.73a.25.25 0 0 0 .25-.25V4.688a.25.25 0 0 0-.25-.25zm3.637 0h-2.73a.25.25 0 0 0-.25.25v2.73a.25.25 0 0 0 .25.25h2.73a.25.25 0 0 0 .25-.25V4.688a.25.25 0 0 0-.25-.25zM13.962.812h-2.73a.25.25 0 0 0-.25.25v2.73a.25.25 0 0 0 .25.25h2.73a.25.25 0 0 0 .25-.25V1.062a.25.25 0 0 0-.25-.25zM23.99 12.378c-.288-.344-.925-.8-2.22-.8a4.4 4.4 0 0 0-.482.028c-.378-2.064-1.91-3.606-3.87-3.606-.178 0-.353.013-.523.037V8.075a.25.25 0 0 0-.25-.25h-2.73a.25.25 0 0 0-.25.25v2.729a.25.25 0 0 0 .25.25h1.22c-.068.324-.1.66-.1.996v.14C15.015 12.392 12 12.44 12 16.5c0 1.25-.49 1.95-1.46 2.08-.1-.13-.23-.24-.38-.32C9.5 17.8 7 17.5 7 15.5v-.54a.25.25 0 0 0-.25-.25h-2.73a.25.25 0 0 0-.25.25v1.272c-.886.113-1.637.523-2.18 1.157-.594.693-.762 1.583-.473 2.502.213.68.736 1.258 1.47 1.626C3.993 21.724 5.926 22 8 22c7.6 0 13.9-3.3 15.4-8.15.34-1.025.207-1.127.59-1.472z"/>
          </svg>
          <div className="title-wrapper">
            <h1>DockerOps Dashboard</h1>
            <span className="badge">OPTIMIZED CLUSTER</span>
          </div>
        </div>
        <button className="btn-secondary pulse-hover" onClick={checkHealth} disabled={loading}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          Refresh Cluster Health
        </button>
      </header>

      {/* Services Status Section */}
      <section className="services-section">
        <h2>Service Grid & Routing Map</h2>
        <p className="section-desc">Monitored services and subnets. Internal traffic isolates application tiers.</p>
        
        <div className="services-grid">
          {Object.entries(services).map(([key, service]) => (
            <div key={key} className={`service-card ${service.status}`}>
              <div className="card-header">
                <div className="service-icon-wrapper">
                  {key === 'proxy' && (
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  )}
                  {key === 'frontend' && (
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  )}
                  {key === 'backend' && (
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="8" rx="2" />
                      <rect x="2" y="14" width="20" height="8" rx="2" />
                      <line x1="6" y1="6" x2="6.01" y2="6" />
                      <line x1="6" y1="18" x2="6.01" y2="18" />
                    </svg>
                  )}
                  {key === 'database' && (
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                    </svg>
                  )}
                  {key === 'cache' && (
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 17h20M2 12h20M2 7h20" />
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                  )}
                </div>
                <div className={`status-badge ${service.status}`}>
                  <span className={`status-dot ${service.status}`}></span>
                  {service.status.toUpperCase()}
                </div>
              </div>
              <div className="card-body">
                <h3>{service.name}</h3>
                <p className="details">{service.details}</p>
                <div className="network-info">
                  <span className="info-label">Network:</span>
                  <code className="network-tag">{service.network}</code>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Grid: Telemetry & Workbench */}
      <div className="main-content-grid">
        {/* Left column: CRUD Workbench */}
        <section className="workbench-card">
          <h2>CRUD Workbench</h2>
          <p className="section-desc">Insert documents to MongoDB to invalidate Redis cache, then fetch to observe load times.</p>
          
          <form onSubmit={addItem} className="workbench-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="itemName">Item Name</label>
                <input
                  id="itemName"
                  type="text"
                  placeholder="e.g. session_timeout"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="itemValue">Item Value</label>
                <input
                  id="itemValue"
                  type="text"
                  placeholder="e.g. 3600 seconds"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>
            
            <div className="actions-row">
              <button type="submit" className="btn-primary" disabled={loading}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {loading ? 'Executing...' : 'Insert Document'}
              </button>
              
              <button type="button" className="btn-secondary" onClick={() => fetchItems()} disabled={loading}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Fetch Items
              </button>

              <button type="button" className="btn-danger" onClick={clearAll} disabled={loading}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Flush DB & Cache
              </button>
            </div>
          </form>

          {error && <div className="error-banner">{error}</div>}

          <div className="items-list-container">
            <h3>MongoDB Documents ({items.length})</h3>
            {items.length === 0 ? (
              <div className="empty-state">
                No items found. Create your first document above.
              </div>
            ) : (
              <div className="items-list">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Value</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item._id}>
                        <td><code>{item.name}</code></td>
                        <td>{item.value}</td>
                        <td className="time-col">{new Date(item.createdAt).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Right column: Performance Telemetry */}
        <section className="telemetry-card">
          <h2>Caching Telemetry</h2>
          <p className="section-desc">Live performance stats for container queries. Redis caches database arrays for 30s.</p>

          <div className="telemetry-stats-grid">
            <div className="metric-box speed">
              <span className="metric-label">QUERY LATENCY</span>
              <div className="metric-value">
                {telemetry.latency !== null ? `${telemetry.latency} ms` : '--'}
              </div>
              <div className="speed-meter">
                <div 
                  className={`speed-bar ${telemetry.latency !== null && telemetry.latency < 10 ? 'fast' : 'slow'}`}
                  style={{ width: telemetry.latency !== null ? `${Math.min(100, Math.max(5, (100 - telemetry.latency * 0.8)))}%` : '0%' }}
                ></div>
              </div>
              <span className="metric-subtext">
                {telemetry.latency !== null 
                  ? (telemetry.latency < 10 ? '⚡ Ultra-fast cache hit' : '💾 Direct database lookup') 
                  : 'Execute a fetch query to measure latency'}
              </span>
            </div>

            <div className={`metric-box source-card ${telemetry.source ? telemetry.source.replace(' ', '-').toLowerCase() : ''}`}>
              <span className="metric-label">DATA SOURCE</span>
              <div className="source-display">
                {telemetry.source === 'Redis Cache' && (
                  <span className="source-pill cache">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 9 10-11h-9l1-9z"/>
                    </svg>
                    REDIS CACHE
                  </span>
                )}
                {telemetry.source === 'MongoDB Database' && (
                  <span className="source-pill db">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                    </svg>
                    MONGODB
                  </span>
                )}
                {!telemetry.source && <span className="source-pill idle">NO ACTIVE QUERY</span>}
              </div>
              <span className="metric-subtext">
                {telemetry.source === 'Redis Cache' 
                  ? 'Data retrieved from in-memory cache.' 
                  : telemetry.source === 'MongoDB Database' 
                    ? 'Data queried from MongoDB persistent volume.' 
                    : 'Awaiting items query...'}
              </span>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-pill">
              <span className="count-label">Cache Hits:</span>
              <span className="count-value cache">{telemetry.cacheHits}</span>
            </div>
            <div className="stat-pill">
              <span className="count-label">DB Misses:</span>
              <span className="count-value db">{telemetry.dbMisses}</span>
            </div>
            <div className="stat-pill">
              <span className="count-label">Hit Ratio:</span>
              <span className="count-value ratio">
                {telemetry.cacheHits + telemetry.dbMisses > 0 
                  ? `${Math.round((telemetry.cacheHits / (telemetry.cacheHits + telemetry.dbMisses)) * 100)}%` 
                  : '0%'}
              </span>
            </div>
          </div>

          <div className="telemetry-info-box">
            <h4>💡 How to test caching speed:</h4>
            <ol>
              <li>Click <strong>Fetch Items</strong>. If it has been over 30 seconds (or is the first query), you will see a <strong>MongoDB Database</strong> lookup, taking around 15–80ms.</li>
              <li>Immediately click <strong>Fetch Items</strong> again. The system will retrieve cached results from <strong>Redis</strong> in <strong>&lt; 5ms</strong>.</li>
              <li>Click <strong>Insert Document</strong>. This modifies database records and automatically flushes the cache, forcing the next fetch query to hits MongoDB directly.</li>
            </ol>
          </div>
        </section>
      </div>

      {/* Advanced Docker Configuration Section */}
      <section className="architecture-section">
        <h2>Orchestration Highlights</h2>
        <p className="section-desc">Review the Docker features configured in this deployment.</p>

        <div className="tabs-header">
          <button className={`tab-btn ${activeTab === 'networks' ? 'active' : ''}`} onClick={() => setActiveTab('networks')}>
            Isolated Networks
          </button>
          <button className={`tab-btn ${activeTab === 'secrets' ? 'active' : ''}`} onClick={() => setActiveTab('secrets')}>
            Security & Secrets
          </button>
          <button className={`tab-btn ${activeTab === 'optimization' ? 'active' : ''}`} onClick={() => setActiveTab('optimization')}>
            Multi-Stage Builds
          </button>
          <button className={`tab-btn ${activeTab === 'monitoring' ? 'active' : ''}`} onClick={() => setActiveTab('monitoring')}>
            Health & Logs
          </button>
        </div>

        <div className="tab-pane">
          {activeTab === 'networks' && (
            <div className="tab-content">
              <h3>Dual-Tier Subnet Segregation</h3>
              <p>To minimize attack vectors, containers are isolated into two virtual bridge networks:</p>
              <ul>
                <li><strong>frontend-tier</strong>: Limits web browser access to static frontend assets and the Nginx reverse proxy.</li>
                <li><strong>backend-tier</strong>: The private data plane. Express API, Redis cache, and MongoDB database reside here. The database and cache cannot resolve or communicate with containers in the frontend network.</li>
              </ul>
              <p>The <strong>Nginx Proxy</strong> resides on both networks, bridging incoming public client traffic to appropriate backend routing targets securely.</p>
            </div>
          )}

          {activeTab === 'secrets' && (
            <div className="tab-content">
              <h3>Least-Privilege Database Access via Docker Secrets</h3>
              <p>This implementation avoids plaintext env variables for database passwords. Instead, it utilizes Docker secrets:</p>
              <ul>
                <li>Secrets are declared in <code>docker-compose.yml</code> and mounted dynamically at runtime to <code>/run/secrets/</code>.</li>
                <li>MongoDB runs an initialization script (<code>init-db.js</code>) that reads the secret password and creates an application-specific user (<code>app_user</code>).</li>
                <li>The Express backend queries MongoDB as <code>app_user</code> using the secret password file. Database root credentials remain isolated from application logic.</li>
              </ul>
            </div>
          )}

          {activeTab === 'optimization' && (
            <div className="tab-content">
              <h3>Custom Base Images & Multi-Stage Nginx Build</h3>
              <p>Images are optimized to reduce size and leverage build caching:</p>
              <ul>
                <li><strong>my-node-base</strong>: Custom base image based on Alpine Linux, pre-hardened with upgraded packages and default configurations.</li>
                <li><strong>React SPA</strong>: Employs a multi-stage Docker build. The builder compiles assets. The runtime drops the Node environment completely, copying only the compiled static bundle into a lightweight Alpine Nginx server.</li>
                <li><strong>Dockerignore files</strong>: Optimize layer caching by excluding local node modules and build dumps.</li>
              </ul>
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="tab-content">
              <h3>Automated Health Checks & Logs Rotation</h3>
              <p>Continuous status reporting and memory health safeguards:</p>
              <ul>
                <li><strong>Authenticated Health Checks</strong>: MongoDB uses `mongosh` credentials read securely from secret files. API and proxy services use optimized internal curl/wget fetches.</li>
                <li><strong>JSON Log Rotation</strong>: Prevent storage leaks. Docker Compose restricts logs to 10MB per container with a max limit of 3 rotating backup files.</li>
              </ul>
            </div>
          )}
        </div>
      </section>
      
      <footer className="dashboard-footer">
        <p>Optimized Multi-Service Container Application Setup &bull; Antigravity Agentic Deployment</p>
      </footer>
    </div>
  )
}

export default App

