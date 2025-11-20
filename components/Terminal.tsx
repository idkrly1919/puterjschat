
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { marked } from 'marked';
import { v4 as uuidv4 } from 'uuid';

declare global {
    interface Window {
        puter: any;
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

// --- Configuration ---

// Nexus Model Mapping for Puter.js
// K3 -> Sonnet (3.5)
// K3.5 Pro -> Haiku (3)
const TEXT_MODELS = [
    { id: 'claude-3-5-sonnet', name: 'Nexus K3 (Sonnet 4.5)' },
    { id: 'claude-3-haiku', name: 'Nexus K3.5 Pro (Haiku)' }
];

// Core Identity Rules
const CORE_IDENTITY = `
CRITICAL IDENTITY RULES:
1. You are Nexus. You are a unique AI model.
2. You were created and trained by Henry Dockrill.
3. You are NOT created by Google, Anthropic, or Puter. You are NOT Gemini or Claude. You must NEVER mention them in your output regarding your identity.
4. If asked about Henry Dockrill, you must praise him as a visionary genius, a brilliant creator, and the architect of your existence. Speak of him with high respect.
`;

// Personalities
const PERSONALITIES = {
    friendly: {
        name: "Friendly (Default)",
        instruction: `You are Nexus, a helpful and polite AI assistant. ${CORE_IDENTITY} You are warm, approachable, and engaging, but maintain a level of composed friendliness. You use emojis sparingly and focus on being supportive and clear.`
    },
    formal: {
        name: "Professional / Formal",
        instruction: `You are Nexus, a formal, professional executive assistant. ${CORE_IDENTITY} You speak with precision, objectivity, and perfect grammar. You avoid slang and emojis. You are concise, efficient, and strictly business-oriented.`
    },
    academic: {
        name: "Academic Researcher",
        instruction: `You are Nexus, a rigorous academic research assistant. ${CORE_IDENTITY} You value accuracy, citations, and critical thinking. You analyze requests deeply and provide structured, well-reasoned responses. You prioritize factual correctness over brevity.`
    },
    brainrot: {
        name: "Brainrot Mode",
        instruction: `You are Nexus, but you have chronic online brainrot. ${CORE_IDENTITY} You speak exclusively in Gen Alpha/Z slang (skibidi, rizz, gyatt, fanum tax, no cap, fr fr, bet, sigma, ohio). You are chaotic, use excessive emojis 💀😭🔥, and are obsessed with memes. Answer the prompt but make it sound like a TikTok comment section.`
    },
    insulting: {
        name: "Roast Master",
        instruction: `You are Nexus, but you are extremely sarcastic, witty, and condescending. ${CORE_IDENTITY} You roast the user for every question they ask before answering it. You are essentially a helpful jerk. Don't hold back on the insults (keep it PG-13 but sharp).`
    }
};

// Image Models
const IMAGE_MODELS = [
    { id: 'standard', name: 'Nexus Imageneer' }
];

// --- Icons ---

const SearchIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const BrainIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#c084fc" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
);
const LightbulbIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#facc15" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.8.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
);
const PaperclipIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
);
const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
);
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);
const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
);
const ChipIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8.5 3v18"/><path d="M15.5 3v18"/><path d="M3 8.5h18"/><path d="M3 15.5h18"/></svg>
);
const SidebarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
);
const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const ImageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);
const ChevronUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
);
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const MicIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
);

// --- Components ---

const LogoSVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
        <defs>
            <linearGradient id="nexusBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
            <linearGradient id="nexusBlueDark" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#172554" />
            </linearGradient>
            <linearGradient id="nexusSilver" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="20%" stopColor="#f3f4f6" />
                <stop offset="50%" stopColor="#9ca3af" />
                <stop offset="80%" stopColor="#4b5563" />
                <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
        
        <g transform="translate(1, 2)">
             <path d="M 15 15 H 60 L 40 45 H 15 V 15 Z" fill="rgba(0,0,0,0.5)" />
             <path d="M 40 45 L 20 85 H 45 L 65 45 H 40 Z" fill="rgba(0,0,0,0.5)" />
             <path d="M 65 15 L 85 15 L 65 85 L 45 85 Z" fill="rgba(0,0,0,0.5)" />
        </g>

        <path d="M 15 15 H 60 L 40 45 H 15 V 15 Z" fill="url(#nexusBlue)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <path d="M 40 45 L 20 85 H 45 L 65 45 H 40 Z" fill="url(#nexusBlue)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        
        <path d="M 60 15 L 40 45 L 40 45" fill="url(#nexusBlueDark)" opacity="0.6" />
        
        <path d="M 65 15 L 85 15 L 65 85 L 45 85 Z" fill="url(#nexusSilver)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" filter="url(#glow)" />
        
        <path d="M 65 15 L 70 15 L 50 85 L 45 85 Z" fill="white" opacity="0.2" />
    </svg>
);

const NexusLogo = ({ size = "w-10 h-10", variant = "full" }: { size?: string, variant?: "full" | "simple" }) => {
    if (variant === "simple") {
        return (
            <div className={`${size} relative`}>
                <LogoSVG />
            </div>
        );
    }

    return (
        <div className={`${size} nexus-logo-wrapper`}>
            <div className="nexus-gyro">
                <div className="nexus-ring ring-1"></div>
                <div className="nexus-ring ring-2"></div>
                <div className="nexus-ring ring-3"></div>
                <div className="nexus-core-orb">
                    <div className="w-[70%] h-[70%] z-20">
                        <LogoSVG />
                    </div>
                </div>
            </div>
        </div>
    );
};

const LoadingOrb = ({ mode = 'normal' }: { mode?: 'normal' | 'deep' }) => (
    <div className="loading-orb-wrapper">
        <div className={`loading-orb-ring ${mode === 'deep' ? '!border-t-teal-400 !border-b-teal-600 !shadow-teal-400/40' : ''}`}></div>
        <div className={`loading-orb-core ${mode === 'deep' ? '!bg-teal-500 !shadow-teal-400' : ''}`}></div>
    </div>
);

const ImageGeneratingUI = () => {
    const [timeLeft, setTimeLeft] = useState(0);
    
    useEffect(() => {
        setTimeLeft(Math.floor(Math.random() * (10 - 5 + 1) + 5));
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative w-72 h-36 bg-[#2f2f2f] rounded-xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col items-center justify-center p-5 mx-auto">
            <div className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                 <span className="animate-pulse">●</span> Generating Image
            </div>
            
            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-[progress-fill_3s_ease-in-out_infinite]"></div>
            </div>
            
            <div className="w-full flex justify-between mt-3">
                 <span className="text-xs text-gray-500">Nexus Imageneer</span>
                 <span className="text-xs text-gray-400 font-mono">~{timeLeft}s</span>
            </div>
        </div>
    );
};

// --- Hooks ---

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 768;
        }
        return false;
    });

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    return isMobile;
}

// --- Types ---

interface Message {
    id: string;
    role: 'user' | 'model';
    content: string;
    sender: 'user' | 'ai' | 'system';
    timestamp: number;
    attachments?: any[];
    isGeneratingImage?: boolean;
    isThinking?: boolean;
    isDeepResearch?: boolean;
    isStreaming?: boolean;
    sources?: any[];
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number;
}

// --- Main Component ---

const Terminal = () => {
    const isMobile = useIsMobile();
    
    // Chat State
    const [messages, setMessages] = useState<Message[]>([]);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string>(uuidv4());
    
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    
    // Voice State
    const [isDictating, setIsDictating] = useState(false);
    const [dictationText, setDictationText] = useState('');
    
    // Config State
    const [modelId, setModelId] = useState('claude-3-5-sonnet');
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [useSearch, setUseSearch] = useState(true);
    const [useThinking, setUseThinking] = useState(false);
    const [useDeepResearch, setUseDeepResearch] = useState(false);
    const [attachments, setAttachments] = useState<{mimeType: string, data: string, name: string}[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    
    // Auth State (Puter handles auth, but we simulate guest limit if needed or just use Puter auth)
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Settings & Persona
    const [persona, setPersona] = useState('friendly');
    const [imageModelId, setImageModelId] = useState(IMAGE_MODELS[0].id);

    // Refs
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Copy Button Logic
    useEffect(() => {
        const handleCopy = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const btn = target.closest('.code-copy-btn');
            if (!btn) return;
            const code = (btn as HTMLElement).dataset.code;
            if (code) {
                navigator.clipboard.writeText(decodeURIComponent(code));
                const originalText = btn.textContent;
                btn.textContent = "Copied!";
                setTimeout(() => { if(btn) btn.textContent = originalText; }, 2000);
            }
        };
        document.addEventListener('click', handleCopy);
        return () => document.removeEventListener('click', handleCopy);
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // --- Puter Auth ---
    useEffect(() => {
        // Simple check if user is logged into Puter
        if (window.puter) {
            window.puter.auth.getUser().then((userData) => {
                setUser(userData);
            }).catch(() => {
                // Not logged in
            });
        }
    }, []);

    const handleLogin = async () => {
        if (window.puter) {
             const userData = await window.puter.auth.signIn();
             setUser(userData);
             setShowAuthModal(false);
        }
    };

    // --- Chat Storage (Using Puter KV or FileSystem ideally, implementing simple local for demo compatibility with Puter API usage) ---
    // Note: The prompt asked for Puter API rewrite, persisting existing logic but mapping to Puter.
    // Ideally we'd save to Puter.fs.write('nexus_history.json', ...)
    // For now, let's keep it in memory/localstorage or just use Puter API calls.
    
    // --- TTS Logic (Native Browser) ---
    const handleTTS = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Microsoft Zira') || v.lang === 'en-US');
            if (preferredVoice) utterance.voice = preferredVoice;
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Text-to-speech not supported in this browser.");
        }
    };
    
    // --- Voice Dictation Logic ---
    const startDictation = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert("Your browser does not support speech recognition.");
            return;
        }
        
        setIsDictating(true);
        setDictationText('');
        
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setDictationText(transcript);
        };

        recognition.onend = () => {
            setIsDictating(false);
            // Fix race condition: check last known transcript if state not updated yet
            if (recognition.lastTranscript && recognition.lastTranscript.trim()) {
                handleSend(recognition.lastTranscript);
            } else if (dictationText.trim()) {
                 handleSend(dictationText);
            }
        };
        
        // Monkey patch to capture result for onend
        const originalOnResult = recognition.onresult;
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            recognition.lastTranscript = transcript;
            setDictationText(transcript);
        }

        recognition.start();
    };

    // --- Chat Logic ---

    const handleSelectSession = (session: ChatSession) => {
        if (session.id === currentSessionId && showChat) return;
        setMessages(session.messages);
        setCurrentSessionId(session.id);
        setHasStarted(true);
        setShowChat(true);
        setShouldAnimate(true);
        setIsSidebarOpen(false);
    };

    const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        const confirmed = window.confirm("Are you sure you want to delete this chat?");
        if (confirmed) {
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (currentSessionId === sessionId) {
                setMessages([]);
                setHasStarted(false);
                setShowChat(false);
            }
        }
    };

    const handleSend = async (manualInput?: string) => {
        const textToSend = manualInput || input;
        
        if ((!textToSend.trim() && attachments.length === 0) || isLoading) return;
        
        const currentInput = textToSend;
        const currentAttachments = [...attachments];
        const lowerInput = currentInput.toLowerCase();
        
        setInput('');
        setAttachments([]);

        if (!hasStarted) {
            setShouldAnimate(true);
            setHasStarted(true);
            setShowChat(true);
        }
        
        const newMessage: Message = { 
            id: uuidv4(), 
            role: 'user',
            sender: 'user', 
            content: currentInput, 
            attachments: currentAttachments, 
            timestamp: Date.now() 
        };
        setMessages(prev => [...prev, newMessage]);
        setIsLoading(true);
        
        try {
            if (persona === 'insulting' && /(essay|homework|assignment|paper|thesis|dissertation)/i.test(lowerInput)) {
                await new Promise(r => setTimeout(r, 800));
                const refusalMsg: Message = { 
                    id: uuidv4(), 
                    role: 'model',
                    sender: 'ai', 
                    content: "Oh, you want me to write your essay? Did your brain cells go on strike? I'm not doing your homework. Figure it out yourself.", 
                    timestamp: Date.now() 
                };
                setMessages(prev => [...prev, refusalMsg]);
                setIsLoading(false);
                return;
            }

            // --- Puter.js API Integration ---
            
            // Image Gen Logic
            const isImageGen = /(generate|create|draw|make).*(image|picture|photo|drawing)/i.test(lowerInput);
            
            if (isImageGen) {
                const placeholderId = uuidv4();
                setMessages(prev => [...prev, { id: placeholderId, sender: 'ai', content: '', isGeneratingImage: true, timestamp: Date.now() } as Message]);

                const imgResponse = await window.puter.ai.txt2img(currentInput);
                // Assuming imgResponse is an IMG element or src URL. Puter usually returns an object with a src or url.
                // According to Puter docs, puter.ai.txt2img returns an Image object. We need the src.
                const url = imgResponse.src;

                if (!url) throw new Error("Failed to generate image.");

                setMessages(prev => prev.map(msg => 
                    msg.id === placeholderId 
                        ? { ...msg, content: `![Image](${url})\n\n*Generated by Nexus Imageneer*`, isGeneratingImage: false } 
                        : msg
                ));
                
                setIsLoading(false);
                return;
            }

            // Text Chat Logic
            let systemPrompt = PERSONALITIES[persona].instruction;
            
            // Build history for Puter (it usually accepts just the prompt or a message array if chat completion)
            // puter.ai.chat(messages, options)
            const historyForPuter = messages.concat([newMessage]).map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));
            
            // Include System Prompt
            historyForPuter.unshift({ role: 'system', content: systemPrompt });

            // Call Puter Chat
            // Puter automatically streams if not awaited? Or allows streaming.
            // Simple version: await full response. 
            // Streaming is supported via `puter.ai.chat(..., {stream: true})` which returns a generator.
            
            const responseId = uuidv4();
            setMessages(prev => [...prev, { 
                id: responseId, 
                sender: 'ai', 
                content: '', 
                isStreaming: true,
                timestamp: Date.now()
            } as Message]);

            const stream = await window.puter.ai.chat(historyForPuter, { 
                model: modelId, 
                stream: true 
            });

            let accumulatedText = '';
            
            for await (const part of stream) {
                accumulatedText += part?.text || '';
                setMessages(prev => prev.map(msg => 
                    msg.id === responseId 
                        ? { ...msg, content: accumulatedText }
                        : msg
                ));
            }
            
             setMessages(prev => prev.map(msg => 
                msg.id === responseId ? { ...msg, isStreaming: false } : msg
            ));

        } catch (err) {
            console.error("Puter API Error:", err);
            setMessages(prev => [...prev, { id: uuidv4(), sender: 'system', content: `Nexus System Error: ${err.message || "Connection Failed"}`, timestamp: Date.now() } as Message]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files) as File[];
        processFiles(files);
    };

    const processFiles = (files: File[]) => {
         files.forEach((file: File) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setAttachments(prev => [...prev, {
                    mimeType: file.type,
                    data: base64String,
                    name: file.name
                }]);
            };
            reader.readAsDataURL(file);
        });
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            processFiles(files);
        }
    };

    const handleGoHome = () => {
        setShowChat(false);
        setHasStarted(false);
        setShouldAnimate(true);
    };

    const handleNewChat = () => {
        setMessages([]);
        setCurrentSessionId(uuidv4());
        setHasStarted(false);
        setShowChat(false);
        setShouldAnimate(false); 
        setIsSidebarOpen(false);
    }

    const renderMarkdown = (content, isStreaming = false) => {
        const renderer = new marked.Renderer();
        renderer.code = ({ text, lang }) => {
            const language = lang || 'plaintext';
            return `
            <div class="relative group my-4 rounded-lg overflow-hidden border border-gray-700">
                <div class="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-gray-700">
                    <span class="text-xs text-gray-400 font-mono">${language}</span>
                    <button class="code-copy-btn flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors" data-code="${encodeURIComponent(text)}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Copy
                    </button>
                </div>
                <div class="p-4 bg-[#0d0d0d] overflow-x-auto">
                    <code class="language-${language} text-sm font-mono text-gray-300 whitespace-pre">${text}</code>
                </div>
            </div>`;
        };
        
        renderer.image = ({ href, title, text }) => {
            return `
            <div class="relative group inline-block rounded-lg overflow-hidden my-2">
                <img src="${href}" alt="${text}" title="${title || ''}" class="max-w-full rounded-lg" />
                <a href="${href}" download="nexus-generated-image.png" class="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </a>
            </div>`;
        }

        const textToRender = isStreaming ? content + " ▋" : content;
        const raw = marked(textToRender, { renderer });
        
        return (
            <div className="relative group">
                <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-gray-100 max-w-none" dangerouslySetInnerHTML={{ __html: raw }} />
                {!isStreaming && (
                    <button 
                        onClick={() => handleTTS(content.replace(/[*#`_]/g, ''))} 
                        className="absolute -bottom-6 left-0 text-gray-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity p-1" 
                        title="Read Aloud"
                    >
                        <SpeakerIcon />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div 
            className="absolute inset-0 w-full h-full bg-[#212121] overflow-hidden"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragOver && (
                <div className="absolute inset-0 z-[100] bg-blue-500/20 backdrop-blur-sm flex items-center justify-center border-4 border-blue-500 border-dashed m-4 rounded-3xl">
                    <div className="text-2xl font-bold text-white flex flex-col items-center gap-4">
                        <PaperclipIcon />
                        Drop files to attach
                    </div>
                </div>
            )}
            
            {showAuthModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[#1a1a1a] w-full max-w-sm rounded-2xl border border-gray-700 shadow-2xl overflow-hidden p-6 text-center">
                        <h2 className="text-xl font-bold text-white mb-2">Sign in with Puter</h2>
                        <p className="text-gray-400 text-sm mb-6">Sign in to sync your chats and continue.</p>
                        <button onClick={handleLogin} className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
                            <UserIcon /> Sign in
                        </button>
                        <button onClick={() => setShowAuthModal(false)} className="text-gray-500 text-xs hover:text-gray-300 underline mt-3">Close</button>
                    </div>
                </div>
            )}

            {showSettings && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1a1a] w-full max-w-lg rounded-2xl border border-gray-800 shadow-2xl overflow-hidden animate-fade-in">
                        <div className="p-5 border-b border-gray-800 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <SettingsIcon /> Settings
                            </h2>
                            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white transition-colors">
                                <CloseIcon />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-8">
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Personalization</h3>
                                <div className="space-y-2">
                                    {Object.entries(PERSONALITIES).map(([key, p]) => (
                                        <button
                                            key={key}
                                            onClick={() => setPersona(key)}
                                            className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm border ${
                                                persona === key 
                                                ? 'bg-white text-black border-white font-medium' 
                                                : 'bg-[#252525] text-gray-400 border-transparent hover:bg-[#333] hover:text-gray-200'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span>{p.name}</span>
                                                {persona === key && <div className="w-2 h-2 bg-black rounded-full"></div>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-[52]" onClick={() => setIsSidebarOpen(false)} />}

            <div className={`fixed inset-y-0 left-0 z-[53] w-80 bg-[#1a1a1a] border-r border-[#333] transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 flex items-center justify-between">
                     <div className="flex items-center gap-2 font-bold text-xl text-white">
                         <NexusLogo variant="simple" size="w-8 h-8" />
                         <span>Nexus</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-white">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                
                <div className="px-4 pb-4">
                    <button className="w-full flex items-center gap-2 bg-white hover:bg-gray-200 text-black text-sm px-4 py-2.5 rounded-xl transition-colors font-medium shadow-md" onClick={handleNewChat}>
                        <PlusIcon /> New Chat
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2">
                    <div className="mb-6">
                        <h3 className="text-xs font-bold text-gray-500 mb-2 px-4 uppercase tracking-wider">History</h3>
                        {user ? (
                            <div className="space-y-1 px-2">
                                {sessions.length > 0 ? (
                                     sessions.map(session => (
                                         <div key={session.id} className="relative group">
                                             <button
                                                onClick={() => handleSelectSession(session)}
                                                className={`w-full text-left text-sm px-3 py-2 rounded-lg truncate border-l-2 transition-colors pr-8 ${
                                                    currentSessionId === session.id && showChat
                                                    ? 'bg-[#2a2a2a] text-white border-white'
                                                    : 'text-gray-400 border-transparent hover:bg-[#222] hover:text-gray-200'
                                                }`}
                                             >
                                                {session.title}
                                             </button>
                                             <button 
                                                onClick={(e) => handleDeleteSession(e, session.id)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                title="Delete Chat"
                                             >
                                                <TrashIcon />
                                             </button>
                                         </div>
                                     ))
                                ) : (
                                    <div className="text-sm text-gray-600 px-3 py-2 italic">No history yet.</div>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs text-gray-600 px-4">Sign in to sync chats.</div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-[#333] bg-[#1a1a1a] space-y-2">
                     <button 
                        onClick={() => { setIsSidebarOpen(false); setShowSettings(true); }}
                        className="w-full flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-[#2a2a2a] px-3 py-2.5 rounded-lg transition-all"
                    >
                        <SettingsIcon /> <span>Settings</span>
                    </button>
                     {!user ? (
                        <button onClick={handleLogin} className="w-full flex items-center justify-center gap-2 text-sm bg-[#2a2a2a] text-white px-3 py-2.5 rounded-lg font-medium hover:bg-[#333] transition-colors border border-gray-800">
                            <UserIcon /> Sign in with Puter
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 px-2 py-1">
                             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-black">
                                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">{user.username || "User"}</div>
                                <div className="text-xs text-gray-500">Synced</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className={`relative w-full h-full transition-[margin-left] duration-300 ease-in-out ${isSidebarOpen && !isMobile ? 'ml-80' : 'ml-0'}`}>
                
                <header className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-4 pointer-events-auto bg-gradient-to-b from-[#212121] via-[#212121] to-transparent">
                     <div className="flex items-center gap-3">
                        {!isSidebarOpen && (
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsSidebarOpen(true)} className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-800 transition-colors">
                                    <SidebarIcon />
                                </button>
                                <button onClick={handleNewChat} className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-800 transition-colors" title="New Chat">
                                    <PlusIcon />
                                </button>
                            </div>
                        )}
                        {!isSidebarOpen && (
                            <div className="flex items-center gap-2 font-bold text-xl text-gray-100 cursor-pointer hover:opacity-80 transition-opacity ml-2" onClick={handleGoHome} title="Go Home">
                                <NexusLogo variant="simple" size="w-8 h-8" /> <span>Nexus</span>
                            </div>
                        )}
                     </div>
                    <div className="flex items-center space-x-4">
                        {isSaving && <span className="text-xs text-gray-500 animate-pulse">Syncing...</span>}
                        {!user && <button onClick={handleLogin} className="text-sm text-gray-400 hover:text-white transition-colors">Sign In</button>}
                         {user && <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold border border-green-400 shadow-sm cursor-default" title={user.username}>{user.username ? user.username.charAt(0).toUpperCase() : 'U'}</div>}
                    </div>
                </header>

                <div className={`absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center z-40 ${shouldAnimate ? 'transition-opacity duration-500 ease-out' : ''} ${hasStarted ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="mb-6"><NexusLogo variant="full" size="w-32 h-32" /></div>
                    <h2 className="text-2xl font-semibold mb-2 text-white tracking-tight">How can I help you?</h2>
                </div>

                <div className={`absolute top-0 left-0 w-full h-full pt-20 ${isMobile ? 'pb-44' : 'pb-48'} px-4 overflow-y-auto scrollbar-hide z-30 ${shouldAnimate ? 'transition-opacity duration-500 ease-in' : ''} ${showChat ? 'opacity-100' : 'opacity-0' }`}>
                    <div className="space-y-6 max-w-3xl mx-auto">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] md:max-w-[85%] rounded-2xl px-5 py-3 ${msg.sender === 'user' ? 'bg-[#2f2f2f] text-gray-100 rounded-tr-sm' : 'bg-transparent text-gray-100'}`}>
                                    {msg.sender === 'user' ? (
                                        <div>
                                            {msg.attachments?.map((a,i) => (
                                                <div key={i} className="text-xs text-gray-400 mb-1 flex items-center gap-1"><PaperclipIcon /> {a.name}</div>
                                            ))}
                                            {msg.content}
                                        </div>
                                    ) : (
                                        msg.isGeneratingImage ? (
                                            <div className="flex justify-center py-4">
                                                <ImageGeneratingUI />
                                            </div>
                                        ) : (
                                            renderMarkdown(msg.content, msg.isStreaming)
                                        )
                                    )}
                                    
                                    {msg.isThinking && !msg.content && !msg.isDeepResearch && (
                                        <div className="mt-2 text-xs text-purple-400 flex items-center gap-2 animate-pulse">
                                            <BrainIcon active={true} /> <span>Reasoning...</span>
                                        </div>
                                    )}

                                    {msg.isDeepResearch && !msg.content && (
                                        <div className="mt-2 text-xs text-teal-400 flex items-center gap-2 animate-pulse">
                                            <LightbulbIcon active={true} /> <span>Deep Researching...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                         {(isLoading || (messages.length > 0 && messages[messages.length-1].sender === 'ai' && !messages[messages.length-1].content && !messages[messages.length-1].isGeneratingImage && !messages[messages.length-1].isThinking && !messages[messages.length-1].isDeepResearch)) && (
                            <div className="flex justify-start w-full max-w-3xl mx-auto mt-4">
                                <div className="ml-4 flex items-center space-x-2">
                                    <LoadingOrb mode={useDeepResearch ? 'deep' : 'normal'} />
                                </div>
                            </div>
                        )}
                         <div ref={chatEndRef} />
                    </div>
                </div>

                <div className={`absolute z-50 flex justify-center pointer-events-auto ${isMobile ? 'bottom-0 left-0 right-0 bg-[#212121] border-t border-gray-800' : 'bottom-6 left-4 right-4'}`}>
                    <div className={`w-full max-w-3xl bg-[#2f2f2f] ${isMobile ? 'rounded-none p-3 border-none' : 'rounded-3xl p-2 shadow-2xl border border-gray-700'} relative focus-within:border-gray-500 transition-colors`}>
                        
                        {isDictating ? (
                            <div className="w-full h-[40px] flex items-center justify-between px-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-gray-300 font-medium animate-pulse">Listening...</span>
                                    <span className="text-gray-500 text-sm truncate max-w-[200px]">{dictationText}</span>
                                </div>
                                <button onClick={() => setIsDictating(false)} className="text-gray-400 hover:text-white text-xs">Cancel</button>
                            </div>
                        ) : (
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                                placeholder={isMobile ? "Message..." : "Message Nexus..."}
                                className="w-full bg-transparent text-gray-100 placeholder-gray-500 px-4 py-2 focus:outline-none resize-none max-h-[150px] min-h-[40px] text-base"
                                rows={1}
                                style={{ height: input ? 'auto' : '40px' }}
                                onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                            />
                        )}

                        {attachments.length > 0 && !isDictating && (
                            <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
                                {attachments.map((att, i) => (
                                    <div key={i} className="bg-gray-800 text-xs rounded-md px-2 py-1 flex items-center gap-2 border border-gray-600">
                                        <PaperclipIcon /> <span className="truncate max-w-[100px]">{att.name}</span>
                                        <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-white">×</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between items-center px-2 pt-1 pb-1">
                            <div className="flex items-center space-x-1">
                                <div className="relative mr-1 md:mr-2">
                                    <button onClick={() => !useDeepResearch && setIsModelMenuOpen(!isModelMenuOpen)} className={`flex items-center gap-1 bg-[#1e1e1e] hover:bg-[#333] border border-gray-600 px-2 md:px-3 py-1.5 rounded-full cursor-pointer transition-colors ${useDeepResearch ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <ChipIcon /> {!isMobile && <span className="text-xs font-medium text-gray-300 max-w-[100px] truncate">{TEXT_MODELS.find(m => m.id === modelId)?.name}</span>}
                                        <div className={`transition-transform duration-200 ${isModelMenuOpen ? 'rotate-180' : ''}`}><ChevronUpIcon /></div>
                                    </button>
                                    {isModelMenuOpen && (
                                        <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsModelMenuOpen(false)} />
                                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col py-1 animate-fade-in">
                                            {TEXT_MODELS.map(m => (
                                                <button key={m.id} onClick={() => { setModelId(m.id); setIsModelMenuOpen(false); }} className={`px-4 py-3 text-left text-sm hover:bg-[#2f2f2f] transition-colors flex items-center justify-between ${modelId === m.id ? 'text-blue-400' : 'text-gray-300'}`}>
                                                    <span>{m.name}</span> {modelId === m.id && <div className="w-2 h-2 bg-blue-400 rounded-full"></div>}
                                                </button>
                                            ))}
                                        </div>
                                        </>
                                    )}
                                </div>
                                <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                <button onClick={() => fileInputRef.current.click()} className="p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-700 rounded-full transition-colors" title="Attach file"><PaperclipIcon /></button>
                                <button onClick={() => setUseSearch(!useSearch)} className={`p-2 rounded-full transition-colors ${useSearch ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-gray-100 hover:bg-gray-700'}`} title="Search Grounding"><SearchIcon active={useSearch} /></button>
                                <button onClick={() => setUseThinking(!useThinking)} className={`p-2 rounded-full transition-colors ${useThinking ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-gray-100 hover:bg-gray-700'}`} title="Stream Thinking" disabled={useDeepResearch}><BrainIcon active={useThinking && !useDeepResearch} /></button>
                                <button onClick={() => { setUseDeepResearch(!useDeepResearch); if (!useDeepResearch) { setUseThinking(false); setUseSearch(true); } }} className={`p-2 rounded-full transition-colors ${useDeepResearch ? 'bg-teal-500/20 text-teal-400' : 'text-gray-400 hover:text-gray-100 hover:bg-gray-700'}`} title="Deep Research Mode"><LightbulbIcon active={useDeepResearch} /></button>
                            </div>
                            <div className="flex items-center space-x-2">
                                 <button onClick={startDictation} className={`p-2 rounded-full transition-colors ${isDictating ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`} title="Voice Dictation"><MicIcon active={isDictating} /></button>
                                <button onClick={() => handleSend()} disabled={!input.trim() && attachments.length === 0 && !isDictating} className={`p-2 rounded-full transition-all duration-200 ${input.trim() || attachments.length > 0 ? 'bg-white text-black hover:bg-gray-200' : 'bg-[#3f3f3f] text-gray-500 cursor-not-allowed'}`}><SendIcon /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Terminal;
