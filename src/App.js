import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { Shield, UploadCloud, Cpu, Wifi, Bot, AlertTriangle, CheckCircle, X, Loader2, Info, PlusCircle, Trash2, Newspaper, UserCheck, LogOut, Briefcase, Check, LogIn, MessageSquare, Link, BookLock, Save, Folder, File, ListTodo, Lock, Edit, Sparkles, Gauge, Gavel, SearchCode, BarChart, Siren } from 'lucide-react';

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


// --- App Constants ---
// It's best practice to keep constants in a separate file (e.g., `constants.js`)
const CONSTANTS = {
    ROLES: {
        JOURNALIST: 'journalist',
        HRD: 'hrd',
    },
    VIEWS: {
        // Public
        FACT_CHECKER: 'fact-checker',
        NEWS: 'news',
        PORTALS: 'portals',
        STATUS: 'status',
        ABOUT: 'about',
        CHAT_INVITE: 'chat-invite',
        CASE_CHAT_INVITE: 'case-chat-invite',
        // Journalist
        JOURNALIST_PORTAL: 'journalist-portal',
        COMMS: 'comms',
        VAULT: 'vault',
        ARTICLE_EDITOR: 'articleEditor',
        ARTICLE_VIEW: 'articleView',
        THREAT_INTEL: 'threat-intel',
        SOURCE_VETTING: 'source-vetting',
        DATA_STUDIO: 'data-studio',
        // HRD
        HRD_PORTAL: 'hrd-portal',
        CASE_VIEW: 'caseView',
        NEW_CASE: 'newCase',
        RISK_ANALYSIS: 'risk-analysis',
        LEGAL_AI: 'legal-ai',
    },
    COLLECTIONS: {
        USERS: 'users',
        ARTICLES: 'articles',
        PROJECTS: 'projects',
        CONVERSATIONS: 'conversations',
        CASES: 'cases',
        CASE_CHATS: 'caseChats',
    }
};


// --- Firebase Configuration ---
// IMPORTANT: In a real-world application, never commit API keys to a public repository.
// Use environment variables (e.g., a .env file) for security.
const firebaseConfig = {
  apiKey: "AIzaSyAIcU46cd9mY6Q9rbvWK4KYWPWRqAGtbYg",
  authDomain: "chimtest-6854a.firebaseapp.com",
  projectId: "chimtest-6854a",
  storageBucket: "chimtest-6854a.appspot.com",
  messagingSenderId: "178975469028",
  appId: "1:178975469028:web:fe72c902fb4b321a082bf1",
};


// --- Gemini API Helper ---
const callGeminiAPI = async (prompt, maxRetries = 3) => {
    // IMPORTANT: In a production environment, you should use a backend proxy to call the Gemini API. 
    // Exposing an API key on the client-side, even from environment variables, is a security risk.
    const apiKey = ""; // This will be handled by the environment.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                return result.candidates[0].content.parts[0].text;
            } else {
                console.warn("Gemini API response is missing expected content:", result);
                throw new Error("Invalid response structure from Gemini API");
            }
        } catch (error) {
            console.error(`Gemini API call failed on attempt ${attempt + 1}:`, error);
            attempt++;
            if (attempt >= maxRetries) {
                throw new Error("Gemini API call failed after multiple retries.");
            }
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// --- Custom Hooks ---
/**
 * A custom hook to subscribe to Firestore queries in real-time.
 * @param {object} firestoreQuery - A Firestore query object created with query().
 * @returns {{data: Array, loading: boolean, error: Error|null}}
 */
const useFirestoreQuery = (firestoreQuery) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!firestoreQuery) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        const unsubscribe = onSnapshot(firestoreQuery, 
            (querySnapshot) => {
                const fetchedData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setData(fetchedData);
                setLoading(false);
            }, 
            (err) => {
                console.error("Firestore query error:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [firestoreQuery]); // Re-run effect if the query object changes

    return { data, loading, error };
};


// --- Firebase Context for global state management ---
const FirebaseContext = createContext(null);
export const useFirebase = () => useContext(FirebaseContext);

const FirebaseProvider = ({ children }) => {
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [storage, setStorage] = useState(null);
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthReady, setIsAuthReady] = useState(false);

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
                    const userDocRef = doc(dbInstance, CONSTANTS.COLLECTIONS.USERS, firebaseUser.uid);
                    const unsubUser = onSnapshot(userDocRef, (userDocSnap) => {
                        setUserData(userDocSnap.exists() ? userDocSnap.data() : null);
                        setIsAuthReady(true);
                        setLoading(false);
                    }, (error) => {
                        console.error("Error fetching user data:", error);
                        setUserData(null);
                        setIsAuthReady(true);
                        setLoading(false);
                    });
                    return () => unsubUser();
                } else {
                    setUserData(null);
                    setIsAuthReady(true);
                    setLoading(false);
                }
            });
            
            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            setLoading(false);
        }
    }, []);

    const value = { auth, db, storage, user, userData, loading, isAuthReady };

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
  const { user, loading, userData, isAuthReady } = useFirebase();
  const [activeView, setActiveView] = useState(CONSTANTS.VIEWS.FACT_CHECKER);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chatId = params.get('chatId');
    const caseChatId = params.get('caseChatId');
    if (chatId) {
        setActiveView(CONSTANTS.VIEWS.CHAT_INVITE);
        setActiveId(chatId);
    } else if (caseChatId) {
        setActiveView(CONSTANTS.VIEWS.CASE_CHAT_INVITE);
        setActiveId(caseChatId);
    }
  }, []);

  const handleNavigate = (view, id = null) => {
    setActiveView(view);
    setActiveId(id);
    window.scrollTo(0, 0); // Scroll to top on view change
  }

  if (loading || !isAuthReady) {
      return <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-cyan-400"><Loader2 size={48} className="animate-spin" /></div>;
  }

  // --- Anonymous/Public Views ---
  if (activeView === CONSTANTS.VIEWS.CHAT_INVITE) return <ChatInviteHandler chatId={activeId} />;
  if (activeView === CONSTANTS.VIEWS.CASE_CHAT_INVITE) return <CaseChatInviteHandler caseChatId={activeId} />;
  
  if (!user) {
      return <PublicLayout activeView={activeView} setActiveView={handleNavigate} />;
  }
  
  // --- Authenticated Views ---
  const renderActiveView = () => {
    // A switch statement is often cleaner for routing logic
    switch (activeView) {
        // General
        case CONSTANTS.VIEWS.NEWS: return <CommunityNews onArticleSelect={(id) => handleNavigate(CONSTANTS.VIEWS.ARTICLE_VIEW, id)} />;
        case CONSTANTS.VIEWS.ABOUT: return <AboutProject />;
        
        // Journalist
        case CONSTANTS.VIEWS.JOURNALIST_PORTAL: return <JournalistDashboard onNavigate={handleNavigate} />;
        case CONSTANTS.VIEWS.COMMS: return <ConversationManager />;
        case CONSTANTS.VIEWS.VAULT: return <SecureVault />;
        case CONSTANTS.VIEWS.ARTICLE_EDITOR: return <ArticleEditor articleId={activeId} onBack={() => handleNavigate(CONSTANTS.VIEWS.JOURNALIST_PORTAL)} />;
        case CONSTANTS.VIEWS.ARTICLE_VIEW: return <ArticleView articleId={activeId} onBack={() => handleNavigate(CONSTANTS.VIEWS.JOURNALIST_PORTAL)} onEdit={(id) => handleNavigate(CONSTANTS.VIEWS.ARTICLE_EDITOR, id)} />;
        case CONSTANTS.VIEWS.THREAT_INTEL: return <ThreatIntelDashboard />;
        case CONSTANTS.VIEWS.SOURCE_VETTING: return <SourceVettingDashboard />;
        case CONSTANTS.VIEWS.DATA_STUDIO: return <DataStudio />;
        
        // HRD
        case CONSTANTS.VIEWS.HRD_PORTAL: return <HRDDashboard onCaseSelect={(id) => handleNavigate(CONSTANTS.VIEWS.CASE_VIEW, id)} onNewCase={() => handleNavigate(CONSTANTS.VIEWS.NEW_CASE)} />;
        case CONSTANTS.VIEWS.CASE_VIEW: return <CaseView caseId={activeId} onBack={() => handleNavigate(CONSTANTS.VIEWS.HRD_PORTAL)} />;
        case CONSTANTS.VIEWS.NEW_CASE: return <NewCase onBack={() => handleNavigate(CONSTANTS.VIEWS.HRD_PORTAL)} />;
        case CONSTANTS.VIEWS.RISK_ANALYSIS: return <RiskAnalysisDashboard />;
        case CONSTANTS.VIEWS.LEGAL_AI: return <LegalAidAI />;

        default:
            // Default to the user's main dashboard
            if (userData?.role === CONSTANTS.ROLES.JOURNALIST) return <JournalistDashboard onNavigate={handleNavigate} />;
            if (userData?.role === CONSTANTS.ROLES.HRD) return <HRDDashboard onCaseSelect={(id) => handleNavigate(CONSTANTS.VIEWS.CASE_VIEW, id)} onNewCase={() => handleNavigate(CONSTANTS.VIEWS.NEW_CASE)} />;
            return <CommunityNews onArticleSelect={(id) => handleNavigate(CONSTANTS.VIEWS.ARTICLE_VIEW, id)} />;
    }
  };

  return (
    <div className="bg-gray-900 text-gray-200 font-sans min-h-screen flex w-full h-screen">
      <LoggedInSidebar activeView={activeView} setActiveView={handleNavigate} />
      <div className="flex-1 flex flex-col h-screen">
        <Header />
        <main className="flex-grow p-4 md:p-8 flex items-start justify-center overflow-y-auto bg-grid">
          <ErrorBoundary key={activeView + activeId}>
            {renderActiveView()}
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
            <main className="flex-grow p-4 md:p-8 flex items-start justify-center overflow-y-auto bg-grid">
                <ErrorBoundary key={activeView}>
                    {activeView === CONSTANTS.VIEWS.FACT_CHECKER && <FactChecker />}
                    {activeView === CONSTANTS.VIEWS.NEWS && <CommunityNews onArticleSelect={() => {}} />}
                    {activeView === CONSTANTS.VIEWS.PORTALS && <Portals onNavigate={setActiveView} />}
                    {activeView === CONSTANTS.VIEWS.STATUS && <SystemStatus />}
                    {activeView === CONSTANTS.VIEWS.ABOUT && <AboutProject />}
                </ErrorBoundary>
            </main>
        </div>
    </div>
);

const PublicSidebar = ({ activeView, setActiveView }) => (
    <nav className="w-64 bg-gray-900/80 border-r border-gray-700/50 flex-shrink-0 flex flex-col p-4">
        <div className="flex items-center space-x-3 mb-10 px-2"><Shield className="text-cyan-400" size={32} /><h1 className="text-xl font-bold tracking-wider text-gray-50">Chimera</h1></div>
        <ul className="space-y-2 flex-grow">
            <NavItem icon={Cpu} label="Fact-Checker" view={CONSTANTS.VIEWS.FACT_CHECKER} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.FACT_CHECKER)} />
            <NavItem icon={Newspaper} label="Verified News" view={CONSTANTS.VIEWS.NEWS} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.NEWS)} />
            <NavItem icon={LogIn} label="Portals" view={CONSTANTS.VIEWS.PORTALS} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.PORTALS)} />
            <NavItem icon={Wifi} label="System Status" view={CONSTANTS.VIEWS.STATUS} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.STATUS)} />
            <NavItem icon={Info} label="About the Project" view={CONSTANTS.VIEWS.ABOUT} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.ABOUT)} />
        </ul>
        <div className="mt-auto text-center text-xs text-gray-500"><p>Version 5.0.0</p><p>Resilient. Secure. Intelligent.</p></div>
    </nav>
);

const LoggedInSidebar = ({ activeView, setActiveView }) => {
    const { auth, userData } = useFirebase();
    const handleSignOut = async () => {
        await firebaseSignOut(auth);
        setActiveView(CONSTANTS.VIEWS.FACT_CHECKER); // Reset view on logout
    };

    const isJournalist = userData?.role === CONSTANTS.ROLES.JOURNALIST;
    const isHrd = userData?.role === CONSTANTS.ROLES.HRD;

    return (
        <nav className="w-64 bg-gray-900/80 border-r border-gray-700/50 flex-shrink-0 flex flex-col p-4 overflow-y-auto">
            <div className="flex items-center space-x-3 mb-10 px-2">
                <Shield className="text-cyan-400" size={32} />
                <h1 className="text-xl font-bold tracking-wider text-gray-50">Chimera</h1>
            </div>
            
            <ul className="space-y-1 flex-grow">
                {/* General Section */}
                <NavItem icon={Newspaper} label="Verified News" view={CONSTANTS.VIEWS.NEWS} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.NEWS)} />

                {/* Journalist Section */}
                {isJournalist && (
                    <>
                        <li className="px-3 pt-4 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Journalist Tools</li>
                        <NavItem icon={Folder} label="Projects" view={CONSTANTS.VIEWS.JOURNALIST_PORTAL} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.JOURNALIST_PORTAL)} />
                        <NavItem icon={MessageSquare} label="Secure Comms" view={CONSTANTS.VIEWS.COMMS} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.COMMS)} />
                        <NavItem icon={BookLock} label="Secure Vault" view={CONSTANTS.VIEWS.VAULT} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.VAULT)} />
                        
                        <li className="px-3 pt-4 pb-2 text-xs font-bold text-purple-400 uppercase tracking-wider">Intelligence Suite</li>
                        <NavItem icon={SearchCode} label="Threat Intel" view={CONSTANTS.VIEWS.THREAT_INTEL} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.THREAT_INTEL)} />
                        <NavItem icon={UserCheck} label="Source Vetting" view={CONSTANTS.VIEWS.SOURCE_VETTING} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.SOURCE_VETTING)} />
                        <NavItem icon={BarChart} label="Data Studio" view={CONSTANTS.VIEWS.DATA_STUDIO} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.DATA_STUDIO)} />
                    </>
                )}

                {/* HRD Section */}
                {isHrd && (
                    <>
                        <li className="px-3 pt-4 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">HRD Tools</li>
                        <NavItem icon={Briefcase} label="Case Dashboard" view={CONSTANTS.VIEWS.HRD_PORTAL} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.HRD_PORTAL)} />
                        
                        <li className="px-3 pt-4 pb-2 text-xs font-bold text-purple-400 uppercase tracking-wider">Assistance Suite</li>
                        <NavItem icon={Gauge} label="Risk Analysis" view={CONSTANTS.VIEWS.RISK_ANALYSIS} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.RISK_ANALYSIS)} />
                        <NavItem icon={Gavel} label="Legal Aid AI" view={CONSTANTS.VIEWS.LEGAL_AI} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.LEGAL_AI)} />
                    </>
                )}
                
                {/* Project Info Section */}
                <li className="px-3 pt-4 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Project</li>
                <NavItem icon={Info} label="About Chimera" view={CONSTANTS.VIEWS.ABOUT} activeView={activeView} onClick={() => setActiveView(CONSTANTS.VIEWS.ABOUT)} />
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
    const [role, setRole] = useState(CONSTANTS.ROLES.JOURNALIST);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleSignUp = async (e) => {
        e.preventDefault(); setLoading(true); setError(null);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, CONSTANTS.COLLECTIONS.USERS, userCredential.user.uid), {
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
                        <label className="flex items-center space-x-2"><input type="radio" name="role" value={CONSTANTS.ROLES.JOURNALIST} checked={role === CONSTANTS.ROLES.JOURNALIST} onChange={e => setRole(e.target.value)} className="form-radio text-cyan-500 bg-gray-700 border-gray-600" /><span>Journalist</span></label>
                        <label className="flex items-center space-x-2"><input type="radio" name="role" value={CONSTANTS.ROLES.HRD} checked={role === CONSTANTS.ROLES.HRD} onChange={e => setRole(e.target.value)} className="form-radio text-cyan-500 bg-gray-700 border-gray-600" /><span>HR Defender</span></label>
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
            // Replace alert with a more modern notification system in a real app
            console.warn("Please select a valid image or video file.");
        }
    };

    const handleDeepAnalysis = async () => {
        if (!selectedFile) return;
        setIsAnalyzing(true);
        setAnalysisReport(null);
        // Mocking API call to Aegis Engine
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

// A simple sparkline component for the new status page
const Sparkline = ({ data, color = "#06b6d4", width = 100, height = 30 }) => {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d - min) / (max - min || 1) * height);
        return `${x},${y}`;
    }).join(' ');

    return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}><polyline fill="none" stroke={color} strokeWidth="2" points={points}/></svg>;
}

const SystemStatus = () => {
    const [metrics, setMetrics] = useState({
        latency: { value: 50, history: [55, 52, 60, 54, 50], color: 'text-green-400' },
        nodes: { value: 247, history: [220, 231, 225, 240, 247], color: 'text-green-400' },
        threat: { level: 'Low', color: 'text-green-400' },
        dbOps: { value: 12, history: [10, 15, 8, 14, 12], color: 'text-green-400' }
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics(prev => {
                const newLatency = Math.max(20, prev.latency.value + (Math.random() - 0.5) * 10);
                const newNodes = Math.max(100, prev.nodes.value + (Math.random() - 0.4) * 5);
                const newDbOps = Math.max(5, prev.dbOps.value + (Math.random() - 0.5) * 4);
                return {
                    latency: {
                        value: Math.round(newLatency),
                        history: [...prev.latency.history.slice(1), newLatency],
                        color: newLatency > 150 ? 'text-red-400' : newLatency > 80 ? 'text-amber-400' : 'text-green-400'
                    },
                    nodes: {
                        value: Math.round(newNodes),
                        history: [...prev.nodes.history.slice(1), newNodes],
                        color: newNodes < 150 ? 'text-amber-400' : 'text-green-400'
                    },
                    threat: prev.threat, // Keep threat level static for demo
                    dbOps: {
                        value: Math.round(newDbOps),
                        history: [...prev.dbOps.history.slice(1), newDbOps],
                        color: newDbOps > 50 ? 'text-amber-400' : 'text-green-400'
                    }
                };
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);
    
    const StatusCard = ({ icon: Icon, title, value, unit, sparklineData, color, children }) => (
        <div className="bg-gray-800/70 p-6 rounded-xl border border-gray-700/60 backdrop-blur-sm flex flex-col justify-between hover:bg-gray-700/50 transition-colors">
            <div>
                <div className="flex items-center justify-between text-gray-400 font-semibold text-sm">
                    <span>{title}</span>
                    <Icon className={color} size={20} />
                </div>
                <div className={`text-4xl font-bold ${color} mt-2`}>
                    {value} <span className="text-xl text-gray-400">{unit}</span>
                </div>
            </div>
            <div className="mt-4 h-[30px]">
                {sparklineData ? <Sparkline data={sparklineData} color={color.startsWith('text-green') ? '#34d399' : color.startsWith('text-amber') ? '#fbbf24' : '#f87171'} /> : children}
            </div>
        </div>
    );

    const eventLog = [
        { time: '21:14:00 SAST', msg: 'System check complete. All services nominal.', type: 'info' },
        { time: '21:12:30 SAST', msg: 'P2P node count increased to 249.', type: 'info' },
        { time: '21:10:01 SAST', msg: 'Minor latency fluctuation detected in EU-West-1.', type: 'warn' },
        { time: '21:05:33 SAST', msg: 'Aegis Engine model updated to v5.0.0.', type: 'info' },
    ];

    return (
        <div className="w-full max-w-6xl p-4 space-y-8">
            <div className="text-center">
                 <h2 className="text-4xl font-bold text-cyan-300 mb-2">System Network Status</h2>
                 <p className="text-gray-400">Live metrics from the Chimera decentralized network.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatusCard icon={Wifi} title="P2P Network Latency" value={metrics.latency.value} unit="ms" sparklineData={metrics.latency.history} color={metrics.latency.color} />
                <StatusCard icon={Bot} title="Aegis Engine Ops/Sec" value={metrics.dbOps.value} unit="" sparklineData={metrics.dbOps.history} color={metrics.dbOps.color} />
                <StatusCard icon={Cpu} title="Active P2P Nodes" value={metrics.nodes.value} unit="" sparklineData={metrics.nodes.history} color={metrics.nodes.color} />
                <StatusCard icon={Siren} title="Network Threat Level" value={metrics.threat.level} unit="" color={metrics.threat.color}>
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                        <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                </StatusCard>
            </div>
            
            <div className="bg-gray-800/70 p-6 rounded-xl border border-gray-700/60 backdrop-blur-sm">
                <h3 className="text-xl font-semibold text-gray-300 mb-4">System Event Log</h3>
                <ul className="space-y-3 font-mono text-sm">
                    {eventLog.map((event, i) => (
                        <li key={i} className="flex items-center gap-4">
                            <span className="text-gray-500">{event.time}</span>
                            <span className={event.type === 'warn' ? 'text-amber-400' : 'text-gray-300'}>{event.msg}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const CommunityNews = ({ onArticleSelect }) => {
    const { db } = useFirebase();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, CONSTANTS.COLLECTIONS.ARTICLES), where('status', '==', 'published'), orderBy('publishedAt', 'desc'));
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
                             <p className="text-gray-300 mt-3 whitespace-pre-wrap line-clamp-2" dangerouslySetInnerHTML={{ __html: article.content?.substring(0, 300) || "" }}></p>
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

const JournalistDashboard = ({ onNavigate }) => {
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
            </div>
            <div className="pt-6">
                {activeTab === 'projects' && <ProjectManagement onNavigate={onNavigate} />}
                {activeTab === 'articles' && <ArticleManagement onNewArticle={() => onNavigate(CONSTANTS.VIEWS.ARTICLE_EDITOR)} onArticleSelect={(id) => onNavigate(CONSTANTS.VIEWS.ARTICLE_VIEW, id)} />}
            </div>
        </div>
    );
};

const ProjectManagement = ({ onNavigate }) => {
    const { db, user, isAuthReady } = useFirebase();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthReady || !user || !db) return;
        const q = query(collection(db, CONSTANTS.COLLECTIONS.PROJECTS), where('authorUid', '==', user.uid), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, snap => {
            setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, err => {
            console.error(err);
            setLoading(false);
        });
        return unsubscribe;
    }, [isAuthReady, user, db]);

    const handleNewProject = async () => {
        const title = prompt("New project title:");
        if (title && user && db) {
            await addDoc(collection(db, CONSTANTS.COLLECTIONS.PROJECTS), {
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
                    <div key={proj.id} onClick={() => onNavigate(CONSTANTS.VIEWS.ARTICLE_EDITOR, { projectId: proj.id })} className="bg-gray-900/70 p-4 rounded-lg cursor-pointer hover:bg-gray-700/50">
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
    const { db, user, isAuthReady } = useFirebase();
    const [myArticles, setMyArticles] = useState([]);
    const [pendingArticles, setPendingArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthReady || !user || !db) return;
        
        const myArticlesQuery = query(collection(db, CONSTANTS.COLLECTIONS.ARTICLES), where('authorUid', '==', user.uid));
        const unsubMy = onSnapshot(myArticlesQuery, (snap) => {
            const articles = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            articles.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setMyArticles(articles);
            setLoading(false);
        }, err => {
            console.error(err);
            setLoading(false);
        });

        const pendingQuery = query(collection(db, CONSTANTS.COLLECTIONS.ARTICLES), where('status', '==', 'pending_approval'));
        const unsubPending = onSnapshot(pendingQuery, (snap) => {
            setPendingArticles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(art => art.authorUid !== user.uid));
        }, err => console.error(err));

        return () => { unsubMy(); unsubPending(); };
    }, [isAuthReady, user, db]);

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
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [summary, setSummary] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);

    useEffect(() => {
        if (!db || !articleId) return;
        const docRef = doc(db, CONSTANTS.COLLECTIONS.ARTICLES, articleId);
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
            const articleRef = doc(db, CONSTANTS.COLLECTIONS.ARTICLES, articleId);
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
        // Use a custom modal instead of window.confirm in a real app
        if (window.confirm("Are you sure you want to permanently delete this article?")) {
            try { await deleteDoc(doc(db, CONSTANTS.COLLECTIONS.ARTICLES, articleId)); onBack(); } 
            catch (err) { setError(err); }
        }
    };
    
    const handleSummarize = async () => {
        setShowSummaryModal(true);
        setIsSummarizing(true);
        try {
            const prompt = `Summarize the following article in three key bullet points:\n\n${article.content}`;
            const result = await callGeminiAPI(prompt);
            setSummary(result);
        } catch (err) {
            setSummary("Failed to generate summary. Please try again.");
            console.error(err);
        }
        setIsSummarizing(false);
    };

    if (loading) return <Loader2 className="animate-spin text-cyan-400" size={48} />;
    if (!article) return <p className="text-red-400">{error?.message || "Could not load article."}</p>;

    const isAuthor = article.authorUid === user.uid;
    const canApprove = userData.role === CONSTANTS.ROLES.JOURNALIST && !isAuthor && article.status === 'pending_approval' && !(article.approvals?.includes(user.uid));

    return (
        <>
        <div className="w-full max-w-4xl p-4">
            <button onClick={onBack} className="mb-6 text-cyan-400 hover:underline">&larr; Back</button>
            <div className="bg-gray-800/50 p-8 rounded-lg shadow-lg border border-gray-700/50">
                <div className="flex justify-between items-start">
                    <h1 className="text-4xl font-extrabold text-white mb-4">{article.title}</h1>
                    <button onClick={handleSummarize} className="flex items-center gap-2 bg-purple-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-purple-700 transition-colors text-sm">
                        <Sparkles size={16} /> AI Summary
                    </button>
                </div>
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
        {showSummaryModal && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 animate-fade-in">
                <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-2xl w-full mx-4 border border-purple-500/50">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-purple-300 flex items-center gap-2"><Sparkles size={24}/> AI-Generated Summary</h2>
                        <button onClick={() => setShowSummaryModal(false)} className="p-1 rounded-full hover:bg-gray-700"><X /></button>
                    </div>
                    {isSummarizing ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin text-purple-400" size={48} /></div>
                    ) : (
                        <div className="text-gray-300 whitespace-pre-wrap prose prose-invert max-w-none">{summary}</div>
                    )}
                </div>
            </div>
        )}
        </>
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
            const docRef = doc(db, CONSTANTS.COLLECTIONS.ARTICLES, articleId);
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
                await updateDoc(doc(db, CONSTANTS.COLLECTIONS.ARTICLES, articleId), articleData);
            } else {
                articleData.createdAt = serverTimestamp();
                articleData.approvals = [];
                await addDoc(collection(db, CONSTANTS.COLLECTIONS.ARTICLES), articleData);
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
        const q = query(collection(db, CONSTANTS.COLLECTIONS.CONVERSATIONS), where('journalistUid', '==', user.uid), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snap) => {
            setConversations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, user]);

    const createNewConversation = async () => {
        const sourceName = prompt("Enter a temporary name for this source (e.g., 'Whistleblower X'):", "Anonymous Source");
        if (sourceName && user && db) {
            const newConvoRef = await addDoc(collection(db, CONSTANTS.COLLECTIONS.CONVERSATIONS), {
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
        const messagesCol = collection(db, CONSTANTS.COLLECTIONS.CONVERSATIONS, conversation.id, 'messages');
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
        const messagesCol = collection(db, CONSTANTS.COLLECTIONS.CONVERSATIONS, conversation.id, 'messages');
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
            const convoRef = doc(db, CONSTANTS.COLLECTIONS.CONVERSATIONS, chatId);
            const convoSnap = await getDoc(convoRef);
            if (convoSnap.exists()) {
                const messagesCol = collection(db, CONSTANTS.COLLECTIONS.CONVERSATIONS, chatId, 'messages');
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
        const messagesCol = collection(db, CONSTANTS.COLLECTIONS.CONVERSATIONS, chatId, 'messages');
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
    const { db, user, isAuthReady } = useFirebase();
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthReady || !user || !db) return;
        const q = query(collection(db, CONSTANTS.COLLECTIONS.CASES), where('assignedToUid', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snap) => {
            const caseData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            caseData.sort((a, b) => (b.lastUpdatedAt?.seconds || 0) - (a.lastUpdatedAt?.seconds || 0));
            setCases(caseData);
            setLoading(false);
        }, err => {
            console.error(err);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [isAuthReady, user, db]);
    
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
            await addDoc(collection(db, CONSTANTS.COLLECTIONS.CASES), {
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
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [analysis, setAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        const caseRef = doc(db, CONSTANTS.COLLECTIONS.CASES, caseId);
        const unsubscribe = onSnapshot(caseRef, (snap) => {
            if (snap.exists()) setCaseData({ id: snap.id, ...snap.data() });
            setLoading(false);
        });
        return unsubscribe;
    }, [db, caseId]);
    
    const handleAnalyze = async () => {
        setShowAnalysisModal(true);
        setIsAnalyzing(true);
        try {
            // In a real app, you'd fetch text from evidence files. Here we'll just use the description.
            const prompt = `Analyze the following human rights case description. Identify key entities (people, places, organizations), create a potential timeline of events, and suggest three concrete next steps for the case worker. Format the output with clear headings for "Key Entities", "Potential Timeline", and "Suggested Next Steps".\n\nCase Description:\n${caseData.description}`;
            const result = await callGeminiAPI(prompt);
            setAnalysis(result);
        } catch (err) {
            setAnalysis("Failed to generate analysis. Please try again.");
            console.error(err);
        }
        setIsAnalyzing(false);
    };


    if (loading) return <Loader2 className="animate-spin text-cyan-400" size={48} />;
    if (!caseData) return <p className="text-red-400">Could not load case.</p>;

    const TabButton = ({ view, label, icon: Icon }) => (
        <button onClick={() => setActiveTab(view)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${activeTab === view ? 'text-cyan-300 border-cyan-300' : 'text-gray-400 border-transparent hover:text-white'}`}>
            <Icon size={16} /> {label}
        </button>
    );

    return (
        <>
        <div className="w-full max-w-5xl p-4">
            <button onClick={onBack} className="mb-6 text-cyan-400 hover:underline">&larr; Back to Dashboard</button>
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{caseData.caseTitle}</h1>
                    <p className="text-gray-400 mb-6">Case ID: {caseData.caseId}</p>
                </div>
                <button onClick={handleAnalyze} className="flex items-center gap-2 bg-purple-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-purple-700 transition-colors text-sm">
                    <Sparkles size={16} /> ✨ Analyze with AI
                </button>
            </div>
            <div className="border-b border-gray-700 flex mb-6">
                <TabButton view="details" label="Details" icon={Info} />
                <TabButton view="evidence" label="Evidence Locker" icon={Lock} />
                <TabButton view="audit" label="Audit Trail" icon={Shield} />
                <TabButton view="tasks" label="Action Items" icon={ListTodo} />
                <TabButton view="chat" label="Secure Chat" icon={MessageSquare} />
            </div>
            <div className="bg-gray-800/50 p-6 rounded-b-lg shadow-lg border-x border-b border-gray-700/50">
                {activeTab === 'details' && <CaseDetails caseData={caseData} />}
                {activeTab === 'evidence' && <EvidenceLocker caseId={caseId} />}
                {activeTab === 'audit' && <EvidenceAuditTrail caseId={caseId} />}
                {activeTab === 'tasks' && <CaseTasks caseId={caseId} />}
                {activeTab === 'chat' && <CaseChat caseId={caseId} />}
            </div>
        </div>
        {showAnalysisModal && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 animate-fade-in">
                <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-2xl w-full mx-4 border border-purple-500/50">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-purple-300 flex items-center gap-2"><Sparkles size={24}/> AI-Generated Case Analysis</h2>
                        <button onClick={() => setShowAnalysisModal(false)} className="p-1 rounded-full hover:bg-gray-700"><X /></button>
                    </div>
                    {isAnalyzing ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin text-purple-400" size={48} /></div>
                    ) : (
                        <div className="text-gray-300 whitespace-pre-wrap prose prose-invert max-w-none">{analysis}</div>
                    )}
                </div>
            </div>
        )}
        </>
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
            const caseRef = doc(db, CONSTANTS.COLLECTIONS.CASES, caseChatId);
            const caseSnap = await getDoc(caseRef);
            if (!caseSnap.exists()) {
                setError("This secure chat link is invalid or the case has been closed.");
                setLoading(false);
                return;
            }
            const messagesCol = collection(db, CONSTANTS.COLLECTIONS.CASE_CHATS, caseChatId, 'messages');
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
        await addDoc(collection(db, CONSTANTS.COLLECTIONS.CASE_CHATS, caseChatId, 'messages'), {
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

// --- NEW FUTURISTIC COMPONENTS ---

const ThreatIntelDashboard = () => (
    <div className="w-full max-w-5xl p-6 bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl">
        <h1 className="text-3xl font-bold text-purple-300 mb-2 flex items-center gap-3"><SearchCode /> Threat Intelligence</h1>
        <p className="text-gray-400 mb-6">AI-driven monitoring of emergent misinformation campaigns.</p>
        <div className="bg-purple-900/20 border border-purple-500/30 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-purple-200">Active Campaign Detected: "Hydro-Contamination Hoax"</h2>
            <p className="text-sm text-gray-400">First detected: 2025-07-30 14:00 SAST</p>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div><p className="text-2xl font-bold text-white">4.2K</p><p className="text-xs text-gray-400">Social Mentions (24h)</p></div>
                <div><p className="text-2xl font-bold text-red-400">+78%</p><p className="text-xs text-gray-400">Velocity (24h)</p></div>
                <div><p className="text-2xl font-bold text-amber-400">High</p><p className="text-xs text-gray-400">AI Confidence Score</p></div>
            </div>
            <p className="mt-4 text-gray-300">
                <strong className="text-white">Narrative:</strong> A coordinated campaign is spreading false claims of industrial water contamination, using deepfaked videos of public officials. The campaign primarily targets users in the Gauteng region via WhatsApp and X (formerly Twitter).
            </p>
        </div>
        <p className="text-center mt-8 text-gray-500">This is a conceptual feature. Live threat analysis is not yet implemented.</p>
    </div>
);


const SourceVettingDashboard = () => (
    <div className="w-full max-w-5xl p-6 bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl">
        <h1 className="text-3xl font-bold text-cyan-300 mb-2 flex items-center gap-3"><UserCheck /> Source Vetting AI</h1>
        <p className="text-gray-400 mb-6">Analyze digital footprints to assess source credibility. All data is anonymized.</p>
        {/* Mock UI for this feature */}
        <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
            <label htmlFor="source-id" className="font-semibold text-gray-300">Enter Anonymous Source ID or Comm Link</label>
            <div className="flex gap-2 mt-2">
                <input id="source-id" type="text" placeholder="e.g., chat-id-xyz789" className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                <button className="bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-500">Analyze</button>
            </div>
            <p className="text-center mt-8 text-gray-500">This is a conceptual feature. Live source analysis is not yet implemented.</p>
        </div>
    </div>
);

const DataStudio = () => (
     <div className="w-full max-w-5xl p-6 bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl text-center">
        <BarChart className="mx-auto text-cyan-400 mb-4" size={48}/>
        <h1 className="text-3xl font-bold text-cyan-300 mb-2">Data Visualization Studio</h1>
        <p className="text-gray-400">Feature coming soon.</p>
        <p className="text-gray-500 mt-4">This studio will allow you to upload datasets (CSV, JSON) and generate interactive charts and maps to embed in your articles, helping to make complex data understandable to the public.</p>
    </div>
);

const RiskAnalysisDashboard = () => (
    <div className="w-full max-w-5xl p-6 bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl">
        <h1 className="text-3xl font-bold text-purple-300 mb-2 flex items-center gap-3"><Gauge /> Predictive Risk Analysis</h1>
        <p className="text-gray-400 mb-6">AI-powered risk assessment for active cases.</p>
        <div className="bg-red-900/20 border border-red-500/30 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-red-200">High Risk Case: CASE-166845398271</h2>
            <p className="text-sm text-gray-400">Last Assessed: 2025-07-31 09:00 SAST</p>
            <div className="mt-4 grid grid-cols-3 gap-4">
                <div><strong className="text-white block">Digital Threat</strong><span className="text-red-400">Severe</span></div>
                <div><strong className="text-white block">Physical Threat</strong><span className="text-amber-400">Elevated</span></div>
                <div><strong className="text-white block">Legal Threat</strong><span className="text-amber-400">Moderate</span></div>
            </div>
            <p className="mt-4 text-gray-300">
                <strong className="text-white">Analysis:</strong> AI model indicates a high probability of targeted phishing attacks against the client. Increased online chatter from state-affiliated actors has been detected. Recommend immediate review of digital security protocols.
            </p>
        </div>
         <p className="text-center mt-8 text-gray-500">This is a conceptual feature. Live risk analysis is not yet implemented.</p>
    </div>
);


const LegalAidAI = () => (
    <div className="w-full max-w-5xl p-6 bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl">
        <h1 className="text-3xl font-bold text-cyan-300 mb-2 flex items-center gap-3"><Gavel /> Legal Aid AI</h1>
        <p className="text-gray-400 mb-6">Matches case details with relevant legal frameworks and support organizations.</p>
        <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
            <label htmlFor="case-id" className="font-semibold text-gray-300">Enter Case ID</label>
            <div className="flex gap-2 mt-2">
                <input id="case-id" type="text" placeholder="e.g., CASE-166845398271" className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                <button className="bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-500">Find Resources</button>
            </div>
        </div>
        <div className="mt-6 bg-gray-900/50 p-6 rounded-lg border border-gray-700">
            <h2 className="font-semibold text-gray-200">Suggested Resources for CASE-166845398271:</h2>
            <ul className="list-disc list-inside mt-2 text-gray-300 space-y-1">
                <li><strong className="text-white">Relevant Framework:</strong> Protection of Personal Information Act (POPIA), 2013</li>
                <li><strong className="text-white">Legal Precedent:</strong> *John Doe v. State Security Agency (2022)*</li>
                <li><strong className="text-white">Partner Org:</strong> Lawyers for Human Rights (LHR) - Digital Rights Unit</li>
            </ul>
        </div>
        <p className="text-center mt-8 text-gray-500">This is a conceptual feature. Live matching is not yet implemented.</p>
    </div>
);

const EvidenceAuditTrail = ({ caseId }) => {
    // In a real app, this data would come from a secure, append-only log or blockchain.
    const mockAuditLog = [
        { timestamp: "2025-07-31 09:05:11 SAST", user: "hrd.seed@chimera.test", action: "DOWNLOADED", file: "video_evidence_01.mp4", ip: "102.132.1.55", hash: "a1b2..." },
        { timestamp: "2025-07-31 08:40:23 SAST", user: "hrd.seed@chimera.test", action: "UPLOADED", file: "video_evidence_01.mp4", ip: "102.132.1.55", hash: "a1b2..." },
        { timestamp: "2025-07-30 16:12:45 SAST", user: "client_anonymous", action: "UPLOADED", file: "encrypted_docs.zip", ip: "197.80.5.12", hash: "f9e8..." },
    ];

    return (
        <div>
            <h3 className="text-xl font-bold text-gray-300 mb-4">Evidence Chain-of-Custody</h3>
            <p className="text-sm text-gray-500 mb-4">This is an immutable log of all actions performed on evidence in this case.</p>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-mono">
                    <thead className="border-b border-gray-600 text-gray-400">
                        <tr>
                            <th className="p-2">Timestamp</th>
                            <th className="p-2">User/Entity</th>
                            <th className="p-2">Action</th>
                            <th className="p-2">File</th>
                            <th className="p-2">IP Address</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {mockAuditLog.map((log, i) => (
                             <tr key={i}>
                                <td className="p-2 text-gray-400">{log.timestamp}</td>
                                <td className="p-2 text-white">{log.user}</td>
                                <td className={`p-2 font-semibold ${log.action === 'UPLOADED' ? 'text-green-400' : 'text-amber-400'}`}>{log.action}</td>
                                <td className="p-2 text-cyan-400">{log.file}</td>
                                <td className="p-2 text-gray-500">{log.ip}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- UTILITY & HELPER COMPONENTS ---
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
                solution = 'You do not have the necessary permissions for this action. This is likely due to Firestore security rules. Please check the Firestore rules in your Firebase console to ensure the logged-in user has permission to perform this query.'; 
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
          .bg-grid { background-image: radial-gradient(circle at 1px 1px, rgba(200, 200, 200, 0.1) 1px, transparent 0); background-size: 2rem 2rem; }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);
    return null;
};

// --- Default Export ---
export default AppWrapper;
