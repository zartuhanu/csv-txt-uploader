const { useState, useEffect } = React;

function App() {
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState('');
  const [file, setFile] = useState(null);
  const [output, setOutput] = useState('');

  useEffect(() => {
    fetch('/templates')
      .then(res => res.json())
      .then(data => setTemplates(data));
  }, []);

  const handleCheck = async () => {
    if (!file || !template) return;
    const form = new FormData();
    form.append('file', file);
    form.append('template', template);
    const res = await fetch('/compare', { method: 'POST', body: form });
    const data = await res.json();
    if (data.issues) {
      setOutput(data.issues.join('\n'));
    } else if (data.error) {
      setOutput('Error: ' + data.error);
    }
  };

  const handleUpload = async () => {
    if (!file || !template) return;
    const form = new FormData();
    form.append('file', file);
    form.append('template', template);
    const res = await fetch('/upload', { method: 'POST', body: form });
    const data = await res.json();
    setOutput(data.message || data.error);
  };

  return (
    <div className="container">
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
      <div>
        <label>File:</label>
        <input type="file" onChange={e => setFile(e.target.files[0])} />
      </div>
      <button onClick={handleCheck}>Check File</button>
      <button onClick={handleUpload}>Upload to DB</button>
      <pre className="output">{output}</pre>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
