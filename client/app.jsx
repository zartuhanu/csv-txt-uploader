const { useState, useEffect } = React;

function Uploader() {
  // Şablon listesini sakla
  const [templates, setTemplates] = useState([]);
  // Seçili şablon
  const [template, setTemplate] = useState('');
  // Yüklenecek dosya
  const [file, setFile] = useState(null);
  // Karşılaştırma sorunları
  const [issues, setIssues] = useState([]);
  // Sorun detayları
  const [details, setDetails] = useState({});
  // Detayları gösterme durumu
  const [expanded, setExpanded] = useState({});
  // Genel mesaj (hata veya başarı)
  const [message, setMessage] = useState('');
  // Yükleme butonunu gösterme
  const [showUpload, setShowUpload] = useState(false);

  // Bileşen yüklendiğinde şablonları al
  useEffect(() => {
    fetch('/templates')
      .then(res => res.json())
      .then(data => setTemplates(data));
  }, []);

  // Dosyayı kontrol et
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
      // Sorun yoksa yükleme butonunu aç
      setShowUpload((data.issues || []).length === 0);
    }
  };

  // Dosyayı veritabanına yükle
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
      {/* Logo göster */}
      <img src="Zurich_Insurance_Group_logo.svg.png" alt="Zurich Logo" className="logo" />
      <h1>CSV/TXT Uploader</h1>
      <div>
        <label>Template:</label>
        {/* Şablon seçici */}
        <select value={template} onChange={e => setTemplate(e.target.value)}>
          <option value="">Select template</option>
          {templates.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label>File:</label>
        {/* Dosya girişi */}
        <input type="file" onChange={e => setFile(e.target.files[0])} />
      </div>
      {/* Kontrol butonu */}
      <button onClick={handleCheck}>Check File</button>
      {showUpload && (
        // Yükleme butonu
        <button onClick={handleUpload}>Upload to DB</button>
      )}
      <div className="output">
        {/* Mesaj göster */}
        {message && <pre>{message}</pre>}
        {/* Sorun listesi */}
        {issues.length > 0 && (
          <ul>
            {issues.map(issue => (
              <li key={issue}>
                {issue}
                {details[issue] && details[issue].length > 0 && (
                  <div>
                    {/* Detay göster/gizle butonu */}
                    <button onClick={() => setExpanded({
                      ...expanded,
                      [issue]: !expanded[issue]
                    })}>
                      {expanded[issue] ? 'Hide details' : 'Show details'}
                    </button>
                    {/* Detaylar */}
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
  // Giriş durumu
  const [loggedIn, setLoggedIn] = useState(false);
  // Kullanıcı adı ve şifre
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Giriş işlemi
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

  // Giriş yapılmamışsa form göster
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
        {/* Giriş butonu */}
        <button onClick={handleLogin}>Login</button>
      </div>
    );
  }

  // Giriş yapıldıktan sonra Uploader bileşenini göster
  return <Uploader />;
}

// Uygulamayı başlat
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
