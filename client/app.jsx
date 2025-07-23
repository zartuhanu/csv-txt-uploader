
const { useState, useEffect } = React;

function Uploader() {
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState('');
  const [file, setFile] = useState(null);
  const [issues, setIssues] = useState([]);
  const [details, setDetails] = useState({});
  const [expanded, setExpanded] = useState({});
  const [message, setMessage] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [schema, setSchema] = useState(null);

  useEffect(() => {
    fetch('/templates')
      .then(res => res.json())
      .then(data => setTemplates(data));
  }, []);

  useEffect(() => {
    if (template) {
      fetch(`/templates/${encodeURIComponent(template)}`)
        .then(res => res.json())
        .then(data => setSchema(data.columns || []))
        .catch(() => setSchema(null));
    } else {
      setSchema(null);
    }
  }, [template]);

  const handleCheck = async () => {
    if (!file || !template) return;
    const form = new FormData();
    form.append('file', file);
    form.append('template', template);
    const res = await fetch('/compare', { method: 'POST', body: form });
    const data = await res.json();
    if (data.error) {
      setMessage('Error: ' + data.error);
      setIssues([]);
      setDetails({});
      setShowUpload(false);
    } else {
      setIssues(data.issues || []);
      setDetails(data.details || {});
      setMessage(data.message || '');
      setShowUpload((data.issues || []).length === 0);
    }
  };

  const handleUpload = async () => {
    if (!file || !template) return;
    const form = new FormData();
    form.append('file', file);
    form.append('template', template);
    const res = await fetch('/upload', { method: 'POST', body: form });
    const data = await res.json();
    setMessage(data.message || data.error);
  };

  return (
    <div className="container">
      <img src="Zurich_Insurance_Group_logo.svg.png" alt="Zurich Logo" className="logo" />
      <h1>CSV/TXT Uploader</h1>
      <div>
        <label>Template:</label>
        <select value={template} onChange={e => setTemplate(e.target.value)}>
          <option value="">Select template</option>
          {templates.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      {schema && (
        <div>
          <h3>Columns</h3>
          <ul>
            {schema.map(c => (
              <li key={c.name}>{c.name} ({c.type})</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <label>File:</label>
        <input type="file" onChange={e => setFile(e.target.files[0])} />
      </div>
      <button onClick={handleCheck}>Check File</button>
      {showUpload && (
        <button onClick={handleUpload}>Upload to DB</button>
      )}
      <div className="output">
        {message && <pre>{message}</pre>}
        {issues.length > 0 && (
          <ul>
            {issues.map(issue => (
              <li key={issue}>
                {issue}
                {details[issue] && details[issue].length > 0 && (
                  <div>
                    <button onClick={() => setExpanded({
                      ...expanded,
                      [issue]: !expanded[issue]
                    })}>
                      {expanded[issue] ? 'Hide details' : 'Show details'}
                    </button>
                    {expanded[issue] && (
                      <ul>
                        {details[issue].map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');


  const handleLogin = async () => {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      setLoggedIn(true);
    }
  };

  if (!loggedIn) {
    return (
      <div className="container">
        <img src="Zurich_Insurance_Group_logo.svg.png" alt="Zurich Logo" className="logo" />
        <h1>CSV/TXT Uploader</h1>
        <h2>Login</h2>
        <div>
          <label>Username:</label>
          <input value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button onClick={handleLogin}>Login</button>
      </div>
    );
  }

  return <Uploader />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);