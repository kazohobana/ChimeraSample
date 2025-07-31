import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { Shield, UploadCloud, Cpu, Wifi, Bot, AlertTriangle, CheckCircle, X, Loader2, Info, PlusCircle, Trash2, Newspaper, UserCheck, LogOut, Briefcase, Check, LogIn, MessageSquare, Link, BookLock, Save, Folder, File, ListTodo, Lock, Edit } from 'lucide-react';

// --- Firebase Imports (Using modern v9+ modular SDK) ---
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    updateDoc, 
    query, 
    onSnapshot, 
    serverTimestamp, 
    arrayUnion, 
    getDoc, 
    setDoc, 
    deleteDoc, 
    where,
    orderBy
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';


// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAIcU46cd9mY6Q9rbvWK4KYWPWRqAGtbYg",
  authDomain: "chimtest-6854a.firebaseapp.com",
  projectId: "chimtest-6854a",
  storageBucket: "chimtest-6854a.appspot.com",
  messagingSenderId: "178975469028",
  appId: "1:178975469028:web:fe72c902fb4b321a082bf1",
};

// --- Firebase Context for global state management ---
const FirebaseContext = createContext(null);
const useFirebase = () => useContext(FirebaseContext);

const FirebaseProvider = ({ children }) => {
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [storage, setStorage] = useState(null);
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            const storageInstance = getStorage(app);
            
            setAuth(authInstance);
            setDb(dbInstance);
            setStorage(storageInstance);

            const unsubscribe = onAuthStateChanged(authInstance, (firebaseUser) => {
                setUser(firebaseUser);
                if (firebaseUser) {
                    const userDocRef = doc(dbInstance, 'users', firebaseUser.uid);
                    const unsubUser = onSnapshot(userDocRef, (userDocSnap) => {
                        if (userDocSnap.exists()) {
                            setUserData(userDocSnap.data());
                        } else {
                            setUserData(null);
                        }
                        setLoading(false);
                    });
                    return () => unsubUser();
                } else {
                    setUserData(null);
                    setLoading(false);
                }
            });
            
            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            setLoading(false);
        }
    }, []);

    const value = { auth, db, storage, user, userData, loading };

    return (
        <FirebaseContext.Provider value={value}>
            {loading ? <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-cyan-400"><Loader2 size={48} className="animate-spin" /></div> : children}
        </FirebaseContext.Provider>
    );
};

// --- Error Boundary ---
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, errorInfo) { console.error("ErrorBoundary caught an error:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return <div className="w-full h-full flex flex-col items-center justify-center bg-red-900/20 text-red-300 p-8 rounded-lg border border-red-500/50"><AlertTriangle size={48} className="mb-4" /><h2>Something went wrong.</h2><p>{this.state.error?.message || "Please refresh the page."}</p></div>;
        }
        return this.props.children;
    }
}

// --- Main App Component ---
function AppWrapper() {
    return (
        <FirebaseProvider>
            <GlobalStyles />
            <App />
        </FirebaseProvider>
    );
}

function App() {
  const { user, userData, loading } = useFirebase();
  const [activeView, setActiveView] = useState('fact-checker');
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chatId = params.get('chatId');
    const caseChatId = params.get('caseChatId');
    if (chatId) {
        setActiveView('chat-invite');
        setActiveId(chatId);
    } else if (caseChatId) {
        setActiveView('case-chat-invite');
        setActiveId(caseChatId);
    }
  }, []);

  const handleNavigate = (view, id = null) => {
    setActiveView(view);
    setActiveId(id);
  }

  const handleSelect = (id, view) => {
    setActiveId(id);
    setActiveView(view);
  }

  if (loading) {
      return <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-cyan-400"><Loader2 size={48} className="animate-spin" /></div>;
  }

  // --- Anonymous Views ---
  if (activeView === 'chat-invite') return <ChatInviteHandler chatId={activeId} />;
  if (activeView === 'case-chat-invite') return <CaseChatInviteHandler caseChatId={activeId} />;
  if (!user) return <PublicLayout activeView={activeView} setActiveView={handleNavigate} />;

  // --- Authenticated Views ---
  return (
    <div className="bg-gray-900 text-gray-200 font-sans min-h-screen flex w-full h-screen">
      <LoggedInSidebar activeView={activeView} setActiveView={handleNavigate} />
      <div className="flex-1 flex flex-col h-screen">
        <Header />
        <main className="flex-grow p-4 md:p-8 flex items-start justify-center overflow-y-auto">
          <ErrorBoundary key={activeView + activeId}>
            {activeView === 'news' && <CommunityNews onArticleSelect={(id) => handleSelect(id, 'articleView')} />}
            {activeView === 'journalist-portal' && <JournalistDashboard onNavigate={handleNavigate} onSelect={handleSelect} />}
            {activeView === 'hrd-portal' && <HRDDashboard onCaseSelect={(id) => handleSelect(id, 'caseView')} onNewCase={() => setActiveView('newCase')} />}
            {activeView === 'articleEditor' && <ArticleEditor articleId={activeId} onBack={() => handleNavigate('journalist-portal')} />}
            {activeView === 'articleView' && <ArticleView articleId={activeId} onBack={() => handleNavigate(userData.role === 'journalist' ? 'journalist-portal' : 'news')} onEdit={(id) => handleNavigate('articleEditor', id)} />}
            {activeView === 'caseView' && <CaseView caseId={activeId} onBack={() => handleNavigate('hrd-portal')} />}
            {activeView === 'newCase' && <NewCase onBack={() => handleNavigate('hrd-portal')} />}
            {activeView === 'about' && <AboutProject />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

// --- Navigation & Layout ---
const PublicLayout = ({ activeView, setActiveView }) => (
    <div className="bg-gray-900 text-gray-200 font-sans min-h-screen flex w-full h-screen">
        <PublicSidebar activeView={activeView} setActiveView={setActiveView} />
        <div className="flex-1 flex flex-col h-screen">
            <Header />
            <main className="flex-grow p-4 md:p-8 flex items-start justify-center overflow-y-auto">
                <ErrorBoundary key={activeView}>
                    {activeView === 'fact-checker' && <FactChecker />}
                    {activeView === 'news' && <CommunityNews onArticleSelect={() => {}} />}
                    {activeView === 'portals' && <Portals onNavigate={setActiveView} />}
                    {activeView === 'status' && <SystemStatus />}
                    {activeView === 'about' && <AboutProject />}
                </ErrorBoundary>
            </main>
        </div>
    </div>
);

const PublicSidebar = ({ activeView, setActiveView }) => (
    <nav className="w-64 bg-gray-900/80 border-r border-gray-700/50 flex-shrink-0 flex flex-col p-4">
        <div className="flex items-center space-x-3 mb-10 px-2"><Shield className="text-cyan-400" size={32} /><h1 className="text-xl font-bold tracking-wider text-gray-50">Chimera</h1></div>
        <ul className="space-y-2 flex-grow">
            <NavItem icon={Cpu} label="Fact-Checker" view="fact-checker" activeView={activeView} onClick={() => setActiveView('fact-checker')} />
            <NavItem icon={Newspaper} label="Verified News" view="news" activeView={activeView} onClick={() => setActiveView('news')} />
            <NavItem icon={LogIn} label="Portals" view="portals" activeView={activeView} onClick={() => setActiveView('portals')} />
            <NavItem icon={Wifi} label="System Status" view="status" activeView={activeView} onClick={() => setActiveView('status')} />
            <NavItem icon={Info} label="About the Project" view="about" activeView={activeView} onClick={() => setActiveView('about')} />
        </ul>
        <div className="mt-auto text-center text-xs text-gray-500"><p>Version 4.0.0</p><p>Resilient. Secure. Open.</p></div>
    </nav>
);

const LoggedInSidebar = ({ activeView, setActiveView }) => {
    const { auth, userData } = useFirebase();
    const handleSignOut = async () => {
        await firebaseSignOut(auth);
    };
    return (
        <nav className="w-64 bg-gray-900/80 border-r border-gray-700/50 flex-shrink-0 flex flex-col p-4">
            <div className="flex items-center space-x-3 mb-10 px-2"><Shield className="text-cyan-400" size={32} /><h1 className="text-xl font-bold tracking-wider text-gray-50">Chimera</h1></div>
            <ul className="space-y-2 flex-grow">
                <NavItem icon={Newspaper} label="Verified News" view="news" activeView={activeView} onClick={() => setActiveView('news')} />
                {userData?.role === 'journalist' && <NavItem icon={UserCheck} label="Journalist Portal" view="journalist-portal" activeView={activeView} onClick={() => setActiveView('journalist-portal')} />}
                {userData?.role === 'hrd' && <NavItem icon={Briefcase} label="HRD Portal" view="hrd-portal" activeView={activeView} onClick={() => setActiveView('hrd-portal')} />}
                <NavItem icon={Info} label="About the Project" view="about" activeView={activeView} onClick={() => setActiveView('about')} />
            </ul>
            <div className="mt-auto">
                <NavItem icon={LogOut} label="Sign Out" view="logout" activeView={activeView} onClick={handleSignOut} />
            </div>
        </nav>
    );
};

const NavItem = ({ icon: Icon, label, view, activeView, onClick }) => (
  <li><button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${activeView === view ? 'bg-cyan-600/20 text-cyan-300' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`}><Icon size={20} /><span>{label}</span></button></li>
);

const Header = () => {
    const [p2pStatus, setP2pStatus] = useState('Connecting...');
    const [veritasStatus, setVeritasStatus] = useState('Standby');
    useEffect(() => { setTimeout(() => setP2pStatus('Connected'), 1500); setTimeout(() => setVeritasStatus('Online'), 2000); }, []);
    return (<header className="border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-30"><div className="container mx-auto px-4 py-3 flex justify-end items-center"><div className="flex items-center space-x-6 text-sm"><div className="flex items-center space-x-2" title="Aegis Engine Status"><Bot size={18} className={veritasStatus === 'Online' ? 'text-green-400' : 'text-amber-400'} /><span>Aegis: <span className={veritasStatus === 'Online' ? 'text-green-400' : 'text-amber-400'}>{veritasStatus}</span></span></div><div className="flex items-center space-x-2" title="P2P Network Status"><Wifi size={18} className={p2pStatus === 'Connected' ? 'text-green-400' : 'text-amber-400'} /><span>P2P: <span className={p2pStatus === 'Connected' ? 'text-green-400' : 'text-amber-400'}>{p2pStatus}</span></span></div></div></div></header>);
};

// --- AUTHENTICATION COMPONENTS ---
const Portals = ({ onNavigate }) => {
    const [view, setView] = useState('login'); // login or signup
    if (view === 'signup') return <SignUp onLoginNavigate={() => setView('login')} />;
    return <Login onSignUpNavigate={() => setView('signup')} />;
};

const Login = ({ onSignUpNavigate }) => {
    const { auth } = useFirebase();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const seededUsers = [
      { email: 'journalist.seed@chimera.test', role: 'Journalist', pass: 'password123' },
      { email: 'hrd.seed@chimera.test', role: 'Human Rights Defender', pass: 'password123' },
    ];
    const handleLogin = async (e) => {
        e.preventDefault(); setLoading(true); setError(null);
        try { await signInWithEmailAndPassword(auth, email, password); } 
        catch (err) { setError(err); setLoading(false); }
    };
    return (
        <div className="w-full max-w-md">
            <div className="bg-gray-800/50 border border-gray-700/50 p-8 rounded-2xl shadow-2xl">
                <h2 className="text-3xl font-bold text-center text-cyan-300 mb-2">Member Login</h2>
                <p className="text-center text-gray-400 mb-8">Access your secure portal.</p>
                <form onSubmit={handleLogin} className="space-y-6">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
                    <button type="submit" disabled={loading} className="w-full bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500 transition-colors disabled:bg-gray-600">
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Sign In'}
                    </button>
                </form>
                <p className="text-center text-sm text-gray-500 mt-6">Don't have an account? <button onClick={onSignUpNavigate} className="font-medium text-cyan-400 hover:underline">Sign Up</button></p>
            </div>
             <div className="bg-gray-800/50 border border-gray-700/50 p-8 rounded-xl shadow-lg mt-6">
                <h3 className="text-xl font-semibold text-gray-300 mb-4">Test Accounts</h3>
                <ul className="space-y-3 text-gray-400">
                    {seededUsers.map(user => (
                        <li key={user.email}>
                            <p className="font-bold text-gray-200">{user.role}</p>
                            <p>Email: <span className="font-mono text-sm">{user.email}</span></p>
                            <p>Password: <span className="font-mono text-sm">{user.pass}</span></p>
                        </li>
                    ))}
                </ul>
            </div>
            {error && <ErrorModal error={error} onClose={() => setError(null)} />}
        </div>
    );
};

const SignUp = ({ onLoginNavigate }) => {
    const { auth, db } = useFirebase();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState('journalist');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleSignUp = async (e) => {
        e.preventDefault(); setLoading(true); setError(null);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                uid: userCredential.user.uid, displayName, email, role, createdAt: serverTimestamp(),
            });
        } catch (err) {
            setError(err); setLoading(false);
        }
    };
    return (
        <div className="w-full max-w-md">
            <div className="bg-gray-800/50 border border-gray-700/50 p-8 rounded-2xl shadow-2xl">
                <h2 className="text-3xl font-bold text-center text-cyan-300 mb-8">Create Account</h2>
                <form onSubmit={handleSignUp} className="space-y-6">
                    <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Full Name" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min. 6 characters)" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
                    <div className="flex items-center justify-around text-gray-300">
                        <label className="flex items-center space-x-2"><input type="radio" name="role" value="journalist" checked={role === 'journalist'} onChange={e => setRole(e.target.value)} className="form-radio text-cyan-500 bg-gray-700 border-gray-600" /><span>Journalist</span></label>
                        <label className="flex items-center space-x-2"><input type="radio" name="role" value="hrd" checked={role === 'hrd'} onChange={e => setRole(e.target.value)} className="form-radio text-cyan-500 bg-gray-700 border-gray-600" /><span>HR Defender</span></label>
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500 transition-colors disabled:bg-gray-600">
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Sign Up'}
                    </button>
                </form>
                <p className="text-center text-sm text-gray-500 mt-6">Already have an account? <button onClick={onLoginNavigate} className="font-medium text-cyan-400 hover:underline">Sign In</button></p>
            </div>
            {error && <ErrorModal error={error} onClose={() => setError(null)} />}
        </div>
    );
};

// --- FEATURE COMPONENTS ---

const FactChecker = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [analysisReport, setAnalysisReport] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setAnalysisReport(null);
        } else {
            alert("Please select a valid image or video file.");
        }
    };

    const handleDeepAnalysis = async () => {
        if (!selectedFile) return;
        setIsAnalyzing(true);
        setAnalysisReport(null);
        await new Promise(resolve => setTimeout(resolve, 2000));
        const mockReport = {
            score: ["High Confidence", "Suspicious", "Manipulation Detected"][Math.floor(Math.random() * 3)],
            details: ["Unusual lighting inconsistencies detected.", "EXIF data appears to be stripped.", "No signs of common digital manipulation techniques."],
            checkedAt: new Date().toISOString()
        };
        setAnalysisReport(mockReport);
        setIsAnalyzing(false);
    };

    return (
        <div className="w-full max-w-5xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col">
                <h2 className="text-2xl font-semibold text-cyan-300 mb-1">Media Analysis</h2>
                <p className="text-gray-400 mb-6 text-sm">Upload a file for forensic analysis by the Aegis Engine.</p>
                <div className="flex-grow">
                    {!previewUrl ? (
                        <div className="relative border-2 border-dashed border-gray-600 rounded-xl flex-grow flex flex-col items-center justify-center p-8 h-full hover:border-cyan-400 transition-colors">
                            <UploadCloud className="text-gray-500 mb-4" size={48} />
                            <p className="text-gray-400 mb-2">Drag & drop an image or video</p>
                            <label htmlFor="file-upload" className="cursor-pointer bg-cyan-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-cyan-500 transition-colors">Browse File</label>
                            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*,video/*" />
                        </div>
                    ) : (
                        <div className="relative flex-grow rounded-xl overflow-hidden border border-gray-700 bg-black flex items-center justify-center h-full">
                            {selectedFile?.type.startsWith('image/') ? ( <img src={previewUrl} alt="Selected media" className="max-w-full max-h-[400px] object-contain" /> ) : ( <video src={previewUrl} controls className="max-w-full max-h-[400px] object-contain"></video> )}
                            <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="absolute top-3 right-3 bg-black/50 p-2 rounded-full text-white hover:bg-black/80 z-10" title="Clear selection"><X size={20} /></button>
                        </div>
                    )}
                </div>
                <button onClick={handleDeepAnalysis} disabled={!selectedFile || isAnalyzing} className="w-full mt-6 bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-cyan-500 transition-colors disabled:bg-gray-600 flex items-center justify-center gap-2">
                    {isAnalyzing ? <Loader2 className="animate-spin" size={20}/> : <Cpu size={20} />}
                    <span>{isAnalyzing ? 'Analyzing...' : 'Run Deep Analysis'}</span>
                </button>
            </div>
            <div className="flex flex-col bg-gray-900/60 p-6 rounded-xl border border-gray-700/80 min-h-[500px]">
                <h3 className="text-xl font-semibold text-gray-300 mb-4 flex items-center gap-2">Analysis Report</h3>
                <div className="flex-grow flex flex-col justify-center text-center overflow-y-auto pr-2">
                    {isAnalyzing ? (<div className="flex flex-col items-center gap-4 text-gray-400"><Loader2 size={48} className="animate-spin text-cyan-400" /><p>Contacting Aegis Engine...</p></div>
                    ) : analysisReport ? (<FactCheckCard result={analysisReport} />
                    ) : (<div className="text-gray-500"><p>Awaiting analysis.</p></div>)}
                </div>
            </div>
        </div>
    );
};

const SystemStatus = () => (
    <div className="w-full max-w-4xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-8">
        <h2 className="text-3xl font-bold text-cyan-300 mb-6">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900/70 p-6 rounded-lg text-center border border-green-500/30">
                <h3 className="font-semibold text-gray-400 mb-2">Overall Status</h3>
                <p className="text-2xl font-bold text-green-400 flex items-center justify-center gap-2"><CheckCircle /> Operational</p>
            </div>
            <div className="bg-gray-900/70 p-6 rounded-lg text-center border border-green-500/30">
                <h3 className="font-semibold text-gray-400 mb-2">P2P Fabric</h3>
                <p className="text-2xl font-bold text-green-400 flex items-center justify-center gap-2"><Wifi /> Healthy</p>
            </div>
            <div className="bg-gray-900/70 p-6 rounded-lg text-center border border-green-500/30">
                <h3 className="font-semibold text-gray-400 mb-2">Aegis Engine</h3>
                <p className="text-2xl font-bold text-green-400 flex items-center justify-center gap-2"><Bot /> Online</p>
            </div>
        </div>
    </div>
);

const CommunityNews = ({ onArticleSelect }) => {
    const { db } = useFirebase();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'articles'), where('status', '==', 'published'), orderBy('publishedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setArticles(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
                    {articles.map(article => (
                        <div key={article.id} onClick={() => onArticleSelect && onArticleSelect(article.id)} className={`bg-gray-900/70 p-4 rounded-lg ${onArticleSelect ? 'cursor-pointer hover:bg-gray-700/50' : ''}`}>
                            <h3 className="text-xl font-bold text-white">{article.title}</h3>
                            <p className="text-sm text-gray-400 mt-1">By {article.authorName} &bull; Published on {article.publishedAt?.toDate().toLocaleDateString()}</p>
                            <p className="text-gray-300 mt-3 whitespace-pre-wrap line-clamp-2" dangerouslySetInnerHTML={{ __html: article.content.substring(0, 300) }}></p>
                            <div className="mt-3 text-sm text-green-400 flex items-center gap-2"><Check size={16}/> Community Verified ({article.approvals?.length || 0} approvals)</div>
                        </div>
                    ))}
                 </div>
                }
            </div>
        </div>
    );
};

const AboutProject = () => (
    <div className="w-full max-w-4xl bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-black/20 p-8 overflow-y-auto">
        <h2 className="text-3xl font-bold text-cyan-300 mb-4">About Project Chimera</h2>
        <p className="text-gray-300 mb-8 leading-relaxed">Project Chimera is a non-profit, open-source initiative to develop a next-generation platform for resilient internet freedom. We directly confront the converging threats of sophisticated state-level censorship and the proliferation of AI-driven disinformation.</p>
        <div className="prose prose-invert max-w-none">
            <h4>Guiding Principles</h4>
            <ul>
                <li><strong>Security First:</strong> Every line of code, every architectural decision, must be made with the security and privacy of our users as the absolute top priority.</li>
                <li><strong>Resilience by Design:</strong> We are building a system that anticipates failure and censorship, not one that merely reacts to it.</li>
                <li><strong>Usability is Key:</strong> Our tools must be intuitive and accessible to non-technical users in high-stress environments. Complexity should be abstracted away from the user.</li>
                <li><strong>Open & Collaborative:</strong> We work in the open. Our code, our discussions, and our progress will be transparent to foster a strong community and encourage external contributions.</li>
            </ul>
        </div>
    </div>
);


// --- JOURNALIST PORTAL ---

const JournalistDashboard = ({ onNavigate, onSelect }) => {
    const [activeTab, setActiveTab] = useState('projects');
    const TabButton = ({ view, label, icon: Icon }) => (
        <button onClick={() => setActiveTab(view)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${activeTab === view ? 'text-cyan-300 border-cyan-300' : 'text-gray-400 border-transparent hover:text-white'}`}>
            <Icon size={16} /> {label}
        </button>
    );
    return (
        <div className="w-full max-w-6xl p-6">
            <h1 className="text-3xl font-bold text-cyan-300 mb-6">Journalist Dashboard</h1>
            <div className="border-b border-gray-700 flex">
                <TabButton view="projects" label="Projects" icon={Folder} />
                <TabButton view="articles" label="All Articles" icon={Newspaper} />
                <TabButton view="comms" label="Secure Comms" icon={MessageSquare} />
                <TabButton view="vault" label="Secure Vault" icon={BookLock} />
            </div>
            <div className="pt-6">
                {activeTab === 'projects' && <ProjectManagement onNavigate={onNavigate} onSelect={onSelect} />}
                {activeTab === 'articles' && <ArticleManagement onNewArticle={() => onNavigate('articleEditor')} onArticleSelect={(id) => onSelect(id, 'articleView')} />}
                {activeTab === 'comms' && <ConversationManager />}
                {activeTab === 'vault' && <SecureVault />}
            </div>
        </div>
    );
};

const ProjectManagement = ({ onNavigate, onSelect }) => {
    const { db, user } = useFirebase();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !db) return;
        const q = query(collection(db, 'projects'), where('authorUid', '==', user.uid), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, snap => {
            setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return unsubscribe;
    }, [user, db]);

    const handleNewProject = async () => {
        const title = prompt("New project title:");
        if (title && user && db) {
            await addDoc(collection(db, 'projects'), {
                title,
                authorUid: user.uid,
                createdAt: serverTimestamp(),
            });
        }
    };

    if (loading) return <Loader2 className="animate-spin text-cyan-400" />;

    return (
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-300">My Projects</h2>
                <button onClick={handleNewProject} className="flex items-center bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-500">
                    <PlusCircle className="mr-2" size={20} /> New Project
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(proj => (
                    <div key={proj.id} onClick={() => onNavigate('articleEditor', { projectId: proj.id })} className="bg-gray-900/70 p-4 rounded-lg cursor-pointer hover:bg-gray-700/50">
                        <h3 className="font-bold text-white">{proj.title}</h3>
                        <p className="text-sm text-gray-400">Created: {proj.createdAt?.toDate().toLocaleDateString()}</p>
                    </div>
                ))}
            </div>
            {projects.length === 0 && <p className="text-gray-500 text-center py-4">No projects yet. Create one to get started.</p>}
        </div>
    );
};

const ArticleManagement = ({ onNewArticle, onArticleSelect }) => {
    const { db, user } = useFirebase();
    const [myArticles, setMyArticles] = useState([]);
    const [pendingArticles, setPendingArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !db) return;
        
        const myArticlesQuery = query(collection(db, 'articles'), where('authorUid', '==', user.uid), orderBy('createdAt', 'desc'));
        const unsubMy = onSnapshot(myArticlesQuery, (snap) => {
            setMyArticles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        const pendingQuery = query(collection(db, 'articles'), where('status', '==', 'pending_approval'));
        const unsubPending = onSnapshot(pendingQuery, (snap) => {
            setPendingArticles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(art => art.authorUid !== user.uid));
        });

        return () => { unsubMy(); unsubPending(); };
    }, [user, db]);

    const getStatusChip = (status) => {
        const styles = {
            published: "text-green-800 bg-green-200",
            pending_approval: "text-yellow-800 bg-yellow-200",
            draft: "text-gray-800 bg-gray-300",
        };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status] || styles.draft}`}>{status.replace('_', ' ')}</span>;
    };

    if (loading) return <Loader2 className="animate-spin text-cyan-400" size={48} />;

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={onNewArticle} className="flex items-center bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-500 transition-colors">
                    <PlusCircle className="mr-2" size={20} /> New Article
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                    <h2 className="text-2xl font-semibold text-gray-300 mb-4">My Articles</h2>
                    <div className="space-y-4">
                        {myArticles.map(article => (
                            <div key={article.id} onClick={() => onArticleSelect(article.id)} className="bg-gray-900/70 p-4 rounded-lg cursor-pointer hover:bg-gray-700/50">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg text-white">{article.title}</h3>
                                    {getStatusChip(article.status)}
                                </div>
                                <p className="text-sm text-gray-400 mt-1">Created: {article.createdAt?.toDate().toLocaleDateString()}</p>
                            </div>
                        ))}
                        {myArticles.length === 0 && <p className="text-gray-500">You haven't created any articles.</p>}
                    </div>
                </div>
                 <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                    <h2 className="text-2xl font-semibold text-gray-300 mb-4">Pending Community Approval</h2>
                    <div className="space-y-4">
                        {pendingArticles.map(article => (
                            <div key={article.id} onClick={() => onArticleSelect(article.id)} className="bg-gray-900/70 p-4 rounded-lg cursor-pointer hover:bg-gray-700/50">
                                <h3 className="font-bold text-lg text-white">{article.title}</h3>
                                <p className="text-sm text-gray-400 mt-1">By {article.authorName}</p>
                            </div>
                        ))}
                        {pendingArticles.length === 0 && <p className="text-gray-500">No articles are currently pending approval.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ArticleView = ({ articleId, onBack, onEdit }) => {
    const { db, user, userData } = useFirebase();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isApproving, setIsApproving] = useState(false);

    useEffect(() => {
        if (!db || !articleId) return;
        const docRef = doc(db, 'articles', articleId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) setArticle({ id: docSnap.id, ...docSnap.data() });
            else setError({ message: "Article not found." });
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, articleId]);

    const handleApprove = async () => {
        setIsApproving(true); setError(null);
        try {
            const articleRef = doc(db, 'articles', articleId);
            const newApprovalCount = (article.approvals?.length || 0) + 1;
            const updatePayload = { approvals: arrayUnion(user.uid) };
            if (newApprovalCount >= 5) {
                updatePayload.status = 'published';
                updatePayload.publishedAt = serverTimestamp();
            }
            await updateDoc(articleRef, updatePayload);
        } catch (err) { setError(err); }
        setIsApproving(false);
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to permanently delete this article?")) {
            try { await deleteDoc(doc(db, 'articles', articleId)); onBack(); } 
            catch (err) { setError(err); }
        }
    };
    
    if (loading) return <Loader2 className="animate-spin text-cyan-400" size={48} />;
    if (!article) return <p className="text-red-400">{error?.message || "Could not load article."}</p>;

    const isAuthor = article.authorUid === user.uid;
    const canApprove = userData.role === 'journalist' && !isAuthor && article.status === 'pending_approval' && !(article.approvals?.includes(user.uid));

    return (
        <div className="w-full max-w-4xl p-4">
            <button onClick={onBack} className="mb-6 text-cyan-400 hover:underline">&larr; Back</button>
            <div className="bg-gray-800/50 p-8 rounded-lg shadow-lg border border-gray-700/50">
                <h1 className="text-4xl font-extrabold text-white mb-4">{article.title}</h1>
                <div className="flex justify-between items-center text-sm text-gray-400 mb-6 border-b border-gray-700 pb-4">
                    <span>By {article.authorName}</span>
                    <span>{article.createdAt?.toDate().toLocaleDateString()}</span>
                </div>
                <div className="prose prose-invert max-w-none mb-8" dangerouslySetInnerHTML={{ __html: article.content }}></div>
                
                {article.mediaAttachments?.length > 0 && <div className="mb-8"><h3 className="text-xl font-bold mb-2 text-gray-300">Attachments</h3>{article.mediaAttachments.map((media, i) => (<a key={i} href={media.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline block">{media.name}</a>))}</div>}
                
                {article.factCheckResult && <FactCheckCard result={article.factCheckResult} />}

                <div className="mt-8 pt-6 border-t border-gray-700 flex items-center gap-4">
                    {article.status === 'pending_approval' && <div className="bg-amber-500/10 border-l-4 border-amber-500 text-amber-300 p-4 rounded-r-lg"><p className="font-bold">Pending Approval</p><p>This article needs {5 - (article.approvals?.length || 0)} more approval(s) to be published.</p><p>Current Approvals: {article.approvals?.length || 0} / 5</p></div>}
                    {canApprove && <button onClick={handleApprove} disabled={isApproving} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-300 flex items-center gap-2">{isApproving ? <Loader2 className="animate-spin"/> : <Check />} Approve Article</button>}
                    {isAuthor && <button onClick={() => onEdit(article.id)} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2"><Edit /> Edit Article</button>}
                    {isAuthor && <button onClick={handleDelete} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center gap-2"><Trash2 /> Delete Article</button>}
                </div>
            </div>
            {error && <ErrorModal error={error} onClose={() => setError(null)} />}
        </div>
    );
};

const ArticleEditor = ({ articleId, onBack }) => {
    const { db, storage, user, userData } = useFirebase();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [status, setStatus] = useState('draft');
    const [mediaFile, setMediaFile] = useState(null);
    const [existingMedia, setExistingMedia] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (articleId) {
            setLoading(true);
            const docRef = doc(db, 'articles', articleId);
            getDoc(docRef).then(docSnap => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setTitle(data.title);
                    setContent(data.content);
                    setStatus(data.status);
                    setExistingMedia(data.mediaAttachments || []);
                }
                setLoading(false);
            });
        }
    }, [articleId, db]);

    const handleSubmit = async (e, newStatus) => {
        e.preventDefault();
        setLoading(true); setError(null);

        try {
            let mediaAttachments = [...existingMedia];
            if (mediaFile) {
                const storageRef = ref(storage, `articles/${user.uid}/${Date.now()}_${mediaFile.name}`);
                const snapshot = await uploadBytes(storageRef, mediaFile);
                const mediaUrl = await getDownloadURL(snapshot.ref);
                mediaAttachments.push({ name: mediaFile.name, url: mediaUrl });
            }

            const articleData = {
                title,
                content,
                status: newStatus,
                authorUid: user.uid,
                authorName: userData.displayName,
                mediaAttachments,
                updatedAt: serverTimestamp(),
            };

            if (articleId) {
                await updateDoc(doc(db, 'articles', articleId), articleData);
            } else {
                articleData.createdAt = serverTimestamp();
                articleData.approvals = [];
                await addDoc(collection(db, 'articles'), articleData);
            }
            onBack();
        } catch (err) { setError(err); } 
        finally { setLoading(false); }
    };

    if (loading && articleId) return <Loader2 className="animate-spin text-cyan-400" />;

    return (
        <div className="w-full max-w-4xl p-4">
            <button onClick={onBack} className="mb-6 text-cyan-400 hover:underline">&larr; Back to Dashboard</button>
            <form className="bg-gray-800/50 p-8 rounded-lg shadow-lg space-y-6 border border-gray-700/50">
                <h1 className="text-3xl font-bold text-cyan-300">{articleId ? 'Edit Article' : 'New Article'}</h1>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Article Title" className="w-full text-2xl font-bold p-2 bg-transparent border-b-2 border-gray-600 focus:outline-none focus:border-cyan-500" required />
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your article here... (supports basic HTML)" rows="15" className="w-full p-4 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Attach Media</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <UploadCloud className="mx-auto h-12 w-12 text-gray-500" />
                            <div className="flex text-sm text-gray-400"><label htmlFor="file-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-cyan-400 hover:text-cyan-300 focus-within:outline-none"><input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={e => setMediaFile(e.target.files[0])} /><span>Upload a file</span></label><p className="pl-1">or drag and drop</p></div>
                            {mediaFile ? <p className="text-sm text-gray-500">{mediaFile.name}</p> : <p className="text-xs text-gray-500">PNG, JPG, MP4 up to 10MB</p>}
                        </div>
                    </div>
                    {existingMedia.length > 0 && <div className="mt-4">
                        <h4 className="text-gray-300">Current Attachments:</h4>
                        <ul className="list-disc list-inside text-gray-400">
                            {existingMedia.map((m, i) => <li key={i}>{m.name}</li>)}
                        </ul>
                    </div>}
                </div>
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={(e) => handleSubmit(e, 'draft')} disabled={loading} className="bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors disabled:bg-gray-600">
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Save as Draft'}
                    </button>
                    <button type="button" onClick={(e) => handleSubmit(e, 'pending_approval')} disabled={loading} className="bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-500 transition-colors disabled:bg-gray-600">
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Submit for Approval'}
                    </button>
                </div>
            </form>
            {error && <ErrorModal error={error} onClose={() => setError(null)} />}
        </div>
    );
};

const ConversationManager = () => {
    const { db, user } = useFirebase();
    const [conversations, setConversations] = useState([]);
    const [activeConvo, setActiveConvo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if(!user || !db) return;
        const q = query(collection(db, 'conversations'), where('journalistUid', '==', user.uid), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snap) => {
            setConversations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, user]);

    const createNewConversation = async () => {
        const sourceName = prompt("Enter a temporary name for this source (e.g., 'Whistleblower X'):", "Anonymous Source");
        if (sourceName && user && db) {
            const newConvoRef = await addDoc(collection(db, 'conversations'), {
                journalistUid: user.uid,
                sourceDisplayName: sourceName,
                createdAt: serverTimestamp(),
            });
            setActiveConvo({ id: newConvoRef.id, sourceDisplayName: sourceName });
        }
    };

    if (loading) return <Loader2 className="animate-spin text-cyan-400" />;
    if (activeConvo) return <ChatWindow conversation={activeConvo} onBack={() => setActiveConvo(null)} />;

    return (
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-300">Secure Conversations</h2>
                <button onClick={createNewConversation} className="flex items-center bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-500 transition-colors">
                    <PlusCircle className="mr-2" size={20} /> New Chat
                </button>
            </div>
            <div className="space-y-3">
                {conversations.length > 0 ? conversations.map(convo => (
                    <div key={convo.id} onClick={() => setActiveConvo(convo)} className="bg-gray-900/70 p-4 rounded-lg cursor-pointer hover:bg-gray-700/50">
                        <p className="font-bold text-white">{convo.sourceDisplayName}</p>
                        <p className="text-sm text-gray-400">Created: {convo.createdAt?.toDate().toLocaleString()}</p>
                    </div>
                )) : <p className="text-gray-500 text-center py-4">No conversations yet. Start one to generate an invite link.</p>}
            </div>
        </div>
    );
};

const ChatWindow = ({ conversation, onBack }) => {
    const { db, user } = useFirebase();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const inviteLink = `${window.location.origin}${window.location.pathname}?chatId=${conversation.id}`;
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const messagesCol = collection(db, 'conversations', conversation.id, 'messages');
        const q = query(messagesCol, orderBy('timestamp'));
        const unsubscribe = onSnapshot(q, (snap) => setMessages(snap.docs.map(doc => doc.data())));
        return () => unsubscribe();
    }, [db, conversation.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;
        const messagesCol = collection(db, 'conversations', conversation.id, 'messages');
        await addDoc(messagesCol, {
            text: newMessage,
            sender: 'journalist',
            senderId: user.uid,
            timestamp: serverTimestamp(),
        });
        setNewMessage('');
    };

    const copyInviteLink = () => {
        navigator.clipboard.writeText(inviteLink).then(() => alert('Invite link copied to clipboard!'));
    };

    return (
        <div className="flex flex-col h-[70vh] bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
            <div className="flex items-center justify-between border-b border-gray-700 pb-3 mb-3">
                <div>
                    <button onClick={onBack} className="text-cyan-400 hover:underline mb-2">&larr; Back to Conversations</button>
                    <h3 className="text-xl font-bold text-white">{conversation.sourceDisplayName}</h3>
                </div>
                <button onClick={copyInviteLink} className="flex items-center bg-gray-700 text-white font-bold py-2 px-3 rounded-lg hover:bg-gray-600 transition-colors text-sm">
                    <Link className="mr-2" size={16} /> Copy Invite Link
                </button>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'journalist' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.sender === 'journalist' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-gray-600 text-white rounded-bl-none'}`}>
                            <p>{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type your message..." className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                <button type="submit" className="bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500">Send</button>
            </form>
        </div>
    );
};

const ChatInviteHandler = ({ chatId }) => {
    const { db } = useFirebase();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const fetchConvo = async () => {
            if (!db || !chatId) {
                setError("Invalid chat session.");
                setLoading(false);
                return;
            }
            const convoRef = doc(db, 'conversations', chatId);
            const convoSnap = await getDoc(convoRef);
            if (convoSnap.exists()) {
                const messagesCol = collection(db, 'conversations', chatId, 'messages');
                const q = query(messagesCol, orderBy('timestamp'));
                onSnapshot(q, (snap) => setMessages(snap.docs.map(doc => doc.data())));
            } else {
                setError("This chat does not exist or has been deleted.");
            }
            setLoading(false);
        };
        fetchConvo();
    }, [db, chatId]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;
        const messagesCol = collection(db, 'conversations', chatId, 'messages');
        await addDoc(messagesCol, {
            text: newMessage,
            sender: 'source',
            timestamp: serverTimestamp(),
        });
        setNewMessage('');
    };

    if (loading) return <div className="w-screen h-screen flex items-center justify-center bg-gray-900"><Loader2 className="animate-spin text-cyan-400" size={48} /></div>;
    if (error) return <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-red-400">{error}</div>;

    return (
        <div className="bg-gray-900 text-white h-screen w-screen flex flex-col p-4">
             <div className="flex items-center space-x-3 mb-4"><Shield className="text-cyan-400" size={32} /><h1 className="text-xl font-bold tracking-wider text-gray-50">Secure Chat</h1></div>
             <p className="text-gray-400 text-sm mb-4">You are chatting securely with a journalist. Your identity is anonymous.</p>
             <div className="flex-grow overflow-y-auto pr-2 space-y-4 bg-gray-800 p-4 rounded-lg">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'source' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.sender === 'source' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-gray-600 text-white rounded-bl-none'}`}>
                            <p>{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type your message..." className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                <button type="submit" className="bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500">Send</button>
            </form>
        </div>
    );
};

const SecureVault = () => {
    const { db, user, storage } = useFirebase();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!db || !user) return;
        const vaultCol = collection(db, 'users', user.uid, 'vaultFiles');
        const q = query(vaultCol, orderBy('uploadedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, () => setLoading(false));
        return () => unsubscribe();
    }, [db, user]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !user) return;
        setUploading(true);
        const storageRef = ref(storage, `vault/${user.uid}/${Date.now()}_${file.name}`);
        try {
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            await addDoc(collection(db, 'users', user.uid, 'vaultFiles'), {
                fileName: file.name,
                fileType: file.type,
                size: file.size,
                url,
                storagePath: snapshot.ref.fullPath,
                uploadedAt: serverTimestamp(),
            });
        } catch (error) { console.error("Upload failed", error); }
        setUploading(false);
    };

    const handleDeleteFile = async (file) => {
        if (!window.confirm(`Are you sure you want to delete ${file.fileName}?`)) return;
        try {
            // Delete from Firestore
            await deleteDoc(doc(db, 'users', user.uid, 'vaultFiles', file.id));
            // Delete from Storage
            const fileRef = ref(storage, file.storagePath);
            await deleteObject(fileRef);
        } catch (error) {
            console.error("Failed to delete file:", error);
            alert("Error deleting file. It may have been partially removed. Please check the console.");
        }
    };

    return (
        <div className="w-full h-[70vh] bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-300">Secure Vault</h2>
                <label className="flex items-center gap-2 bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-500 cursor-pointer">
                    {uploading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
                    {uploading ? 'Uploading...' : 'Upload File'}
                    <input type="file" hidden onChange={handleFileUpload} disabled={uploading} />
                </label>
            </div>
            <div className="flex-1 overflow-y-auto">
                {loading ? <Loader2 className="animate-spin mx-auto mt-10 text-cyan-400" /> :
                <ul className="space-y-2">
                    {files.map(file => (
                        <li key={file.id} className="p-3 rounded-lg bg-gray-900/70 flex justify-between items-center group">
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                                <File size={20} className="text-cyan-400" />
                                <div>
                                    <p className="font-semibold text-white">{file.fileName}</p>
                                    <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB &bull; {file.uploadedAt?.toDate().toLocaleDateString()}</p>
                                </div>
                            </a>
                            <button onClick={() => handleDeleteFile(file)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-red-500/20">
                                <Trash2 size={18} />
                            </button>
                        </li>
                    ))}
                    {files.length === 0 && <p className="text-center text-gray-500 py-8">Your vault is empty. Upload a file to get started.</p>}
                </ul>}
            </div>
        </div>
    );
};

// --- HRD PORTAL ---

const HRDDashboard = ({ onCaseSelect, onNewCase }) => {
    const { db, user } = useFirebase();
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !db) return;
        const q = query(collection(db, 'cases'), where('assignedToUid', '==', user.uid), orderBy('lastUpdatedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snap) => {
            setCases(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user, db]);
    
    const getStatusChip = (status) => {
        const styles = {
            new: "text-blue-800 bg-blue-200",
            in_progress: "text-yellow-800 bg-yellow-200",
            closed: "text-gray-800 bg-gray-300",
        };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status] || styles.closed}`}>{status.replace('_', ' ')}</span>;
    };

    if (loading) return <Loader2 className="animate-spin text-cyan-400" size={48} />;

    return (
        <div className="w-full max-w-4xl p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-cyan-300">HRD Case Dashboard</h1>
                <button onClick={onNewCase} className="flex items-center bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-500 transition-colors">
                    <PlusCircle className="mr-2" size={20}/> New Case
                </button>
            </div>
            <div className="bg-gray-800/50 rounded-lg shadow-md border border-gray-700/50">
                <ul className="divide-y divide-gray-700">
                    {cases.map(c => (
                        <li key={c.id} onClick={() => onCaseSelect(c.id)} className="p-4 hover:bg-gray-700/50 cursor-pointer flex justify-between items-center">
                            <div><p className="text-lg font-semibold text-white">{c.caseTitle}</p><p className="text-sm text-gray-400">ID: {c.caseId}</p></div>
                            {getStatusChip(c.status)}
                        </li>
                    ))}
                    {cases.length === 0 && <p className="p-4 text-gray-500">No cases assigned to you.</p>}
                </ul>
            </div>
        </div>
    );
};

const NewCase = ({ onBack }) => {
    const { db, user } = useFirebase();
    const [caseTitle, setCaseTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true);
        try {
            await addDoc(collection(db, 'cases'), {
                caseTitle, description, caseId: `CASE-${Date.now()}`, status: 'new',
                assignedToUid: user.uid, createdAt: serverTimestamp(), lastUpdatedAt: serverTimestamp(),
            });
            onBack();
        } catch (err) { setError(err); }
        setLoading(false);
    };

    return (
        <div className="w-full max-w-4xl p-4">
            <button onClick={onBack} className="mb-6 text-cyan-400 hover:underline">&larr; Back to Dashboard</button>
            <form onSubmit={handleSubmit} className="bg-gray-800/50 p-8 rounded-lg shadow-lg space-y-6 border border-gray-700/50">
                <h1 className="text-3xl font-bold text-cyan-300">Create New Case</h1>
                <input type="text" value={caseTitle} onChange={e => setCaseTitle(e.target.value)} placeholder="Case Title" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Case Description" rows="8" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
                <button type="submit" disabled={loading} className="w-full bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500 disabled:bg-gray-600">
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Create Case'}
                </button>
            </form>
            {error && <ErrorModal error={error} onClose={() => setError(null)} />}
        </div>
    );
};

const CaseView = ({ caseId, onBack }) => {
    const { db } = useFirebase();
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details');

    useEffect(() => {
        const caseRef = doc(db, 'cases', caseId);
        const unsubscribe = onSnapshot(caseRef, (snap) => {
            if (snap.exists()) setCaseData({ id: snap.id, ...snap.data() });
            setLoading(false);
        });
        return unsubscribe;
    }, [db, caseId]);

    if (loading) return <Loader2 className="animate-spin text-cyan-400" size={48} />;
    if (!caseData) return <p className="text-red-400">Could not load case.</p>;

    const TabButton = ({ view, label, icon: Icon }) => (
        <button onClick={() => setActiveTab(view)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${activeTab === view ? 'text-cyan-300 border-cyan-300' : 'text-gray-400 border-transparent hover:text-white'}`}>
            <Icon size={16} /> {label}
        </button>
    );

    return (
        <div className="w-full max-w-5xl p-4">
            <button onClick={onBack} className="mb-6 text-cyan-400 hover:underline">&larr; Back to Dashboard</button>
            <h1 className="text-3xl font-bold text-white mb-2">{caseData.caseTitle}</h1>
            <p className="text-gray-400 mb-6">Case ID: {caseData.caseId}</p>
            <div className="border-b border-gray-700 flex mb-6">
                <TabButton view="details" label="Details" icon={Info} />
                <TabButton view="evidence" label="Evidence Locker" icon={Lock} />
                <TabButton view="tasks" label="Action Items" icon={ListTodo} />
                <TabButton view="chat" label="Secure Chat" icon={MessageSquare} />
            </div>
            <div className="bg-gray-800/50 p-6 rounded-b-lg shadow-lg border-x border-b border-gray-700/50">
                {activeTab === 'details' && <CaseDetails caseData={caseData} />}
                {activeTab === 'evidence' && <EvidenceLocker caseId={caseId} />}
                {activeTab === 'tasks' && <CaseTasks caseId={caseId} />}
                {activeTab === 'chat' && <CaseChat caseId={caseId} />}
            </div>
        </div>
    );
};

const CaseDetails = ({ caseData }) => (
    <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-900/50 p-4 rounded-lg"><h4 className="font-bold text-gray-400">Status</h4><p className="text-lg text-white">{caseData.status}</p></div>
            <div className="bg-gray-900/50 p-4 rounded-lg"><h4 className="font-bold text-gray-400">Created</h4><p className="text-lg text-white">{caseData.createdAt?.toDate().toLocaleDateString()}</p></div>
            <div className="bg-gray-900/50 p-4 rounded-lg"><h4 className="font-bold text-gray-400">Last Updated</h4><p className="text-lg text-white">{caseData.lastUpdatedAt?.toDate().toLocaleDateString()}</p></div>
        </div>
        <h3 className="text-xl font-bold mb-2 text-gray-300">Description</h3>
        <p className="text-gray-300 whitespace-pre-wrap">{caseData.description}</p>
    </div>
);

const EvidenceLocker = ({ caseId }) => {
    const { db, storage, user } = useFirebase();
    const [evidence, setEvidence] = useState([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const q = query(collection(db, `cases/${caseId}/evidence`), orderBy('uploadedAt', 'desc'));
        const unsubscribe = onSnapshot(q, snap => setEvidence(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return unsubscribe;
    }, [db, caseId]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !user) return;
        setUploading(true);
        const storageRef = ref(storage, `cases/${caseId}/evidence/${Date.now()}_${file.name}`);
        try {
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            await addDoc(collection(db, `cases/${caseId}/evidence`), {
                fileName: file.name,
                fileType: file.type,
                url,
                uploadedAt: serverTimestamp(),
                uploaderUid: user.uid
            });
        } catch (error) { console.error("Upload failed", error); }
        setUploading(false);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-300">Evidence Files</h3>
                <label className="flex items-center gap-2 bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-500 cursor-pointer">
                    {uploading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                    <span>{uploading ? 'Uploading...' : "Upload File"}</span>
                    <input type="file" hidden onChange={handleFileUpload} disabled={uploading} />
                </label>
            </div>
            <ul className="space-y-3">
                {evidence.map(item => (
                    <li key={item.id} className="bg-gray-900/50 p-3 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <File className="text-cyan-400" />
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-white hover:underline">{item.fileName}</a>
                        </div>
                        <span className="text-xs text-gray-500">{item.uploadedAt?.toDate().toLocaleDateString()}</span>
                    </li>
                ))}
                {evidence.length === 0 && <p className="text-gray-500 text-center py-4">No evidence uploaded.</p>}
            </ul>
        </div>
    );
};

const CaseTasks = ({ caseId }) => {
    const { db } = useFirebase();
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState('');

    useEffect(() => {
        const q = query(collection(db, `cases/${caseId}/tasks`), orderBy('createdAt'));
        const unsubscribe = onSnapshot(q, snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return unsubscribe;
    }, [db, caseId]);

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (newTask.trim() === '') return;
        await addDoc(collection(db, `cases/${caseId}/tasks`), {
            text: newTask,
            completed: false,
            createdAt: serverTimestamp()
        });
        setNewTask('');
    };

    const handleToggleTask = async (id, completed) => {
        await updateDoc(doc(db, `cases/${caseId}/tasks`, id), { completed: !completed });
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-gray-300 mb-4">Action Items</h3>
            <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
                <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="New action item..." className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                <button type="submit" className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-500">Add</button>
            </form>
            <ul className="space-y-2">
                {tasks.map(task => (
                    <li key={task.id} onClick={() => handleToggleTask(task.id, task.completed)} className="bg-gray-900/50 p-3 rounded-lg flex items-center gap-3 cursor-pointer">
                        <CheckCircle className={task.completed ? 'text-green-500' : 'text-gray-600'} />
                        <span className={task.completed ? 'line-through text-gray-500' : 'text-white'}>{task.text}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const CaseChat = ({ caseId }) => {
    const { db, user } = useFirebase();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const inviteLink = `${window.location.origin}${window.location.pathname}?caseChatId=${caseId}`;
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const q = query(collection(db, `caseChats/${caseId}/messages`), orderBy('timestamp'));
        const unsubscribe = onSnapshot(q, snap => setMessages(snap.docs.map(d => d.data())));
        return unsubscribe;
    }, [db, caseId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;
        await addDoc(collection(db, `caseChats/${caseId}/messages`), {
            text: newMessage,
            sender: 'hrd',
            senderId: user.uid,
            timestamp: serverTimestamp()
        });
        setNewMessage('');
    };
    
    return (
        <div className="flex flex-col h-[60vh]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-300">Secure Client Chat</h3>
                <button onClick={() => navigator.clipboard.writeText(inviteLink).then(() => alert('Invite link copied!'))} className="flex items-center bg-gray-700 text-white font-bold py-2 px-3 rounded-lg hover:bg-gray-600 text-sm">
                    <Link className="mr-2" size={16} /> Copy Invite Link
                </button>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 space-y-4 bg-gray-900/50 p-4 rounded-lg">
                 {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'hrd' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.sender === 'hrd' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-gray-600 text-white rounded-bl-none'}`}>
                            <p>{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type your message..." className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                <button type="submit" className="bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500">Send</button>
            </form>
        </div>
    );
};

const CaseChatInviteHandler = ({ caseChatId }) => {
    const { db } = useFirebase();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const checkCase = async () => {
            if (!db || !caseChatId) {
                setError("Invalid chat session.");
                setLoading(false);
                return;
            }
            const caseRef = doc(db, 'cases', caseChatId);
            const caseSnap = await getDoc(caseRef);
            if (!caseSnap.exists()) {
                setError("This secure chat link is invalid or the case has been closed.");
                setLoading(false);
                return;
            }
            const messagesCol = collection(db, 'caseChats', caseChatId, 'messages');
            const q = query(messagesCol, orderBy('timestamp'));
            onSnapshot(q, (snap) => setMessages(snap.docs.map(doc => doc.data())));
            setLoading(false);
        };
        checkCase();
    }, [db, caseChatId]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;
        await addDoc(collection(db, 'caseChats', caseChatId, 'messages'), {
            text: newMessage,
            sender: 'client',
            timestamp: serverTimestamp(),
        });
        setNewMessage('');
    };

    if (loading) return <div className="w-screen h-screen flex items-center justify-center bg-gray-900"><Loader2 className="animate-spin text-cyan-400" size={48} /></div>;
    if (error) return <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-red-400 p-8 text-center">{error}</div>;

    return (
        <div className="bg-gray-900 text-white h-screen w-screen flex flex-col p-4">
             <div className="flex items-center space-x-3 mb-4"><Shield className="text-cyan-400" size={32} /><h1 className="text-xl font-bold tracking-wider text-gray-50">Secure Case Chat</h1></div>
             <p className="text-gray-400 text-sm mb-4">You are chatting securely with a human rights defender. Your identity is anonymous.</p>
             <div className="flex-grow overflow-y-auto pr-2 space-y-4 bg-gray-800 p-4 rounded-lg">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.sender === 'client' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-gray-600 text-white rounded-bl-none'}`}>
                            <p>{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type your message..." className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                <button type="submit" className="bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500">Send</button>
            </form>
        </div>
    );
};

// --- UTILITY & HELPER COMPONENTS ---
const aegisEngine = {
  getFactCheckResult: async (mediaFile) => {
    console.log("Submitting media to Aegis Engine for deep analysis...");
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1500));
    const mockScores = ["High Confidence", "Suspicious", "Manipulation Detected"];
    const mockDetails = {
      "High Confidence": ["No anomalies detected.", "Source metadata verified.", "Consistent lighting and shadows."],
      "Suspicious": ["Inconsistent compression artifacts found.", "Metadata appears to be stripped or altered.", "Unusual noise pattern detected."],
      "Manipulation Detected": ["Signs of GAN-based facial synthesis detected.", "Inconsistent shadows and lighting suggest object insertion.", "Audio spectrogram shows signs of synthetic speech."]
    };
    const randomScore = mockScores[Math.floor(Math.random() * mockScores.length)];
    const randomDetail = mockDetails[randomScore][Math.floor(Math.random() * mockDetails[randomScore].length)];
    return { score: randomScore, details: [randomDetail], checkedAt: new Date().toISOString() };
  }
};

const FactCheckCard = ({ result }) => {
    const scoreMeta = { "Manipulation Detected": { Icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-500/10' }, "Suspicious": { Icon: AlertTriangle, color: 'text-amber-400', bgColor: 'bg-amber-500/10' }, "High Confidence": { Icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/10' }, }[result.score] || { Icon: Info, color: 'text-gray-400', bgColor: 'bg-gray-500/10' };
    return (
        <div className={`border-l-4 ${scoreMeta.bgColor.replace('bg-','border-')} p-4 rounded-r-lg ${scoreMeta.bgColor}`}>
            <h4 className={`text-lg font-bold ${scoreMeta.color}`}>Aegis Engine Fact-Check</h4>
            <p className="font-semibold text-gray-300">Score: <span className={scoreMeta.color}>{result.score}</span></p>
            <p className="text-sm text-gray-400 mt-2">Details: {result.details.join(', ')}</p>
            <p className="text-xs text-gray-500 mt-2">Checked on: {new Date(result.checkedAt).toLocaleString()}</p>
        </div>
    );
};

const ErrorModal = ({ error, onClose }) => {
    if (!error) return null;
    const handleFirebaseError = (err) => {
        let message = "An unknown error occurred.";
        let solution = "Please try again later or contact support.";
        switch (err.code) {
            case 'auth/user-not-found': 
            case 'auth/wrong-password': 
            case 'auth/invalid-credential':
                message = 'Invalid Credentials.'; 
                solution = 'Please double-check your email and password. Ensure you are using the correct login method.'; 
                break;
            case 'auth/invalid-email': 
                message = 'Invalid Email Format.'; 
                solution = 'Please enter a valid email address (e.g., user@example.com).'; 
                break;
            case 'auth/email-already-in-use': 
                message = 'Email Already in Use.'; 
                solution = 'An account with this email already exists. Please try logging in or use a different email address.'; 
                break;
            case 'permission-denied': 
                message = 'Permission Denied.'; 
                solution = 'You do not have the necessary permissions for this action. This could be due to Firestore security rules. Check the console for more details.'; 
                break;
            case 'unavailable':
                message = 'Service Unavailable';
                solution = 'The Firebase service is currently unavailable. This is likely a temporary issue. Please try again in a few moments.';
                break;
            default: 
                message = err.message || message; 
                break;
        }
        return { title: message, solution, code: err.code };
    };
    const { title, solution, code } = handleFirebaseError(error);
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 animate-fade-in">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 border border-red-500/50">
                <div className="flex items-center mb-4">
                    <AlertTriangle className="text-red-500 text-3xl mr-4" />
                    <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
                </div>
                <div className="text-gray-300 space-y-4">
                    <div>
                        <strong className="font-semibold text-gray-200 block">Message:</strong>
                        <p>{title}</p>
                    </div>
                    <div>
                        <strong className="font-semibold text-gray-200 block">Solution:</strong>
                        <p>{solution}</p>
                    </div>
                    {code && (
                        <div>
                            <strong className="font-semibold text-gray-200 block">Error Code:</strong>
                            <p className="font-mono text-sm text-gray-400 bg-gray-900 px-2 py-1 rounded">{code}</p>
                        </div>
                    )}
                </div>
                <button onClick={onClose} className="mt-6 w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors">Close</button>
            </div>
        </div>
    );
};

const GlobalStyles = () => {
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
          @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
          .prose { color: #d1d5db; } .prose strong { color: #ffffff; } .prose li::marker { color: #22d3ee; } .prose a { color: #22d3ee; } .prose a:hover { color: #67e8f9; }
          .form-radio { appearance: none; display: inline-block; width: 1.25em; height: 1.25em; border-radius: 50%; border: 2px solid #4b5563; vertical-align: middle; transition: all 0.2s; }
          .form-radio:checked { background-color: #06b6d4; border-color: #0891b2; background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='8' cy='8' r='3'/%3e%3c/svg%3e"); }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);
    return null;
};

// --- Default Export ---
export default AppWrapper;
