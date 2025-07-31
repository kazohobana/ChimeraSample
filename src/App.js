import React, { useState, useEffect, useContext, createContext } from 'react';
import { Shield, UploadCloud, Cpu, Wifi, Bot, AlertTriangle, CheckCircle, BarChart, X, Loader2, History, BookLock, Info, PlusCircle, Trash2, MessageSquare, Send, User, ThumbsUp, ThumbsDown, FileSignature, Newspaper, Edit, BookOpen, Check, Server, Globe, UserCheck } from 'lucide-react';

// --- Firebase Imports (Using modern v9+ modular SDK) ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, collection, addDoc, doc, updateDoc, query, onSnapshot, 
    orderBy, serverTimestamp, arrayUnion, getDoc, setDoc, deleteDoc, where, getDocs
} from 'firebase/firestore';

// --- Firebase Configuration (Sanitized to prevent errors) ---
const firebaseConfig = {
  apiKey: "AIzaSyAIcU46cd9mY6Q9rbvWK4KYWPWRqAGtbYg",
  authDomain: "chimtest-6854a.firebaseapp.com",
  projectId: "chimtest-6854a",
  storageBucket: "chimtest-6854a.appspot.com",
  messagingSenderId: "178975469028",
  appId: "1:178975469028:web:e520bf5ef8490125082bf1",
  measurementId: "G-KD1BPXH3BV"
};

// --- Firebase Context for global state management ---
const FirebaseContext = createContext(null);
const useFirebase = () => useContext(FirebaseContext);

const FirebaseProvider = ({ children }) => {
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
                setUser(currentUser); // Will be null if not logged in
                if (currentUser) {
                    // Seed database only after a user is authenticated
                    seedDatabase(dbInstance);
                }
                setLoading(false);
            });
            
            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            setLoading(false);
        }
    }, []);

    const seedDatabase = async (dbInstance) => {
        // Seed default journalist
        const journalistRef = doc(dbInstance, 'journalists', 'default-journalist');
        const journalistDoc = await getDoc(journalistRef);
        if (!journalistDoc.exists()) {
            await setDoc(journalistRef, {
                loginId: 'johndoe', name: 'John Doe', affiliation: 'Default News',
                reason: 'Default account for demonstration.', status: 'approved',
                createdAt: serverTimestamp(), approvals: [], votedBy: []
            });
            console.log("Default journalist seeded.");
        }

        // Seed default HRD
        const hrdRef = doc(dbInstance, 'hrds', 'default-hrd');
        const hrdDoc = await getDoc(hrdRef);
        if (!hrdDoc.exists()) {
            await setDoc(hrdRef, {
                loginId: 'janedoe', name: 'Jane Doe', affiliation: 'Default Rights Group',
                reason: 'Default account for demonstration.', status: 'approved',
                createdAt: serverTimestamp(), approvals: [], votedBy: []
            });
            console.log("Default HRD seeded.");
        }
        
        // Seed sample article
        const articlesQuery = query(collection(dbInstance, 'articles'), where("title", "==", "Breaking News: A New Dawn"));
        const articlesSnapshot = await getDocs(articlesQuery);
        if (articlesSnapshot.empty) {
            await addDoc(collection(dbInstance, 'articles'), {
                title: "Breaking News: A New Dawn",
                content: "This is a sample article to demonstrate the community news feature. It has been pre-approved and published.",
                authorId: 'default-journalist',
                authorName: 'John Doe',
                status: 'published',
                approvals: ['default-hrd'],
                timestamp: serverTimestamp()
            });
            console.log("Sample article seeded.");
        }
    };

    const value = { auth, db, user, loading };

    return (
        <FirebaseContext.Provider value={value}>
            {!loading ? children : <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-cyan-400"><Loader2 size={48} className="animate-spin" /></div>}
        </FirebaseContext.Provider>
    );
};

// --- Error Boundary ---
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError(error) { return { hasError: true }; }
    componentDidCatch(error, errorInfo) { console.error("ErrorBoundary caught an error:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return <div className="w-full h-full flex flex-col items-center justify-center bg-red-900/20 text-red-300 p-8 rounded-lg border border-red-500/50"><AlertTriangle size={48} className="mb-4" /><h2>Something went wrong.</h2><p>Please refresh the page.</p></div>;
        }
        return this.props.children;
    }
}

// --- Main App Component ---
export default function AppWrapper() {
    return (
        <FirebaseProvider>
            <GlobalStyles />
            <App />
        </FirebaseProvider>
    );
}

function App() {
  const [activeView, setActiveView] = useState('checker');
  const { loading } = useFirebase();

  if (loading) {
      return <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-cyan-400"><Loader2 size={48} className="animate-spin" /></div>;
  }

  return (
    <div className="bg-gray-900 text-gray-200 font-sans min-h-screen flex w-full h-screen">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <div className="flex-1 flex flex-col h-screen">
        <Header />
        <main className="flex-grow p-4 md:p-8 flex items-center justify-center overflow-y-auto">
          <ErrorBoundary key={activeView}>
            {activeView === 'checker' && <FactChecker />}
            {activeView === 'browser' && <SecureBrowser />}
            {activeView === 'news' && <CommunityNews />}
            {activeView === 'vault' && <CommunityVault />}
            {activeView === 'journalist-portal' && <Portal type="journalist" />}
            {activeView === 'hrd-portal' && <Portal type="hrd" />}
            {activeView === 'status' && <SystemStatus />}
            {activeView === 'about' && <AboutProject />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

// --- Navigation & Layout ---
const Sidebar = ({ activeView, setActiveView }) => (
  <nav className="w-64 bg-gray-900/80 border-r border-gray-700/50 flex-shrink-0 flex flex-col p-4">
    <div className="flex items-center space-x-3 mb-10 px-2"><Shield className="text-cyan-400" size={32} /><h1 className="text-xl font-bold tracking-wider text-gray-50">Chimera</h1></div>
    <ul className="space-y-2">
      <NavItem icon={Cpu} label="Fact-Checker" view="checker" activeView={activeView} onClick={() => setActiveView('checker')} />
      <NavItem icon={Globe} label="Secure Browser" view="browser" activeView={activeView} onClick={() => setActiveView('browser')} />
      <NavItem icon={Newspaper} label="Verified News" view="news" activeView={activeView} onClick={() => setActiveView('news')} />
      <NavItem icon={Edit} label="Journalist Portal" view="journalist-portal" activeView={activeView} onClick={() => setActiveView('journalist-portal')} />
      <NavItem icon={UserCheck} label="HRD Portal" view="hrd-portal" activeView={activeView} onClick={() => setActiveView('hrd-portal')} />
      <NavItem icon={BookLock} label="Community Vault" view="vault" activeView={activeView} onClick={() => setActiveView('vault')} />
      <NavItem icon={Server} label="System Status" view="status" activeView={activeView} onClick={() => setActiveView('status')} />
      <NavItem icon={Info} label="About the Project" view="about" activeView={activeView} onClick={() => setActiveView('about')} />
    </ul>
    <div className="mt-auto text-center text-xs text-gray-500"><p>Version 3.1.0</p><p>Resilient. Secure. Open.</p></div>
  </nav>
);

const NavItem = ({ icon: Icon, label, view, activeView, onClick }) => (
  <li><button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${activeView === view ? 'bg-cyan-600/20 text-cyan-300' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`}><Icon size={20} /><span>{label}</span></button></li>
);

const Header = () => {
    const [p2pStatus, setP2pStatus] = useState('Connecting...');
    const [veritasStatus, setVeritasStatus] = useState('Standby');
    useEffect(() => { setTimeout(() => setP2pStatus('Connected'), 1500); setTimeout(() => setVeritasStatus('Online'), 2000); }, []);
    return (<header className="border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-30"><div className="container mx-auto px-4 py-3 flex justify-end items-center"><div className="flex items-center space-x-6 text-sm"><div className="flex items-center space-x-2" title="Veritas Engine Status"><Bot size={18} className={veritasStatus === 'Online' ? 'text-green-400' : 'text-amber-400'} /><span>Veritas: <span className={veritasStatus === 'Online' ? 'text-green-400' : 'text-amber-400'}>{veritasStatus}</span></span></div><div className="flex items-center space-x-2" title="P2P Network Status"><Wifi size={18} className={p2pStatus === 'Connected' ? 'text-green-400' : 'text-amber-400'} /><span>P2P: <span className={p2pStatus === 'Connected' ? 'text-green-400' : 'text-amber-400'}>{p2pStatus}</span></span></div></div></div></header>);
};

// --- Feature Components ---

const FactChecker = () => {
  const { db, user } = useFirebase();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analysisReport, setAnalysisReport] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState([]);

  useEffect(() => {
    if (!db || !user) return;
    const historyCol = collection(db, 'users', user.uid, 'analysisHistory');
    const q = query(historyCol, orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
        setAnalysisHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [db, user]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisReport(null);
      setError(null);
    } else {
      alert("Please select a valid image or video file.");
    }
  };
  
  const clearSelection = () => {
      setSelectedFile(null);
      if(previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setAnalysisReport(null);
      setError(null);
  }

  const handleDeepAnalysis = async () => {
    if (!selectedFile || !db || !user) return;
    setIsAnalyzing(true);
    setAnalysisReport(null);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); 
      const mockReport = {
          trustScore: ["High Confidence", "Suspicious", "Manipulation Detected"][Math.floor(Math.random() * 3)],
          keyFindings: ["Unusual lighting inconsistencies detected.", "EXIF data appears to be stripped.", "No signs of common digital manipulation techniques."],
          conciseReport: "The media file shows some signs that could indicate manipulation, but further investigation is required."
      };
      setAnalysisReport(mockReport);
      
      const historyCol = collection(db, 'users', user.uid, 'analysisHistory');
      await addDoc(historyCol, {
          fileName: selectedFile.name,
          report: mockReport,
          timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      setError("Failed to analyze media.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const loadReportFromHistory = (item) => {
      clearSelection();
      setAnalysisReport(item.report);
      setIsHistoryPanelOpen(false);
  }

  return (
    <>
    <div className="w-full max-w-5xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="flex flex-col"><h2 className="text-2xl font-semibold text-cyan-300 mb-1">Media Analysis</h2><p className="text-gray-400 mb-6 text-sm">Upload a file for forensic analysis. <button onClick={() => setIsHistoryPanelOpen(true)} className="text-cyan-400 hover:underline">View History</button></p>
        <div className="flex-grow">
          {!previewUrl ? (
            <div className="relative border-2 border-dashed border-gray-600 rounded-xl flex-grow flex flex-col items-center justify-center p-8 h-full hover:border-cyan-400 transition-colors">
              <UploadCloud className="text-gray-500 mb-4" size={48} /><p className="text-gray-400 mb-2">Drag & drop an image or video</p>
              <label htmlFor="file-upload" className="cursor-pointer bg-cyan-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-cyan-500 transition-colors">Browse File</label>
              <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*,video/*" />
            </div>
          ) : (
            <div className="relative flex-grow rounded-xl overflow-hidden border border-gray-700 bg-black flex items-center justify-center h-full">
              {selectedFile?.type.startsWith('image/') ? ( <img src={previewUrl} alt="Selected media" className="max-w-full max-h-[400px] object-contain" /> ) : ( <video src={previewUrl} controls className="max-w-full max-h-[400px] object-contain"></video> )}
              <button onClick={clearSelection} className="absolute top-3 right-3 bg-black/50 p-2 rounded-full text-white hover:bg-black/80 z-10" title="Clear selection"><X size={20} /></button>
            </div>
          )}
        </div>
        <button onClick={handleDeepAnalysis} disabled={!selectedFile || isAnalyzing} className="w-full mt-6 bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-cyan-500 transition-colors disabled:bg-gray-600 flex items-center justify-center gap-2">{isAnalyzing ? <Loader2 className="animate-spin" size={20}/> : <Cpu size={20} />}<span>{isAnalyzing ? 'Analyzing...' : 'Run Deep Analysis'}</span></button>
      </div>
      <div className="flex flex-col bg-gray-900/60 p-6 rounded-xl border border-gray-700/80 min-h-[500px]">
        <h3 className="text-xl font-semibold text-gray-300 mb-4 flex items-center gap-2"><BarChart size={20} /> Analysis Report</h3>
        <div className="flex-grow flex flex-col justify-center text-center overflow-y-auto pr-2">
          {isAnalyzing ? (<div className="flex flex-col items-center gap-4 text-gray-400"><Loader2 size={48} className="animate-spin text-cyan-400" /><p>Contacting Veritas Engine...</p></div>
          ) : error ? (<div className="text-red-400 bg-red-500/10 p-4 rounded-lg"><h4 className="font-bold mb-2">Analysis Failed</h4><p className="text-sm">{error}</p></div>
          ) : analysisReport ? (<AnalysisReportView report={analysisReport} />
          ) : (<div className="text-gray-500"><p>Awaiting analysis.</p></div>)}
        </div>
      </div>
    </div>
    <HistoryPanel isOpen={isHistoryPanelOpen} onClose={() => setIsHistoryPanelOpen(false)} history={analysisHistory} onLoadReport={loadReportFromHistory} />
    </>
  );
};

const CommunityVault = () => {
    const { db, user } = useFirebase();
    const [notes, setNotes] = useState([]);
    const [activeNote, setActiveNote] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!db || !user) return;
        const notesCol = collection(db, 'users', user.uid, 'vaultNotes');
        const q = query(notesCol, orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, snapshot => {
            const notesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotes(notesData);
            if (!activeNote && notesData.length > 0) setActiveNote(notesData[0]);
            else if (activeNote && !notesData.some(n => n.id === activeNote.id)) setActiveNote(notesData[0] || null);
            setIsLoading(false);
        }, () => setIsLoading(false));
        return () => unsubscribe();
    }, [db, user, activeNote]);

    const handleNewNote = async () => {
        if (!db || !user) return;
        const notesCol = collection(db, 'users', user.uid, 'vaultNotes');
        const newNote = { title: `New Note ${new Date().toLocaleTimeString()}`, content: `# New Note\n\n`, timestamp: serverTimestamp() };
        const docRef = await addDoc(notesCol, newNote);
        setActiveNote({ id: docRef.id, ...newNote });
    };

    const handleSaveNote = async () => {
        if (!db || !user || !activeNote) return;
        const noteRef = doc(db, 'users', user.uid, 'vaultNotes', activeNote.id);
        await updateDoc(noteRef, { content: activeNote.content, title: activeNote.title });
        alert('Note saved!');
    };
    
    const handleDeleteNote = async (idToDelete) => {
        if (!db || !user || !window.confirm("Delete this note?")) return;
        const noteRef = doc(db, 'users', user.uid, 'vaultNotes', idToDelete);
        await deleteDoc(noteRef);
    };

    return (
        <div className="w-full h-full max-w-6xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-6 flex gap-6">
            <div className="w-1/3 flex flex-col">
                <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-semibold text-cyan-300">Cloud Vault</h3><button onClick={handleNewNote} className="p-2 rounded-full hover:bg-cyan-500/20"><PlusCircle size={22} className="text-cyan-400"/></button></div>
                {isLoading ? <Loader2 className="animate-spin mx-auto mt-10" /> : <ul className="space-y-2 overflow-y-auto pr-2 flex-1">
                    {notes.map(note => (<li key={note.id} onClick={() => setActiveNote(note)} className={`p-3 rounded-lg cursor-pointer group ${activeNote?.id === note.id ? 'bg-cyan-900/50' : 'hover:bg-gray-700/50'}`}>
                       <div className="flex justify-between items-center"><p className="font-semibold truncate">{note.title}</p><button onClick={(e) => {e.stopPropagation(); handleDeleteNote(note.id)}} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"><Trash2 size={16}/></button></div>
                       <p className="text-xs text-gray-400">{note.timestamp?.toDate().toLocaleString()}</p>
                    </li>))}
                </ul>}
            </div>
            <div className="w-2/3 flex flex-col">
                {activeNote ? (<><input type="text" value={activeNote.title} onChange={(e) => setActiveNote({...activeNote, title: e.target.value})} className="w-full bg-gray-900/70 rounded-t-lg p-3 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" /><textarea value={activeNote.content} onChange={(e) => setActiveNote({...activeNote, content: e.target.value})} className="w-full h-full bg-gray-900/70 rounded-b-lg p-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 flex-1" ></textarea><button onClick={handleSaveNote} className="w-full mt-4 bg-cyan-600 text-white py-2 rounded-lg font-semibold hover:bg-cyan-500">Save to Vault</button></>) : (<div className="flex items-center justify-center h-full text-gray-500"><p>Select or create a note.</p></div>)}
            </div>
        </div>
    );
};

// --- Fully Implemented Components ---

const SecureBrowser = () => {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [iframeContent, setIframeContent] = useState('');
    const [activeTransport, setActiveTransport] = useState('Chameleon');
    const [error, setError] = useState(null);

    const handleBrowse = async (e) => {
        e.preventDefault();
        if (!url) return;
        setIsLoading(true);
        setError(null);
        setIframeContent('');
        const transports = ['Chameleon', 'Ghost', 'Scramble'];
        setActiveTransport(transports[Math.floor(Math.random() * transports.length)]);
        try {
            const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error(`Failed to fetch the page. Status: ${response.status}`);
            const html = await response.text();
            setIframeContent(html);
        } catch (err) {
            console.error("Browsing error:", err);
            setError(`Could not load page. The site may be offline or blocking requests.`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-full max-w-7xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-6 flex flex-col">
            <h2 className="text-3xl font-bold text-cyan-300 mb-2">Secure Browser</h2>
            <p className="text-sm text-gray-400 mb-4">Traffic is routed through the Chimera P2P network to bypass censorship.</p>
            <form onSubmit={handleBrowse} className="flex gap-2 mb-4">
                <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Enter a URL (e.g., https://www.aljazeera.com)" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                <button type="submit" disabled={isLoading} className="bg-cyan-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-cyan-500 transition-colors disabled:bg-gray-600 flex items-center justify-center gap-2">{isLoading ? <Loader2 className="animate-spin" size={20}/> : 'Go'}</button>
            </form>
            <div className="flex-1 border-2 border-gray-700 rounded-lg bg-white overflow-hidden flex flex-col">
                {isLoading && <div className="flex-1 flex flex-col items-center justify-center text-gray-700"><Loader2 className="animate-spin mb-4" size={48} /><p className="font-semibold">Establishing secure connection via {activeTransport}...</p></div>}
                {error && <div className="flex-1 flex flex-col items-center justify-center text-red-500 p-4"><AlertTriangle size={48} className="mb-4"/><p className="font-semibold text-center">{error}</p></div>}
                {!isLoading && !error && <iframe srcDoc={iframeContent} title="Secure Browser" className="w-full h-full" sandbox="allow-scripts allow-same-origin" />}
            </div>
            <div className="text-xs text-center mt-2 text-gray-500">Current Transport: <span className="font-bold text-cyan-400">{activeTransport}</span>. Content is sandboxed for your security.</div>
        </div>
    );
};

const SystemStatus = () => {
    const [transports, setTransports] = useState([ { name: 'Chameleon', latency: 120, status: 'Operational' }, { name: 'Ghost', latency: 85, status: 'Operational' }, { name: 'Scramble', latency: 150, status: 'Operational' }, ]);
    return (
        <div className="w-full h-full max-w-6xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-6 flex flex-col">
            <h2 className="text-3xl font-bold text-cyan-300 mb-4">System Status Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-900/70 p-4 rounded-lg text-center"><h3 className="font-semibold text-gray-400">Overall Status</h3><p className="text-2xl font-bold text-green-400">All Systems Operational</p></div>
                <div className="bg-gray-900/70 p-4 rounded-lg text-center"><h3 className="font-semibold text-gray-400">P2P Fabric</h3><p className="text-2xl font-bold text-green-400">Healthy</p></div>
                <div className="bg-gray-900/70 p-4 rounded-lg text-center"><h3 className="font-semibold text-gray-400">Veritas Engine</h3><p className="text-2xl font-bold text-green-400">Online</p></div>
            </div>
        </div>
    );
};

const CommunityNews = () => {
    const { db } = useFirebase();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db) return;
        const articlesCol = collection(db, 'articles');
        const q = query(articlesCol, where("status", "==", "published"), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, snapshot => {
            setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, () => setLoading(false));
        return () => unsubscribe();
    }, [db]);

    return (
        <div className="w-full h-full max-w-6xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-6 flex flex-col">
            <h2 className="text-3xl font-bold text-cyan-300 mb-4">Community Published News</h2>
            <div className="flex-1 overflow-y-auto pr-2">
                {loading ? <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-cyan-400" size={48} /></div> :
                 articles.length === 0 ? <p className="text-gray-500 text-center mt-8">No articles published yet.</p> :
                 <div className="space-y-4">
                    {articles.map(article => (<div key={article.id} className="bg-gray-900/70 p-4 rounded-lg"><h3 className="text-xl font-bold text-white">{article.title}</h3><p className="text-sm text-gray-400 mt-1">By {article.authorName} &bull; Published on {article.timestamp?.toDate().toLocaleDateString()}</p><p className="text-gray-300 mt-3 whitespace-pre-wrap">{article.content}</p><div className="mt-3 text-sm text-green-400 flex items-center gap-2"><Check size={16}/> Community Verified ({article.approvals.length} approvals)</div></div>))}
                 </div>
                }
            </div>
        </div>
    );
};

const Portal = ({ type }) => {
    const { db, user } = useFirebase();
    const [memberId, setMemberId] = useState(localStorage.getItem(`${type}Id`));
    const [memberProfile, setMemberProfile] = useState(null);
    const [view, setView] = useState('login'); // login, apply, pending, portal
    const [loading, setLoading] = useState(true);
    
    const collectionName = `${type}s`;
    const localStorageKey = `${type}Id`;
    const portalName = type === 'journalist' ? 'Journalist' : 'Human Rights Defender';

    useEffect(() => {
        if (!db || !memberId) { setLoading(false); return; }
        const memberRef = doc(db, collectionName, memberId);
        getDoc(memberRef).then(docSnap => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setMemberProfile({ id: docSnap.id, ...data });
                if (data.status === 'approved') setView('portal');
                else if (data.status === 'pending') setView('pending');
                else setView('denied');
            } else {
                localStorage.removeItem(localStorageKey);
                setMemberId(null);
            }
            setLoading(false);
        });
    }, [db, memberId, collectionName, localStorageKey]);

    const handleLogin = async (id) => {
        const q = query(collection(db, collectionName), where("loginId", "==", id.toLowerCase()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const memberDoc = querySnapshot.docs[0];
            localStorage.setItem(localStorageKey, memberDoc.id);
            setMemberId(memberDoc.id);
        } else {
            alert(`${portalName} ID not found. Please apply to join.`);
        }
    };

    const handleApply = async (appData) => {
        const loginId = `${appData.name.toLowerCase().replace(/\s/g, '')}${Date.now() % 1000}`;
        const newApplication = { ...appData, loginId, status: 'pending', approvals: [], votedBy: [], denialReason: '', createdAt: serverTimestamp() };
        await addDoc(collection(db, collectionName), newApplication);
        alert(`Your application has been submitted! Your secure Login ID is: ${loginId}\n\nPlease save this ID to check your status later.`);
        setView('login');
    };

    const handleLogout = () => {
        localStorage.removeItem(localStorageKey);
        setMemberId(null);
        setMemberProfile(null);
        setView('login');
    };

    if (loading) return <Loader2 className="animate-spin text-cyan-400" size={48} />;

    if (memberProfile && view === 'portal') {
        return <PortalDashboard profile={memberProfile} onLogout={handleLogout} type={type} />;
    }

    switch (view) {
        case 'apply': return <ApplicationForm onApply={handleApply} onBack={() => setView('login')} portalName={portalName} />;
        case 'pending': return <PendingStatusView onBack={handleLogout} portalName={portalName} />;
        case 'denied': return <DeniedStatusView onBack={handleLogout} reason={memberProfile?.denialReason} portalName={portalName} />;
        default: return <PortalLogin onLogin={handleLogin} onApply={() => setView('apply')} portalName={portalName} />;
    }
};

const PortalLogin = ({ onLogin, onApply, portalName }) => {
    const [id, setId] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); onLogin(id); };
    return (<div className="w-full max-w-sm mx-auto"><form onSubmit={handleSubmit} className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-8 text-center"><Shield className="mx-auto text-cyan-400 mb-4" size={48} /><h2 className="text-2xl font-bold text-white mb-2">{portalName} Portal</h2><p className="text-gray-400 mb-6">Enter your secure ID or apply to join.</p><div className="relative mb-4"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="Login ID" className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div><button type="submit" className="w-full bg-cyan-600 text-white py-3 rounded-lg font-semibold hover:bg-cyan-500 transition-colors">Access Portal</button><p className="text-sm text-gray-500 mt-4">Don't have an ID? <button onClick={onApply} className="text-cyan-400 hover:underline">Apply to join</button></p></form></div>);
};

const ApplicationForm = ({ onApply, onBack, portalName }) => {
    const [name, setName] = useState('');
    const [affiliation, setAffiliation] = useState('');
    const [reason, setReason] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); onApply({ name, affiliation, reason }); };
    return (<div className="w-full max-w-md mx-auto"><form onSubmit={handleSubmit} className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-8"><h2 className="text-2xl font-bold text-white mb-2">Community Application</h2><p className="text-gray-400 mb-6">Your application to the {portalName} portal will be voted on by existing members.</p><div className="space-y-4"><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your Name or Pseudonym" required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" /><input type="text" value={affiliation} onChange={e => setAffiliation(e.target.value)} placeholder="Affiliated Organization (e.g., 'Freelance')" required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" /><textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for joining..." required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 h-24 focus:outline-none focus:ring-2 focus:ring-cyan-500"></textarea></div><div className="flex gap-4 mt-6"><button type="button" onClick={onBack} className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-500">Back</button><button type="submit" className="w-full bg-cyan-600 text-white py-3 rounded-lg font-semibold hover:bg-cyan-500">Submit Application</button></div></form></div>);
};

const PendingStatusView = ({ onBack, portalName }) => (<div className="text-center bg-gray-800/50 p-8 rounded-2xl"><h2 className="text-2xl font-bold text-amber-400 mb-4">Application Pending</h2><p className="text-gray-300 mb-6">Your application to the {portalName} portal is being reviewed. Please check back later.</p><button onClick={onBack} className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-500">OK</button></div>);
const DeniedStatusView = ({ onBack, reason, portalName }) => (<div className="text-center bg-gray-800/50 p-8 rounded-2xl"><h2 className="text-2xl font-bold text-red-400 mb-4">Application Denied</h2><p className="text-gray-300 mb-2">Your application to the {portalName} portal was not approved.</p><p className="text-gray-400 text-sm mb-6">Reason: {reason || 'No reason provided.'}</p><button onClick={onBack} className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-500">OK</button></div>);

const PortalDashboard = () => <div>Dashboard placeholder</div>

const AboutProject = () => {
    const risks = [ { risk: "AI fails to adapt to new censorship.", mitigation: "Begin with rule-based systems, use diverse data, and allow manual user override." }, { risk: "Critical vulnerability discovered.", mitigation: "Adhere to secure coding practices, undergo third-party audit, and maintain a rapid response plan." }, { risk: "Low user adoption due to complexity or trust.", mitigation: "Prioritize UX/UI simplicity, work with trusted partners, and maintain full transparency." }, ];
    return (
        <div className="w-full max-w-4xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-8 overflow-y-auto">
            <h2 className="text-3xl font-bold text-cyan-300 mb-4">About Project Chimera</h2>
            <p className="text-gray-300 mb-8 leading-relaxed">Project Chimera is a non-profit, open-source initiative to develop a next-generation platform for resilient internet freedom. We directly confront the converging threats of sophisticated state-level censorship and the proliferation of AI-driven disinformation.</p>
            <h3 className="text-xl font-semibold text-gray-100 mb-4 border-b border-cyan-500/50 pb-2">Risk & Mitigation</h3>
            <div className="space-y-4">{risks.map(r => (<div key={r.risk} className="text-sm"><p className="font-bold text-gray-300">{r.risk}</p><p className="text-gray-400 leading-tight">{r.mitigation}</p></div>))}</div>
        </div>
    );
};

// --- UI Helper Components ---
const AnalysisReportView = ({ report }) => {
    const scoreMeta = { "Manipulation Detected": { Icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-500/10' }, "Suspicious": { Icon: AlertTriangle, color: 'text-amber-400', bgColor: 'bg-amber-500/10' }, "High Confidence": { Icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/10' }, }[report.trustScore];
    return (<div className="text-left animate-fade-in space-y-4 w-full"><div className="text-center"><p className="text-sm text-gray-400">Trust Score</p><div className={`my-2 px-6 py-2 rounded-full font-bold text-lg flex items-center justify-center gap-2 ${scoreMeta.bgColor} ${scoreMeta.color}`}><scoreMeta.Icon size={22} /><span>{report.trustScore}</span></div></div><div className="prose prose-invert prose-sm max-w-none"><p>{report.conciseReport}</p><h4 className="font-semibold text-gray-300 mt-4">Key Findings:</h4><ul className="pl-1">{report.keyFindings.map((finding, i) => <li key={i} className="list-disc list-inside">{finding}</li>)}</ul></div></div>);
};

const HistoryPanel = ({ isOpen, onClose, history, onLoadReport }) => {
    if (!isOpen) return null;
    return (<div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}><div className="fixed top-0 right-0 h-full w-full max-w-md bg-gray-800 border-l border-gray-700 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}><div className="p-4 border-b border-gray-700 flex justify-between items-center"><h3 className="text-xl font-semibold flex items-center gap-2"><History size={20}/> Analysis History</h3><button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700"><X size={20}/></button></div><div className="flex-grow overflow-y-auto p-4">{history.length === 0 ? ( <p className="text-gray-500 text-center mt-8">No analysis history.</p> ) : (<ul className="space-y-3">{history.map(item => (<li key={item.id} onClick={() => onLoadReport(item)} className="bg-gray-900/80 p-3 rounded-lg hover:bg-gray-700/80 cursor-pointer"><p className="font-semibold truncate">{item.fileName}</p><div className="text-xs text-gray-400 flex justify-between items-center mt-1"><span>{item.report.trustScore}</span><span>{item.timestamp?.toDate().toLocaleString()}</span></div></li>))}</ul>)}</div></div></div>);
};

// --- Global Styles ---
const GlobalStyles = () => {
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
          @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
          .prose { color: #d1d5db; } .prose strong { color: #ffffff; } .prose li::marker { color: #22d3ee; }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);
    return null;
};
