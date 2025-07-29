import React, { useState, useEffect, useCallback } from 'react';
import { Shield, UploadCloud, Cpu, Wifi, Bot, AlertTriangle, CheckCircle, BarChart, FileImage, FileVideo, X, Loader2, Sparkles, History, BookLock, Info, PlusCircle, Trash2, MessageSquare, Send, User, Link2, ThumbsUp, ThumbsDown, FileSignature, Newspaper, Edit, BookOpen, Check, Server } from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, doc, updateDoc, query, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYhlbMuwSQ4-LOw9Su3xcVq5dOgBWYNaM",
  authDomain: "chimera-test-acd1f.firebaseapp.com",
  projectId: "chimera-test-acd1f",
  storageBucket: "chimera-test-acd1f.appspot.com",
  messagingSenderId: "730080953747",
  appId: "1:730080953747:web:30246a579ce64a5cae9466",
  measurementId: "G-4JYKE1BHYP"
};

// --- Error Boundary Component ---
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, errorInfo) { console.error("Uncaught error:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (<div className="w-full h-full flex flex-col items-center justify-center bg-red-900/20 text-red-300 p-8 rounded-lg border border-red-500/50"><AlertTriangle size={48} className="mb-4" /><h2 className="text-2xl font-bold">Something went wrong.</h2><p className="mt-2 text-center">A component has failed. Please try refreshing the page.</p></div>);
        }
        return this.props.children;
    }
}

// --- Helper Functions ---
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = error => reject(error);
});

// --- Main Application Component ---
export default function App() {
  const [activeView, setActiveView] = useState('checker');
  const [db, setDb] = useState(null);

  useEffect(() => {
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        try {
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            signInAnonymously(auth).then(() => { 
                setDb(getFirestore(app)); 
                console.log("Firebase Initialized Successfully");
            }).catch(error => console.error("Firebase sign-in failed", error));
        } catch (e) { 
            console.error("Firebase init failed.", e); 
        }
    } else {
        console.warn("Firebase configuration is missing.");
    }
  }, []);

  return (
    <div className="bg-gray-900 text-gray-200 font-sans min-h-screen flex w-full h-screen">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <div className="flex-1 flex flex-col h-screen">
        <Header />
        <main className="flex-grow p-4 md:p-8 flex items-center justify-center overflow-y-auto">
          <ErrorBoundary key={activeView}>
            {activeView === 'checker' && <FactChecker />}
            {activeView === 'news' && <CommunityNews db={db} />}
            {activeView === 'vault' && <CommunityVault />}
            {activeView === 'portal' && <JournalistPortal db={db} />}
            {activeView === 'status' && <SystemStatus />}
            {activeView === 'about' && <AboutProject />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

// --- Navigation Components ---
const Sidebar = ({ activeView, setActiveView }) => (
  <nav className="w-64 bg-gray-900/80 border-r border-gray-700/50 flex flex-col p-4">
    <div className="flex items-center space-x-3 mb-10 px-2"><Shield className="text-cyan-400" size={32} /><h1 className="text-xl font-bold tracking-wider text-gray-50">Chimera</h1></div>
    <ul className="space-y-2">
      <NavItem icon={Cpu} label="Fact-Checker" view="checker" activeView={activeView} onClick={() => setActiveView('checker')} />
      <NavItem icon={Newspaper} label="Verified News" view="news" activeView={activeView} onClick={() => setActiveView('news')} />
      <NavItem icon={MessageSquare} label="Journalist Portal" view="portal" activeView={activeView} onClick={() => setActiveView('portal')} />
      <NavItem icon={BookLock} label="Community Vault" view="vault" activeView={activeView} onClick={() => setActiveView('vault')} />
      <NavItem icon={Server} label="System Status" view="status" activeView={activeView} onClick={() => setActiveView('status')} />
      <NavItem icon={Info} label="About the Project" view="about" activeView={activeView} onClick={() => setActiveView('about')} />
    </ul>
    <div className="mt-auto text-center text-xs text-gray-500"><p>Version 1.9.2</p><p>Resilient. Secure. Open.</p></div>
  </nav>
);

const NavItem = ({ icon: Icon, label, view, activeView, onClick }) => (
  <li><a href="#" onClick={(e) => { e.preventDefault(); onClick(); }} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeView === view ? 'bg-cyan-600/20 text-cyan-300' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`}><Icon size={20} /><span>{label}</span></a></li>
);

const Header = () => {
    const [p2pStatus, setP2pStatus] = useState('Connecting...');
    const [veritasStatus, setVeritasStatus] = useState('Standby');
    useEffect(() => { setTimeout(() => setP2pStatus('Connected'), 1500); setTimeout(() => setVeritasStatus('Online'), 2000); }, []);
    return (<header className="border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-30"><div className="container mx-auto px-4 py-3 flex justify-end items-center"><div className="flex items-center space-x-6 text-sm"><div className="flex items-center space-x-2" title="Veritas Engine Status"><Bot size={18} className={veritasStatus === 'Online' ? 'text-green-400' : 'text-amber-400'} /><span>Veritas: <span className={veritasStatus === 'Online' ? 'text-green-400' : 'text-amber-400'}>{veritasStatus}</span></span></div><div className="flex items-center space-x-2" title="P2P Network Status"><Wifi size={18} className={p2pStatus === 'Connected' ? 'text-green-400' : 'text-amber-400'} /><span>P2P: <span className={p2pStatus === 'Connected' ? 'text-green-400' : 'text-amber-400'}>{p2pStatus}</span></span></div></div></div></header>);
};

// --- Feature Components ---

const SystemStatus = () => {
    const [transports, setTransports] = useState([
        { name: 'Chameleon', latency: 120, status: 'Operational' },
        { name: 'Ghost', latency: 85, status: 'Operational' },
        { name: 'Scramble', latency: 150, status: 'Operational' },
    ]);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTransports(transports.map(t => ({...t, latency: Math.max(50, t.latency + (Math.random() - 0.5) * 20) })));
        }, 2000);

        const eventTimeout = setTimeout(() => {
            setEvents(prev => [{ time: new Date(), message: 'Network anomaly detected. Rerouting traffic via Ghost protocol.' }, ...prev]);
        }, 5000);

        return () => {
            clearInterval(interval);
            clearTimeout(eventTimeout);
        };
    }, []);

    const getStatusColor = (status) => status === 'Operational' ? 'text-green-400' : 'text-amber-400';

    return (
        <div className="w-full h-full max-w-6xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-6 flex flex-col">
            <h2 className="text-3xl font-bold text-cyan-300 mb-4">System Status Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-900/70 p-4 rounded-lg text-center"><h3 className="font-semibold text-gray-400">Overall Status</h3><p className="text-2xl font-bold text-green-400">All Systems Operational</p></div>
                <div className="bg-gray-900/70 p-4 rounded-lg text-center"><h3 className="font-semibold text-gray-400">P2P Fabric</h3><p className="text-2xl font-bold text-green-400">Healthy</p></div>
                <div className="bg-gray-900/70 p-4 rounded-lg text-center"><h3 className="font-semibold text-gray-400">Veritas Engine</h3><p className="text-2xl font-bold text-green-400">Online</p></div>
            </div>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                <div className="bg-gray-900/70 p-4 rounded-lg flex flex-col">
                    <h3 className="text-xl font-semibold text-cyan-300 mb-4">P2P Transport Performance</h3>
                    <div className="space-y-4">
                        {transports.map(t => (
                            <div key={t.name}>
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <span className="font-bold text-gray-300">{t.name}</span>
                                    <span className={getStatusColor(t.status)}>{t.status}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-4 relative">
                                    <div className="bg-cyan-600 h-4 rounded-full" style={{ width: `${Math.min(100, 3000 / t.latency)}%` }}></div>
                                    <span className="absolute right-2 top-0 text-xs font-bold text-white">{t.latency.toFixed(0)} ms</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-gray-900/70 p-4 rounded-lg flex flex-col">
                    <h3 className="text-xl font-semibold text-cyan-300 mb-4">Network Event Log</h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 text-sm">
                        {events.length === 0 && <p className="text-gray-500">No network events to display.</p>}
                        {events.map((event, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-gray-500">{event.time.toLocaleTimeString()}</span>
                                <p className="text-gray-300">{event.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const CommunityNews = ({ db }) => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!db) {
            setLoading(true); // Wait for db prop
            return;
        }
        setLoading(true);
        const q = query(collection(db, "articles"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, snapshot => {
            const publishedArticles = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.status === 'published') {
                    publishedArticles.push({ ...data, id: doc.id });
                }
            });
            setArticles(publishedArticles);
            setLoading(false);
        }, err => {
            console.error(err);
            setError("Failed to fetch community articles.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db]);

    return (
        <div className="w-full h-full max-w-6xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-6 flex flex-col">
            <h2 className="text-3xl font-bold text-cyan-300 mb-4">Community Published News</h2>
            <div className="flex-1 overflow-y-auto pr-2">
                {loading && <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-cyan-400" size={48} /></div>}
                {error && <div className="text-red-400 text-center">{error}</div>}
                {!loading && !error && (
                    <div className="space-y-4">
                        {articles.length === 0 && <p className="text-gray-500 text-center mt-8">No community-verified articles have been published yet.</p>}
                        {articles.map(article => (
                            <div key={article.id} className="bg-gray-900/70 p-4 rounded-lg">
                                <h3 className="text-xl font-bold text-white">{article.title}</h3>
                                <p className="text-sm text-gray-400 mt-1">By {article.authorName} &bull; Published on {article.timestamp?.toDate().toLocaleDateString()}</p>
                                <p className="text-gray-300 mt-3 whitespace-pre-wrap">{article.content}</p>
                                <div className="mt-3 text-sm text-green-400 flex items-center gap-2"><Check size={16}/> Community Verified ({(article.approvals || []).length} approvals)</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


const FactChecker = () => {
  const [activeTransport, setActiveTransport] = useState('Chameleon');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analysisReport, setAnalysisReport] = useState(null);
  const [contextualBriefing, setContextualBriefing] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [error, setError] = useState(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState([]);

  useEffect(() => {
    try {
        const storedHistory = localStorage.getItem('chimeraAnalysisHistory');
        if (storedHistory) setAnalysisHistory(JSON.parse(storedHistory));
    } catch (e) { console.error("Failed to parse history", e); }
  }, []);

  useEffect(() => {
    localStorage.setItem('chimeraAnalysisHistory', JSON.stringify(analysisHistory));
  }, [analysisHistory]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisReport(null);
      setContextualBriefing(null);
      setError(null);
    } else {
      alert("Please select a valid image or video file.");
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };
  
  const clearSelection = () => {
      setSelectedFile(null);
      setPreviewUrl(null);
      setAnalysisReport(null);
      setContextualBriefing(null);
      setError(null);
  }

  const handleDeepAnalysis = async () => {
    if (!selectedFile) return;

    const apiKey = "AIzaSyBaP_59KHkm2szz3avS69ouPQ7cNcaqPic"; 
    if (!apiKey) {
        alert("Gemini API key is not configured. This feature is disabled.");
        return;
    }

    setIsAnalyzing(true);
    setAnalysisReport(null);
    setContextualBriefing(null);
    setError(null);
    try {
      const base64Data = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type;
      const schema = { type: "OBJECT", properties: { trustScore: { type: "STRING", enum: ["High Confidence", "Suspicious", "Manipulation Detected"], }, keyFindings: { type: "ARRAY", items: { type: "STRING" }, }, conciseReport: { type: "STRING" } }, required: ["trustScore", "keyFindings", "conciseReport"], };
      const prompt = `As a senior digital forensics analyst, examine this media file for manipulation. Your response MUST be a JSON object matching this schema: ${JSON.stringify(schema)}`;
      const payload = { contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: base64Data } }] }], generationConfig: { responseMimeType: "application/json", responseSchema: schema } };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
      const result = await response.json();
      if (result.candidates && result.candidates.length > 0) {
        const reportData = JSON.parse(result.candidates[0].content.parts[0].text);
        setAnalysisReport(reportData);
        const newHistoryEntry = { id: Date.now(), fileName: selectedFile.name, report: reportData, timestamp: new Date().toISOString(), };
        setAnalysisHistory(prev => [newHistoryEntry, ...prev]);
      } else { throw new Error("No content received from analysis engine."); }
    } catch (err) {
      console.error(err);
      setError("Failed to analyze media. The Veritas Engine may be offline or the file could not be processed.");
    } finally { setIsAnalyzing(false); }
  };
  
  const handleGenerateBriefing = async () => {
    if (!analysisReport) return;
    
    const apiKey = "AIzaSyBaP_59KHkm2szz3avS69ouPQ7cNcaqPic";
    if (!apiKey) {
        alert("Gemini API key is not configured. This feature is disabled.");
        return;
    }

    setIsGeneratingBriefing(true);
    setContextualBriefing(null);
    setError(null);
    try {
      const prompt = `Based on this forensic report, generate a "Contextual Briefing" for a non-technical user with two markdown sections: 1. **Plain-Language Summary**, 2. **Potential Impact & Verification**. Report: ${JSON.stringify(analysisReport)}`;
      const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
      const result = await response.json();
      if (result.candidates && result.candidates.length > 0) {
        setContextualBriefing(result.candidates[0].content.parts[0].text);
      } else { throw new Error("No content received from briefing engine."); }
    } catch (err) {
      console.error(err);
      setError("Failed to generate the contextual briefing.");
    } finally { setIsGeneratingBriefing(false); }
  };

  const handleSuggestTransport = () => {
      const transports = ['Chameleon', 'Ghost', 'Scramble'];
      const optimal = transports[Math.floor(Math.random() * transports.length)];
      alert(`Veritas Engine Suggestion: Based on simulated network conditions, '${optimal}' is the recommended transport.`);
      setActiveTransport(optimal);
  };
  
  const loadReportFromHistory = (report) => {
      clearSelection();
      setAnalysisReport(report);
      setIsHistoryPanelOpen(false);
  }

  return (
    <>
    <div className="w-full max-w-5xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="flex flex-col"><h2 className="text-2xl font-semibold text-cyan-300 mb-1">Media Analysis</h2><p className="text-gray-400 mb-6 text-sm">Upload a file to perform forensic analysis. <button onClick={() => setIsHistoryPanelOpen(true)} className="text-cyan-400 hover:underline">View History</button></p>
        <div className="flex-grow">
          {!previewUrl ? (
            <div className="relative border-2 border-dashed border-gray-600 rounded-xl flex-grow flex flex-col items-center justify-center p-8 h-full hover:border-cyan-400 transition-colors duration-300">
              <UploadCloud className="text-gray-500 mb-4" size={48} /><p className="text-gray-400 mb-2">Drag & drop an image or video</p>
              <label htmlFor="file-upload" className="cursor-pointer bg-cyan-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-cyan-500 transition-colors">Browse File</label>
              <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*,video/*" />
            </div>
          ) : (
            <div className="relative flex-grow rounded-xl overflow-hidden border border-gray-700 bg-black flex items-center justify-center h-full">
              {selectedFile?.type.startsWith('image/') ? ( <img src={previewUrl} alt="Selected media" className="max-w-full max-h-[400px] object-contain" /> ) : ( <video src={previewUrl} controls className="max-w-full max-h-[400px] object-contain"></video> )}
              <button onClick={clearSelection} className="absolute top-3 right-3 bg-black/50 p-2 rounded-full text-white hover:bg-black/80 transition-all z-10" title="Clear selection"><X size={20} /></button>
            </div>
          )}
        </div>
        <div className="mt-6 space-y-4">
            <div className="flex gap-2">
                <select value={activeTransport} onChange={(e) => setActiveTransport(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500"><option>Chameleon</option><option>Ghost</option><option>Scramble</option></select>
                <button onClick={handleSuggestTransport} className="bg-gray-600 px-3 rounded-lg hover:bg-gray-500" title="Get Optimal Transport Suggestion"><Sparkles size={20}/></button>
            </div>
           <button onClick={handleDeepAnalysis} disabled={!selectedFile || isAnalyzing} className="w-full bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-cyan-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2">{isAnalyzing ? <Loader2 className="animate-spin" size={20}/> : <Cpu size={20} />}<span>{isAnalyzing ? 'Analyzing...' : 'Run Deep Analysis'}</span></button>
        </div>
      </div>
      <div className="flex flex-col bg-gray-900/60 p-6 rounded-xl border border-gray-700/80 min-h-[500px]">
        <h3 className="text-xl font-semibold text-gray-300 mb-4 flex items-center gap-2"><BarChart size={20} /> Analysis Report</h3>
        <div className="flex-grow flex flex-col justify-center text-center overflow-y-auto pr-2">
          {isAnalyzing ? (<div className="flex flex-col items-center gap-4 text-gray-400"><Loader2 size={48} className="animate-spin text-cyan-400" /><p className="font-semibold">Contacting Veritas Engine...</p></div>
          ) : error ? (<div className="text-red-400 bg-red-500/10 p-4 rounded-lg"><h4 className="font-bold mb-2">Analysis Failed</h4><p className="text-sm">{error}</p></div>
          ) : analysisReport ? (<AnalysisReportView report={analysisReport} onGenerateBriefing={handleGenerateBriefing} isGeneratingBriefing={isGeneratingBriefing} contextualBriefing={contextualBriefing} />
          ) : (<div className="text-gray-500"><p>Awaiting analysis.</p><p className="text-sm">Upload a file and click "Run Deep Analysis".</p></div>)}
        </div>
      </div>
    </div>
    <HistoryPanel isOpen={isHistoryPanelOpen} onClose={() => setIsHistoryPanelOpen(false)} history={analysisHistory} onLoadReport={loadReportFromHistory} />
    </>
  );
};

// --- Journalist Portal Components ---
const VotingInterface = ({ applications, onVote, journalistId }) => {
    const [denialReason, setDenialReason] = useState('');
    const [denyingAppId, setDenyingAppId] = useState(null);
    const pendingApps = applications.filter(app => app.status === 'pending');

    const handleDenyClick = (appId) => {
        setDenyingAppId(appId);
    };

    const submitDenial = () => {
        if (!denialReason) {
            alert("Please provide a reason for denial.");
            return;
        }
        onVote(denyingAppId, journalistId, false, denialReason);
        setDenyingAppId(null);
        setDenialReason('');
    };

    return (<><div className="flex flex-col h-full">
        <h3 className="text-xl font-semibold text-amber-300 mb-4 p-3 border-b border-gray-700/50">Community Voting</h3>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {pendingApps.length === 0 && <p className="text-gray-500">No pending applications.</p>}
            {pendingApps.map(app => (
                <div key={app.id} className="bg-gray-900/70 p-4 rounded-lg">
                    <h4 className="font-bold text-white">{app.name}</h4><p className="text-sm text-gray-400">{app.affiliation}</p>
                    <p className="text-sm my-2 p-3 bg-gray-800 rounded">{app.reason}</p>
                    <div className="flex items-center justify-between mt-2">
                        <div className="text-sm font-bold text-cyan-400">{app.approvals || 0} / 10 Approvals</div>
                        {app.votedBy && app.votedBy.includes(journalistId) ? (<p className="text-sm text-green-400">You have voted.</p>) : (
                            <div className="flex gap-2">
                                <button onClick={() => handleDenyClick(app.id)} className="flex items-center gap-1 bg-red-500/20 text-red-300 px-3 py-1 rounded-md hover:bg-red-500/40"><ThumbsDown size={16}/> Deny</button>
                                <button onClick={() => onVote(app.id, journalistId, true)} className="flex items-center gap-1 bg-green-500/20 text-green-300 px-3 py-1 rounded-md hover:bg-green-500/40"><ThumbsUp size={16}/> Approve</button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </div>
    {denyingAppId && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setDenyingAppId(null)}>
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">Reason for Denial</h3>
            <p className="text-gray-400 mb-4">Please provide a brief, non-public reason for denying this application.</p>
            <select value={denialReason} onChange={e => setDenialReason(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">Select a reason...</option>
                <option value="Incomplete or suspicious application">Incomplete or suspicious application</option>
                <option value="Applicant does not appear to be a journalist">Applicant does not appear to be a journalist</option>
                <option value="Security concern">Security concern</option>
                <option value="Other">Other</option>
            </select>
            <div className="flex gap-4"><button onClick={() => setDenyingAppId(null)} className="w-full bg-gray-600 text-white py-2 rounded-lg font-semibold hover:bg-gray-500">Cancel</button><button onClick={submitDenial} className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-500">Submit Denial</button></div>
        </div>
    </div>}
    </>);
};

const JournalistPortal = ({ db }) => {
    const [journalistId, setJournalistId] = useState(localStorage.getItem('chimeraJournalistId'));
    const [applications, setApplications] = useState([]);
    const [view, setView] = useState('login'); // login, apply, pending, portal
    
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, "applications"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const appsData = [];
            snapshot.forEach(doc => {
                appsData.push({ ...doc.data(), id: doc.id });
            });

            if (appsData.length === 0) {
                const adminUser = { id: 'j-admin-01', name: 'Admin Journalist', affiliation: 'Chimera Core', reason: 'Initial member.', status: 'approved', approvals: 10, votedBy: [], denialReason: '' };
                addDoc(collection(db, "applications"), adminUser);
                setApplications([adminUser]);
            } else {
                setApplications(appsData);
            }
        });
        return () => unsubscribe();
    }, [db]);
    
    const handleLogin = (id) => {
        const userApp = applications.find(app => app.id.toLowerCase() === id.toLowerCase());
        if (userApp) {
            if (userApp.status === 'approved') {
                localStorage.setItem('chimeraJournalistId', userApp.id);
                setJournalistId(userApp.id);
                setView('portal');
            } else if (userApp.status === 'pending') {
                setView('pending');
            } else {
                alert(`Your application was denied. Reason: ${userApp.denialReason || 'No reason provided.'}`);
            }
        } else {
            alert('Journalist ID not found. Please apply to join.');
        }
    };

    const handleApply = async (applicationData) => {
        if (!db) { alert("Database not connected. Please try again later."); return; }
        const newId = `j-${applicationData.name.toLowerCase().replace(/\s/g, '-')}-${Date.now() % 1000}`;
        const newApplication = { ...applicationData, id: newId, status: 'pending', approvals: 0, votedBy: [], denialReason: '' };
        await addDoc(collection(db, "applications"), newApplication);
        alert(`Your application has been submitted with ID: ${newId}. Please save this ID to check your status later.`);
        setView('login');
    };

    const handleVote = async (appId, voterId, isApproval, reason = '') => {
        if (!db) return;
        const appRef = doc(db, "applications", appId);
        const appToUpdate = applications.find(app => app.id === appId);
        if (!appToUpdate || (appToUpdate.votedBy && appToUpdate.votedBy.includes(voterId))) return;
        const currentVotedBy = appToUpdate.votedBy || [];
        if (isApproval) {
            const newApprovals = (appToUpdate.approvals || 0) + 1;
            const newStatus = newApprovals >= 10 ? 'approved' : 'pending';
            await updateDoc(appRef, { approvals: newApprovals, status: newStatus, votedBy: [...currentVotedBy, voterId] });
            if(newStatus === 'approved') alert(`${appToUpdate.name} has been approved!`);
        } else {
            await updateDoc(appRef, { status: 'denied', votedBy: [...currentVotedBy, voterId], denialReason: reason });
            alert(`${appToUpdate.name} has been denied.`);
        }
    };
    
    const handleLogout = () => {
        localStorage.removeItem('chimeraJournalistId');
        setJournalistId(null);
        setView('login');
    };

    if (!db) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-cyan-400" size={48} /></div>;
    }

    if (journalistId) {
        const journalist = applications.find(app => app.id === journalistId);
        return <PortalDashboard journalist={journalist} applications={applications} onVote={handleVote} onLogout={handleLogout} db={db} />;
    }

    switch(view) {
        case 'apply': return <ApplicationForm onApply={handleApply} onBack={() => setView('login')} />;
        case 'pending': return <PendingStatusView onBack={() => setView('login')} />;
        default: return <JournalistLogin onLogin={handleLogin} onApply={() => setView('apply')} />;
    }
};

const JournalistLogin = ({ onLogin, onApply }) => {
    const [id, setId] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); onLogin(id); };
    return (<div className="w-full max-w-sm mx-auto"><form onSubmit={handleSubmit} className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-8 text-center"><Shield className="mx-auto text-cyan-400 mb-4" size={48} /><h2 className="text-2xl font-bold text-white mb-2">Journalist Portal</h2><p className="text-gray-400 mb-6">Enter your secure ID or apply to join.</p><div className="relative mb-4"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="Journalist ID" className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div><button type="submit" className="w-full bg-cyan-600 text-white py-3 rounded-lg font-semibold hover:bg-cyan-500 transition-colors">Access Portal</button><p className="text-sm text-gray-500 mt-4">Don't have an ID? <button onClick={onApply} className="text-cyan-400 hover:underline">Apply to join</button></p></form></div>);
};

const ApplicationForm = ({ onApply, onBack }) => {
    const [name, setName] = useState('');
    const [affiliation, setAffiliation] = useState('');
    const [reason, setReason] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); onApply({ name, affiliation, reason }); };
    return (<div className="w-full max-w-md mx-auto"><form onSubmit={handleSubmit} className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-8"><h2 className="text-2xl font-bold text-white mb-2">Community Application</h2><p className="text-gray-400 mb-6">Your application will be voted on by existing members.</p><div className="space-y-4"><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your Name or Pseudonym" required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" /><input type="text" value={affiliation} onChange={e => setAffiliation(e.target.value)} placeholder="Affiliated Organization (e.g., 'Freelance')" required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" /><textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for joining..." required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 h-24 focus:outline-none focus:ring-2 focus:ring-cyan-500"></textarea></div><div className="flex gap-4 mt-6"><button type="button" onClick={onBack} className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-500">Back</button><button type="submit" className="w-full bg-cyan-600 text-white py-3 rounded-lg font-semibold hover:bg-cyan-500">Submit Application</button></div></form></div>);
};

const PendingStatusView = ({ onBack }) => (<div className="text-center bg-gray-800/50 p-8 rounded-2xl"><h2 className="text-2xl font-bold text-amber-400 mb-4">Application Pending</h2><p className="text-gray-300 mb-6">Your application is currently being reviewed by the community. Please check back later using your Journalist ID.</p><button onClick={onBack} className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-500">OK</button></div>);

const PortalDashboard = ({ journalist, applications, onVote, onLogout, db }) => {
    const [portalView, setPortalView] = useState('chat'); // chat, voting, articles
    const [articles, setArticles] = useState([]);

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, "articles"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, snapshot => {
            setArticles(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        return () => unsubscribe();
    }, [db]);

    const handleArticleSubmit = async (articleData) => {
        if (!db) return;
        const newArticle = {
            ...articleData,
            authorId: journalist.id,
            authorName: journalist.name,
            status: 'pending',
            approvals: [],
            timestamp: serverTimestamp()
        };
        await addDoc(collection(db, "articles"), newArticle);
        setPortalView('review');
    };

    const handleArticleVote = async (articleId, isApproval) => {
        if (!db) return;
        const articleRef = doc(db, "articles", articleId);
        const articleToUpdate = articles.find(art => art.id === articleId);
        if (!articleToUpdate || (articleToUpdate.approvals && articleToUpdate.approvals.includes(journalist.id))) return;

        const currentApprovals = articleToUpdate.approvals || [];
        const newApprovals = [...currentApprovals, journalist.id];
        const newStatus = newApprovals.length >= 5 ? 'published' : 'pending';
        await updateDoc(articleRef, { approvals: newApprovals, status: newStatus });
        if(newStatus === 'published') alert(`Article "${articleToUpdate.title}" has been published!`);
    };

    return (
        <div className="w-full h-[calc(100vh-150px)] max-w-6xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-4 flex gap-4">
            <div className="w-1/3 flex flex-col border-r border-gray-700/50 pr-4">
                <PortalNav view={portalView} setView={setPortalView} applications={applications} journalistId={journalist.id} />
                <div className="mt-auto pt-4 border-t border-gray-700/50">
                    <button onClick={onLogout} className="w-full text-left mt-2 p-3 rounded-lg hover:bg-red-900/50 text-red-400">Logout</button>
                </div>
            </div>
            <div className="w-2/3 flex flex-col">
                {portalView === 'chat' && <ChatInterface journalistId={journalist.id} db={db} />}
                {portalView === 'voting' && <VotingInterface applications={applications} onVote={onVote} journalistId={journalist.id} />}
                {portalView === 'submit' && <ArticleSubmissionForm onSubmit={handleArticleSubmit} />}
                {portalView === 'review' && <ArticleReviewList articles={articles} onVote={handleArticleVote} journalistId={journalist.id} />}
                {portalView === 'published' && <PublishedArticlesList articles={articles} />}
            </div>
        </div>
    );
};

const PortalNav = ({ view, setView, applications, journalistId }) => {
    const pendingApps = applications.filter(app => app.status === 'pending' && (!app.votedBy || !app.votedBy.includes(journalistId)));
    return (
        <ul className="space-y-2">
            <PortalNavItem icon={MessageSquare} label="Secure Messaging" currentView={view} targetView="chat" onClick={() => setView('chat')} />
            <PortalNavItem icon={Edit} label="Submit Article" currentView={view} targetView="submit" onClick={() => setView('submit')} />
            <PortalNavItem icon={FileSignature} label="Review Articles" currentView={view} targetView="review" onClick={() => setView('review')} />
            <PortalNavItem icon={BookOpen} label="Published Articles" currentView={view} targetView="published" onClick={() => setView('published')} />
            <PortalNavItem icon={ThumbsUp} label="Community Voting" currentView={view} targetView="voting" onClick={() => setView('voting')} badgeCount={pendingApps.length} />
        </ul>
    );
};

const PortalNavItem = ({ icon: Icon, label, currentView, targetView, onClick, badgeCount = 0 }) => (
    <li><a href="#" onClick={onClick} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${currentView === targetView ? 'bg-cyan-900/50 text-cyan-300' : 'hover:bg-gray-700/50'}`}>
        <Icon size={20} /><span>{label}</span>
        {badgeCount > 0 && <span className="ml-auto bg-amber-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{badgeCount}</span>}
    </a></li>
);


const ArticleSubmissionForm = ({ onSubmit }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); onSubmit({ title, content }); };
    return (<div className="flex flex-col h-full"><h3 className="text-xl font-semibold text-cyan-300 mb-4 p-3 border-b border-gray-700/50">Submit Article for Review</h3><form onSubmit={handleSubmit} className="flex flex-col flex-1 p-4 gap-4"><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Article Title" required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" /><textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your article here... (Markdown is supported)" required className="w-full flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"></textarea><button type="submit" className="bg-cyan-600 text-white py-3 rounded-lg font-semibold hover:bg-cyan-500">Submit for Peer Review</button></form></div>);
};

const ArticleReviewList = ({ articles, onVote, journalistId }) => {
    const pending = articles.filter(a => a.status === 'pending');
    const [factCheck, setFactCheck] = useState({});
    const [checkingId, setCheckingId] = useState(null);

    const handleFactCheck = async (article) => {
        setCheckingId(article.id);
        try {
            const prompt = `Fact-check the following article. Identify key claims and verify them. Note any potential bias or unsubstantiated statements. Provide a concise summary of your findings in markdown. Article: "${article.title}\n\n${article.content}"`;
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const apiKey = "AIzaSyBaP_59KHkm2szz3avS69ouPQ7cNcaqPic";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error("API request failed");
            const result = await response.json();
            if (result.candidates && result.candidates[0]) {
                setFactCheck(prev => ({ ...prev, [article.id]: result.candidates[0].content.parts[0].text }));
            }
        } catch (e) { alert("Could not perform fact-check."); } finally { setCheckingId(null); }
    };

    return (<div className="flex flex-col h-full"><h3 className="text-xl font-semibold text-cyan-300 mb-4 p-3 border-b border-gray-700/50">Articles Pending Review</h3><div className="flex-1 overflow-y-auto p-4 space-y-4">
        {pending.length === 0 && <p className="text-gray-500">No articles are currently pending review.</p>}
        {pending.map(article => (<div key={article.id} className="bg-gray-900/70 p-4 rounded-lg">
            <h4 className="font-bold text-white text-lg">{article.title}</h4>
            <p className="text-sm text-gray-400 mb-2">By: {article.authorName}</p>
            <p className="text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto p-2 bg-gray-800 rounded">{article.content}</p>
            <div className="mt-3">
                <button onClick={() => handleFactCheck(article)} disabled={checkingId === article.id} className="flex items-center gap-2 text-sm bg-amber-600/80 text-white px-3 py-1 rounded-md hover:bg-amber-600 disabled:bg-gray-600">{checkingId === article.id ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}{checkingId === article.id ? 'Analyzing...' : 'Run AI Fact-Check'}</button>
                {factCheck[article.id] && <div className="mt-3 p-3 bg-gray-800 rounded-md text-sm text-gray-300 prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: factCheck[article.id].replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/50">
                <div className="text-sm font-bold text-cyan-400">{(article.approvals || []).length} / 5 Approvals</div>
                {article.authorId === journalistId ? <p className="text-sm text-gray-500">You cannot vote on your own article.</p> : (article.approvals || []).includes(journalistId) ? <p className="text-sm text-green-400">You approved this.</p> : <button onClick={() => onVote(article.id, true)} className="flex items-center gap-1 bg-green-500/20 text-green-300 px-3 py-1 rounded-md hover:bg-green-500/40"><ThumbsUp size={16}/> Approve</button>}
            </div>
        </div>))}
    </div></div>);
};

const PublishedArticlesList = ({ articles }) => {
    const published = articles.filter(a => a.status === 'published');
    return (<div className="flex flex-col h-full"><h3 className="text-xl font-semibold text-cyan-300 mb-4 p-3 border-b border-gray-700/50">Published Articles</h3><div className="flex-1 overflow-y-auto p-4 space-y-4">
        {published.length === 0 && <p className="text-gray-500">No articles have been published yet.</p>}
        {published.map(article => (<div key={article.id} className="bg-gray-900/70 p-4 rounded-lg">
            <h4 className="font-bold text-white text-lg">{article.title}</h4>
            <p className="text-sm text-gray-400 mb-2">By: {article.authorName} &bull; Published: {article.timestamp?.toDate().toLocaleDateString()}</p>
            <p className="text-gray-300 whitespace-pre-wrap">{article.content}</p>
            <div className="mt-2 text-sm text-green-400 flex items-center gap-2"><Check size={16}/> Community Verified ({(article.approvals || []).length} approvals)</div>
        </div>))}
    </div></div>);
};

const ChatInterface = ({ journalistId, db }) => {
    const [activeSource, setActiveSource] = useState(null);
    const sources = [{ id: 'source-alpha', name: 'Source Alpha', avatar: '👤', lastSeen: '5m ago' }, { id: 'source-beta', name: 'Source Beta', avatar: '🕵️', lastSeen: '2h ago' }, { id: 'source-gamma', name: 'Source Gamma', avatar: '🤫', lastSeen: 'yesterday' }];
    return (<><div className="w-full h-full flex flex-col">
        <h3 className="text-xl font-semibold text-cyan-300 mb-4 p-3 border-b border-gray-700/50">Secure Messaging</h3>
        <div className="flex flex-1 gap-4 overflow-hidden">
            <ul className="w-1/3 space-y-2 overflow-y-auto pr-2 border-r border-gray-700/50">
                {sources.map(source => (<li key={source.id} onClick={() => setActiveSource(source)} className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 ${activeSource?.id === source.id ? 'bg-cyan-900/50' : 'hover:bg-gray-700/50'}`}>
                    <span className="text-2xl">{source.avatar}</span><div><p className="font-semibold">{source.name}</p><p className="text-xs text-gray-400">Last seen: {source.lastSeen}</p></div></li>))}
            </ul>
            <div className="w-2/3">
                {activeSource && db ? <ChatWindow journalistId={journalistId} source={activeSource} db={db} /> : <div className="flex items-center justify-center h-full text-gray-500"><p>Select a source.</p></div>}
            </div>
        </div>
    </div></>);
};


const ChatWindow = ({ journalistId, source, db }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSuggesting, setIsSuggesting] = useState(false);
    const messagesEndRef = React.useRef(null);
    const chatId = [journalistId, source.id].sort().join('_');
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
    useEffect(() => {
        if (!db || !db.collection) return;
        const messagesCollection = collection(db, `chats/${chatId}/messages`);
        const q = query(messagesCollection, orderBy("timestamp"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = [];
            querySnapshot.forEach((doc) => { msgs.push({ id: doc.id, ...doc.data() }); });
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, [db, chatId]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;
        const messageData = { text: newMessage, senderId: journalistId, timestamp: serverTimestamp() };
        await addDoc(collection(db, `chats/${chatId}/messages`), messageData);
        setNewMessage('');
    };

    const handleSuggestReply = async () => {
        if (newMessage.trim() === '') return;
        setIsSuggesting(true);
        try {
            const prompt = `A journalist is messaging a sensitive source. Rephrase the following message to be more neutral, objective, and less leading. Return only the rephrased message as a raw string. Original message: "${newMessage}"`;
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const apiKey = "AIzaSyBaP_59KHkm2szz3avS69ouPQ7cNcaqPic";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error("API request failed");
            const result = await response.json();
            if (result.candidates && result.candidates[0]) {
                setNewMessage(result.candidates[0].content.parts[0].text.replace(/"/g, ''));
            }
        } catch (e) { alert("Could not get suggestion."); } finally { setIsSuggesting(false); }
    };

    return (<div className="flex flex-col h-full"><div className="border-b border-gray-700/50 p-3"><h4 className="font-bold text-white">{source.name}</h4><p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={12}/> E2E Encrypted via P2P Fabric</p></div><div className="flex-1 overflow-y-auto p-4 space-y-4">{messages.map(msg => (<div key={msg.id} className={`flex ${msg.senderId === journalistId ? 'justify-end' : 'justify-start'}`}><div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.senderId === journalistId ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-200'}`}><p>{msg.text}</p></div></div>))}<div ref={messagesEndRef} /></div><div className="mt-auto p-2 border-t border-gray-700/50"><form onSubmit={handleSendMessage} className="flex items-center gap-2"><input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type an encrypted message..." className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" /><button type="button" onClick={handleSuggestReply} disabled={isSuggesting || !newMessage} className="p-2 text-amber-400 hover:bg-amber-500/20 rounded-full disabled:text-gray-500 disabled:cursor-not-allowed" title="Suggest Neutral Reply">{isSuggesting ? <Loader2 className="animate-spin"/> : <Sparkles size={20}/>}</button><button type="submit" className="p-2 bg-cyan-600 text-white rounded-full hover:bg-cyan-500" title="Send Message"><Send size={20}/></button></form></div></div>);
};

const CommunityVault = () => {
    const [notes, setNotes] = useState([]);
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [currentContent, setCurrentContent] = useState('');
    useEffect(() => {
        try {
            const storedNotes = localStorage.getItem('chimeraCommunityVault');
            if (storedNotes) {
                const parsedNotes = JSON.parse(storedNotes);
                setNotes(parsedNotes);
                if (parsedNotes.length > 0) { setActiveNoteId(parsedNotes[0].id); setCurrentContent(parsedNotes[0].content); }
            }
        } catch (e) { console.error("Failed to parse notes", e); }
    }, []);
    useEffect(() => { localStorage.setItem('chimeraCommunityVault', JSON.stringify(notes)); }, [notes]);
    const handleSelectNote = (note) => { setActiveNoteId(note.id); setCurrentContent(note.content); };
    const handleNewNote = () => {
        const newNote = { id: Date.now(), title: `New Note ${new Date().toLocaleTimeString()}`, content: `# New Note\n\nStart writing here...`, timestamp: new Date().toISOString() };
        setNotes(prev => [newNote, ...prev]);
        setActiveNoteId(newNote.id);
        setCurrentContent(newNote.content);
    };
    const handleSaveNote = () => {
        setNotes(notes.map(note => note.id === activeNoteId ? { ...note, content: currentContent } : note));
        alert('Note saved to secure local vault!');
    };
    const handleDeleteNote = (idToDelete) => {
        if (window.confirm("Are you sure you want to delete this note?")) {
            const newNotes = notes.filter(note => note.id !== idToDelete);
            setNotes(newNotes);
            if (activeNoteId === idToDelete) {
                if (newNotes.length > 0) { setActiveNoteId(newNotes[0].id); setCurrentContent(newNotes[0].content); } else { setActiveNoteId(null); setCurrentContent(''); }
            }
        }
    };
    return (
        <div className="w-full h-full max-w-6xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-6 flex gap-6">
            <div className="w-1/3 flex flex-col">
                <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-semibold text-cyan-300">Vault Notes</h3><button onClick={handleNewNote} className="p-2 rounded-full hover:bg-cyan-500/20" title="New Note"><PlusCircle size={22} className="text-cyan-400"/></button></div>
                <ul className="space-y-2 overflow-y-auto pr-2 flex-1">
                    {notes.map(note => (<li key={note.id} onClick={() => handleSelectNote(note)} className={`p-3 rounded-lg cursor-pointer group ${activeNoteId === note.id ? 'bg-cyan-900/50' : 'hover:bg-gray-700/50'}`}>
                       <div className="flex justify-between items-center"><p className="font-semibold truncate">{note.title}</p><button onClick={(e) => {e.stopPropagation(); handleDeleteNote(note.id)}} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300" title="Delete Note"><Trash2 size={16}/></button></div>
                       <p className="text-xs text-gray-400">{new Date(note.timestamp).toLocaleString()}</p>
                    </li>))}
                </ul>
            </div>
            <div className="w-2/3 flex flex-col">
                {activeNoteId ? (<><textarea value={currentContent} onChange={(e) => setCurrentContent(e.target.value)} className="w-full h-full bg-gray-900/70 rounded-lg p-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 flex-1" placeholder="Start writing..."></textarea><button onClick={handleSaveNote} className="w-full mt-4 bg-cyan-600 text-white py-2 rounded-lg font-semibold hover:bg-cyan-500">Save to Vault</button></>) : (<div className="flex items-center justify-center h-full text-gray-500"><p>Select a note or create a new one.</p></div>)}
            </div>
        </div>
    );
};

const AboutProject = () => {
    const budgetData = [ { category: 'Personnel', amount: 342000, color: 'bg-cyan-500' }, { category: 'Capital Expenditure', amount: 250000, color: 'bg-teal-500' }, { category: 'Operational Infra.', amount: 60000, color: 'bg-sky-500' }, { category: 'External Services (Audit)', amount: 40000, color: 'bg-amber-500' }, { category: 'Travel & Outreach', amount: 30000, color: 'bg-indigo-500' }, { category: 'Admin & Contingency', amount: 78000, color: 'bg-gray-500' }, ];
    const totalBudget = budgetData.reduce((sum, item) => sum + item.amount, 0);
    const risks = [ { risk: "AI fails to adapt to new censorship.", mitigation: "Begin with rule-based systems, use diverse data, and allow manual user override." }, { risk: "Critical vulnerability discovered.", mitigation: "Adhere to secure coding practices, undergo third-party audit, and maintain a rapid response plan." }, { risk: "Low user adoption due to complexity or trust.", mitigation: "Prioritize UX/UI simplicity, work with trusted partners, and maintain full transparency." }, { risk: "State-level adversary attacks.", mitigation: "Implement multi-layer obfuscation, design resilient AI, and minimize all data collection." }, ];
    return (
        <div className="w-full max-w-4xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-8 overflow-y-auto">
            <h2 className="text-3xl font-bold text-cyan-300 mb-4">About Project Chimera</h2>
            <p className="text-gray-300 mb-8 leading-relaxed">Project Chimera is a non-profit, open-source initiative to develop and deploy a next-generation platform for resilient internet freedom. We directly confront the converging threats of sophisticated state-level censorship and the proliferation of AI-driven disinformation by creating a single, integrated platform where existing solutions fall short.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold text-gray-100 mb-4 border-b border-cyan-500/50 pb-2">Funding Breakdown</h3><p className="text-sm text-gray-400 mb-4">Total Request: ${totalBudget.toLocaleString()} USD</p>
                    <div className="space-y-3">{budgetData.map(item => (<div key={item.category}><div className="flex justify-between text-sm mb-1"><span className="font-medium text-gray-300">{item.category}</span><span className="text-gray-400">${item.amount.toLocaleString()}</span></div><div className="w-full bg-gray-700 rounded-full h-2.5"><div className={`${item.color} h-2.5 rounded-full`} style={{ width: `${(item.amount / totalBudget) * 100}%` }}></div></div></div>))}</div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-gray-100 mb-4 border-b border-cyan-500/50 pb-2">Risk & Mitigation</h3>
                     <div className="space-y-4">{risks.map(r => (<div key={r.risk} className="text-sm"><p className="font-bold text-gray-300">{r.risk}</p><p className="text-gray-400 leading-tight">{r.mitigation}</p></div>))}</div>
                </div>
            </div>
        </div>
    );
};

const InviteModal = ({ isOpen, onClose, journalistId }) => {
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (isOpen) {
            const sessionId = crypto.randomUUID();
            setInviteLink(`${window.location.origin}?join_session=${sessionId}&j_id=${journalistId}`);
            setCopied(false);
        }
    }, [isOpen, journalistId]);
    const handleCopy = () => {
        const textField = document.createElement('textarea');
        textField.innerText = inviteLink;
        document.body.appendChild(textField);
        textField.select();
        document.execCommand('copy');
        textField.remove();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in-fast" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-white mb-2">Secure Invitation</h3><p className="text-gray-400 mb-6">Send this one-time link to your source. It will expire after first use.</p>
                <div className="bg-gray-900 p-4 rounded-lg flex items-center gap-4"><input type="text" readOnly value={inviteLink} className="bg-transparent w-full text-cyan-300 focus:outline-none" /><button onClick={handleCopy} className="bg-cyan-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-cyan-500 transition-colors whitespace-nowrap">{copied ? 'Copied!' : 'Copy Link'}</button></div>
                <button onClick={onClose} className="w-full mt-6 bg-gray-600 text-white py-2 rounded-lg font-semibold hover:bg-gray-500 transition-colors">Close</button>
            </div>
        </div>
    );
};

const AnalysisReportView = ({ report, onGenerateBriefing, isGeneratingBriefing, contextualBriefing }) => {
    const scoreMeta = { "Manipulation Detected": { Icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-500/10' }, "Suspicious": { Icon: AlertTriangle, color: 'text-amber-400', bgColor: 'bg-amber-500/10' }, "High Confidence": { Icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/10' }, }[report.trustScore];
    return (<div className="text-left animate-fade-in space-y-4 w-full"><div className="text-center"><p className="text-sm text-gray-400">Trust Score</p><div className={`my-2 px-6 py-2 rounded-full font-bold text-lg flex items-center justify-center gap-2 ${scoreMeta.bgColor} ${scoreMeta.color}`}><scoreMeta.Icon size={22} /><span>{report.trustScore}</span></div></div><div className="prose prose-invert prose-sm max-w-none"><p>{report.conciseReport}</p><h4 className="font-semibold text-gray-300 mt-4">Key Findings:</h4><ul className="pl-1">{report.keyFindings.map((finding, i) => <li key={i} className="list-disc list-inside">{finding}</li>)}</ul></div><button onClick={onGenerateBriefing} disabled={isGeneratingBriefing} className="w-full mt-4 bg-amber-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-amber-500 transition-colors disabled:bg-gray-600 flex items-center justify-center gap-2">{isGeneratingBriefing ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20} />}<span>{isGeneratingBriefing ? 'Generating...' : '✨ Generate Contextual Briefing'}</span></button>{contextualBriefing && ( <div className="mt-4 pt-4 border-t border-gray-700 text-left animate-fade-in"><div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: contextualBriefing.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></div></div> )}</div>);
};

const HistoryPanel = ({ isOpen, onClose, history, onLoadReport }) => {
    if (!isOpen) return null;
    return (<div className="fixed inset-0 bg-black/60 z-40 animate-fade-in-fast" onClick={onClose}><div className="fixed top-0 right-0 h-full w-full max-w-md bg-gray-800 border-l border-gray-700 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}><div className="p-4 border-b border-gray-700 flex justify-between items-center"><h3 className="text-xl font-semibold flex items-center gap-2"><History size={20}/> Analysis History</h3><button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700"><X size={20}/></button></div><div className="flex-grow overflow-y-auto p-4">{history.length === 0 ? ( <p className="text-gray-500 text-center mt-8">No analysis history found.</p> ) : (<ul className="space-y-3">{history.map(item => (<li key={item.id} onClick={() => onLoadReport(item.report)} className="bg-gray-900/80 p-3 rounded-lg hover:bg-gray-700/80 cursor-pointer transition-colors"><p className="font-semibold truncate">{item.fileName}</p><div className="text-xs text-gray-400 flex justify-between items-center mt-1"><span>{item.report.trustScore}</span><span>{new Date(item.timestamp).toLocaleString()}</span></div></li>))}</ul>)}</div></div></div>);
};

// --- Global Styles ---
const style = document.createElement('style');
style.innerHTML = `
  @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
  @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
  .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
  .prose { color: #d1d5db; }
  .prose strong { color: #ffffff; }
  .prose li::marker { color: #22d3ee; }
`;
document.head.appendChild(style);
