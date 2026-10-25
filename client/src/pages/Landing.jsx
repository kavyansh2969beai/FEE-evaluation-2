import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const FEATURE_TABS = [
    {
        id: 'chat',
        badge: '💬 Real-Time Communication',
        title: 'Campus Chat & Study Groups',
        subtitle: 'Instant Socket.io messaging, roll-number peer lookup, and group admin controls.',
        accent: '#4f46e5',
        bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
    },
    {
        id: 'resources',
        badge: '📚 Verified Study Archive',
        title: 'Resource Library & Group Sharing',
        subtitle: 'Upload PDFs, lecture notes, and lab manuals directly to public or group feeds.',
        accent: '#0ea5e9',
        bgGradient: 'linear-gradient(135deg, #0f172a 0%, #0c4a6e 100%)'
    },
    {
        id: 'score',
        badge: '⭐ Academic Score & Rewards',
        title: 'Student Score & Contribution Tracker',
        subtitle: 'Earn +10 Reward Points for every study resource shared and track your campus standing.',
        accent: '#f59e0b',
        bgGradient: 'linear-gradient(135deg, #18181b 0%, #451a03 100%)'
    },
    {
        id: 'notes',
        badge: '📝 Personal Knowledge Base',
        title: 'Quick Notes & Revision Deck',
        subtitle: 'Draft, search, and organize color-coded lecture takeaways and exam checklists.',
        accent: '#10b981',
        bgGradient: 'linear-gradient(135deg, #0f172a 0%, #064e3b 100%)'
    },
    {
        id: 'calendar',
        badge: '📅 Academic Planner',
        title: 'Smart Exam & Deadline Calendar',
        subtitle: 'Color-coded Month, Week, and Day schedules for Study Sessions, Meetings, Deadlines, and Exams.',
        accent: '#a855f7',
        bgGradient: 'linear-gradient(135deg, #0f172a 0%, #3b0764 100%)'
    }
];

export default function Landing() {
    const { token } = useAuthStore();

    // Interactive Feature Showcase State
    const [activeTab, setActiveTab] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    // Interactive Demo States inside the Showcase
    const [demoScore, setDemoScore] = useState(140);
    const [owlTipIndex, setOwlTipIndex] = useState(0);
    const [demoChatMessages, setDemoChatMessages] = useState([
        { sender: 'Rohan • Roll #23109914', text: 'Did anyone solve the AVL Tree rotation question from today’s DSA lab?', time: '4:12 PM', isMe: false },
        { sender: 'Ananya • Roll #23109908', text: 'Yes! I just uploaded my annotated PDF to our CSE Group Vault (+10 ⭐)', time: '4:13 PM', isMe: false }
    ]);
    const [demoNotes, setDemoNotes] = useState([
        { id: 1, title: 'DBMS Acid Properties', content: 'Atomicity, Consistency, Isolation, Durability — key for ST2 viva.', tag: 'DBMS' },
        { id: 2, title: 'OS Deadlock Conditions', content: 'Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait.', tag: 'Operating Systems' }
    ]);
    const [newDemoNote, setNewDemoNote] = useState('');

    const owlTips = [
        '🦉 Athena the Campus Owl: "Share a study note to earn +10 Reward Score!"',
        '🦉 Athena the Campus Owl: "Search classmates by University Roll Number in 1 click!"',
        '🦉 Athena the Campus Owl: "Color-code your exams and deadlines in the Calendar!"'
    ];

    useEffect(() => {
        if (!isAutoPlaying) return;
        const timer = setInterval(() => {
            setActiveTab((prev) => (prev + 1) % FEATURE_TABS.length);
        }, 7000);
        return () => clearInterval(timer);
    }, [isAutoPlaying]);

    const handleDemoSend = (msgText) => {
        setIsAutoPlaying(false);
        setDemoChatMessages((prev) => [
            ...prev,
            { sender: 'You • Mindora Student', text: msgText, time: 'Just now', isMe: true }
        ]);
    };

    const handleSimulateUpload = () => {
        setIsAutoPlaying(false);
        setDemoScore((prev) => prev + 10);
    };

    const handleAddQuickDemoNote = (e) => {
        e.preventDefault();
        if (!newDemoNote.trim()) return;
        setIsAutoPlaying(false);
        setDemoNotes((prev) => [
            { id: Date.now(), title: 'New Revision Note', content: newDemoNote, tag: 'Quick Note' },
            ...prev
        ]);
        setNewDemoNote('');
    };

    const currentFeature = FEATURE_TABS[activeTab];

    return (
        <div style={{ minHeight: '100vh', overflowX: 'hidden', background: '#f8fafc' }}>

            {/* =========================================================
                SECTION 1: ATMOSPHERIC SKY-TO-MEADOW HERO WITH WILDLIFE & LIVE WIDGETS
               ========================================================= */}
            <section style={{
                background: 'linear-gradient(180deg, #bae6fd 0%, #e0f2fe 52%, #ecfccb 100%)',
                minHeight: '95vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
            }}>

                {/* Ambient Glowing Sunbeams & Floating Pollen/Fireflies */}
                <div style={{ position: 'absolute', top: '-120px', left: '50%', transform: 'translateX(-50%)', width: '750px', height: '350px', background: 'radial-gradient(circle, rgba(254, 240, 138, 0.55) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div className="firefly-anim" style={{ position: 'absolute', top: '28%', left: '16%', width: '10px', height: '10px', borderRadius: '50%', background: '#fde047', boxShadow: '0 0 12px #eab308' }} />
                <div className="firefly-anim" style={{ position: 'absolute', top: '34%', right: '19%', width: '8px', height: '8px', borderRadius: '50%', background: '#fde047', boxShadow: '0 0 12px #eab308', animationDelay: '-1.8s' }} />

                {/* Animated Bird Flock Left-to-Right */}
                <div className="bird-flock-a" style={{ position: 'absolute', top: '16%', left: '11%', zIndex: 4, pointerEvents: 'none', display: 'flex', gap: '14px' }}>
                    <svg width="34" height="20" viewBox="0 0 34 20" fill="none" className="wing-anim">
                        <path d="M2 14 C 9 4, 15 6, 17 13 C 19 6, 25 4, 32 14" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <svg width="24" height="15" viewBox="0 0 34 20" fill="none" className="wing-anim" style={{ marginTop: '-10px', animationDelay: '-0.3s' }}>
                        <path d="M2 14 C 9 4, 15 6, 17 13 C 19 6, 25 4, 32 14" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                </div>

                {/* Animated Bird Flock Right-to-Left */}
                <div className="bird-flock-b" style={{ position: 'absolute', top: '21%', right: '14%', zIndex: 4, pointerEvents: 'none', display: 'flex', gap: '10px' }}>
                    <svg width="28" height="16" viewBox="0 0 34 20" fill="none" className="wing-anim">
                        <path d="M2 14 C 9 4, 15 6, 17 13 C 19 6, 25 4, 32 14" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                </div>

                {/* TOP NAVIGATION BAR */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2.5rem', flexWrap: 'wrap', gap: '1rem', zIndex: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
                        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '1.1rem', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}>
                                M
                            </div>
                            <span style={{ fontSize: '1.55rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.03em' }}>Mindora</span>
                        </Link>

                        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.9rem', color: '#334155', fontWeight: '600', flexWrap: 'wrap', background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(8px)', padding: '0.45rem 1rem', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.8)' }}>
                            <Link to={token ? "/chat" : "/login"} style={{ color: '#0f172a', textDecoration: 'none', padding: '0.2rem 0.5rem' }}>Chat</Link>
                            <span style={{ color: '#cbd5e1' }}>/</span>
                            <Link to={token ? "/resources" : "/login"} style={{ color: '#0f172a', textDecoration: 'none', padding: '0.2rem 0.5rem' }}>Resources</Link>
                            <span style={{ color: '#cbd5e1' }}>/</span>
                            <Link to={token ? "/profile" : "/login"} style={{ color: '#0f172a', textDecoration: 'none', padding: '0.2rem 0.5rem' }}>Score & Rewards</Link>
                            <span style={{ color: '#cbd5e1' }}>/</span>
                            <Link to={token ? "/notes" : "/login"} style={{ color: '#0f172a', textDecoration: 'none', padding: '0.2rem 0.5rem' }}>Notes</Link>
                            <span style={{ color: '#cbd5e1' }}>/</span>
                            <Link to={token ? "/calendar" : "/login"} style={{ color: '#0f172a', textDecoration: 'none', padding: '0.2rem 0.5rem' }}>Calendar</Link>
                        </nav>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                            onClick={() => document.getElementById('features-showcase')?.scrollIntoView({ behavior: 'smooth' })}
                            style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid #cbd5e1', color: '#0f172a', padding: '0.55rem 1.1rem', borderRadius: '999px', fontWeight: '700', fontSize: '0.86rem', cursor: 'pointer' }}
                        >
                            Explore Features ↓
                        </button>
                        {token ? (
                            <Link to="/dashboard" className="indigo-pill-btn" style={{ padding: '0.55rem 1.35rem', fontSize: '0.9rem' }}>
                                Open Workspace →
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" style={{ background: 'rgba(255,255,255,0.85)', color: '#0f172a', textDecoration: 'none', padding: '0.55rem 1.25rem', borderRadius: '999px', fontWeight: '700', fontSize: '0.9rem', border: '1px solid #cbd5e1' }}>
                                    Log in
                                </Link>
                                <Link to="/register" className="pink-pill-btn" style={{ padding: '0.55rem 1.35rem', fontSize: '0.9rem' }}>
                                    Sign up
                                </Link>
                            </>
                        )}
                    </div>
                </header>

                {/* CENTER HERO HEADLINE & VALUE PROPOSITION */}
                <div style={{ textAlign: 'center', maxWidth: '920px', margin: '1rem auto 1rem auto', padding: '0 1.5rem', zIndex: 15 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.85)', border: '1px solid #bae6fd', padding: '0.35rem 1rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: '700', color: '#0369a1', marginBottom: '1.15rem', boxShadow: '0 2px 10px rgba(2,132,199,0.08)' }}>
                        <span>✨</span> The All-in-One Student Collaboration & Study Workspace
                    </div>

                    <h1 className="mindora-hero-title" style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)', marginBottom: '1.1rem', color: '#0f172a' }}>
                        STUDY TOGETHER.<br />
                        SHARE RESOURCES.<br />
                        TRACK YOUR PROGRESS.
                    </h1>

                    <p style={{ fontSize: 'clamp(1.02rem, 1.8vw, 1.25rem)', color: '#334155', maxWidth: '680px', margin: '0 auto 1.75rem auto', lineHeight: '1.55', fontWeight: '500' }}>
                        Connect with classmates by roll number, collaborate in real-time study groups, organize your lecture notes, and earn reward points for every resource you share.
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
                        <Link to={token ? "/dashboard" : "/register"} className="pink-pill-btn">
                            {token ? "Launch Your Dashboard" : "Get Started — It's Free"}
                        </Link>
                        <button
                            onClick={() => document.getElementById('features-showcase')?.scrollIntoView({ behavior: 'smooth' })}
                            style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '999px', padding: '0.85rem 1.75rem', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(15,23,42,0.2)' }}
                        >
                            See Interactive Demo
                        </button>
                    </div>
                </div>

                {/* =========================================================
                    DETAILED ANIMATED HORIZON SCENE (Wildlife, Trees & 4 Authentic Feature Cards)
                   ========================================================= */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '1360px', margin: '0 auto', height: '320px', zIndex: 10 }}>

                    {/* Left Botanical Pine Trees & Perched Campus Owl */}
                    <div style={{ position: 'absolute', left: '3%', bottom: '32px', zIndex: 12, display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                        {/* Swaying Pine Tree SVG */}
                        <svg width="88" height="150" viewBox="0 0 88 150" className="tree-sway-anim">
                            <rect x="38" y="115" width="12" height="35" rx="3" fill="#78350f" stroke="#0f172a" strokeWidth="2.5" />
                            <polygon points="44,12 10,65 78,65" fill="#15803d" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
                            <polygon points="44,42 6,95 82,95" fill="#16a34a" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
                            <polygon points="44,70 2,122 86,122" fill="#22c55e" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
                        </svg>

                        {/* Interactive Perched Campus Owl */}
                        <div
                            onClick={() => setOwlTipIndex((prev) => (prev + 1) % owlTips.length)}
                            style={{ cursor: 'pointer', marginBottom: '26px', position: 'relative' }}
                            title="Click Athena the Campus Owl!"
                        >
                            <div style={{ background: 'white', border: '2px solid #0f172a', borderRadius: '10px', padding: '0.35rem 0.65rem', fontSize: '0.68rem', fontWeight: '700', color: '#0f172a', marginBottom: '6px', maxWidth: '185px', boxShadow: '0 4px 0 #0f172a' }}>
                                {owlTips[owlTipIndex]}
                            </div>
                            <svg width="56" height="64" viewBox="0 0 56 64" className="owl-anim">
                                {/* Branch */}
                                <line x1="2" y1="56" x2="54" y2="56" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
                                {/* Owl Body */}
                                <ellipse cx="28" cy="36" rx="16" ry="19" fill="#92400e" stroke="#0f172a" strokeWidth="2.5" />
                                <ellipse cx="28" cy="39" rx="10" ry="12" fill="#fef3c7" />
                                {/* Owl Eyes */}
                                <circle cx="22" cy="26" r="5.5" fill="white" stroke="#0f172a" strokeWidth="2" />
                                <circle cx="34" cy="26" r="5.5" fill="white" stroke="#0f172a" strokeWidth="2" />
                                <circle cx="22" cy="26" r="2.5" fill="#0f172a" />
                                <circle cx="34" cy="26" r="2.5" fill="#0f172a" />
                                {/* Beak & Graduation Cap */}
                                <polygon points="28,29 25,34 31,34" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />
                                <polygon points="28,8 10,16 28,22 46,16" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
                            </svg>
                        </div>
                    </div>

                    {/* Right Meadow Red Fox & Observatory Dome */}
                    <div style={{ position: 'absolute', right: '3.5%', bottom: '34px', zIndex: 12, display: 'flex', alignItems: 'flex-end', gap: '14px' }}>
                        {/* Curious Red Fox SVG with Animated Wagging Tail */}
                        <svg width="86" height="66" viewBox="0 0 86 66">
                            {/* Wagging Tail */}
                            <g className="fox-tail-anim" style={{ transformOrigin: '55px 46px' }}>
                                <path d="M52 46 C 72 34, 82 42, 78 54 C 72 60, 58 56, 52 46 Z" fill="#ea580c" stroke="#0f172a" strokeWidth="2.5" />
                                <circle cx="76" cy="49" r="5" fill="#ffffff" />
                            </g>
                            {/* Fox Body & Head */}
                            <ellipse cx="38" cy="48" rx="16" ry="11" fill="#ea580c" stroke="#0f172a" strokeWidth="2.5" />
                            <polygon points="16,24 22,12 29,22" fill="#ea580c" stroke="#0f172a" strokeWidth="2" />
                            <polygon points="31,22 38,12 42,24" fill="#ea580c" stroke="#0f172a" strokeWidth="2" />
                            <circle cx="28" cy="31" r="11" fill="#ea580c" stroke="#0f172a" strokeWidth="2.5" />
                            <circle cx="24" cy="30" r="2" fill="#0f172a" />
                            <circle cx="32" cy="30" r="2" fill="#0f172a" />
                            <circle cx="20" cy="34" r="2.5" fill="#0f172a" />
                        </svg>

                        {/* Swaying Cypress & Pine */}
                        <svg width="76" height="135" viewBox="0 0 88 150" className="tree-sway-anim" style={{ animationDelay: '-2.2s' }}>
                            <rect x="38" y="115" width="12" height="35" rx="3" fill="#78350f" stroke="#0f172a" strokeWidth="2.5" />
                            <polygon points="44,16 12,68 76,68" fill="#047857" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
                            <polygon points="44,48 8,98 80,98" fill="#059669" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
                            <polygon points="44,76 4,122 84,122" fill="#10b981" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
                        </svg>
                    </div>

                    {/* CENTER 4 AUTHENTIC FLOATING PRODUCT CARDS */}
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: '42px',
                        transform: 'translateX(-50%)',
                        width: '92%',
                        maxWidth: '880px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))',
                        gap: '1rem',
                        alignItems: 'end',
                        zIndex: 15
                    }}>

                        {/* 1. Live Chat Card */}
                        <div
                            onClick={() => { setActiveTab(0); document.getElementById('features-showcase')?.scrollIntoView({ behavior: 'smooth' }); }}
                            className="float-widget-a"
                            style={{ background: 'white', border: '2.5px solid #0f172a', borderRadius: '14px', padding: '0.85rem', boxShadow: '0 8px 0 #0f172a', cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#4f46e5', background: '#eef2ff', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>💬 Live Chat</span>
                                <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '800' }}>● Online</span>
                            </div>
                            <p style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.2rem' }}>CSE Study Pod (8)</p>
                            <p style={{ fontSize: '0.72rem', color: '#475569', lineHeight: '1.35' }}>&ldquo;Shared the DSA trees solution in the group!&rdquo;</p>
                        </div>

                        {/* 2. Resource Library Card */}
                        <div
                            onClick={() => { setActiveTab(1); document.getElementById('features-showcase')?.scrollIntoView({ behavior: 'smooth' }); }}
                            className="float-widget-b"
                            style={{ background: 'white', border: '2.5px solid #0f172a', borderRadius: '14px', padding: '0.85rem', boxShadow: '0 8px 0 #0f172a', marginBottom: '16px', cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#0284c7', background: '#e0f2fe', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>📚 Resource Vault</span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>PDF • 2.4MB</span>
                            </div>
                            <p style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.2rem' }}>DBMS_Normalization.pdf</p>
                            <p style={{ fontSize: '0.72rem', color: '#475569' }}>⬇ 42 Downloads • Preview Ready</p>
                        </div>

                        {/* 3. Score & Reward Points Card */}
                        <div
                            onClick={() => { setActiveTab(2); document.getElementById('features-showcase')?.scrollIntoView({ behavior: 'smooth' }); }}
                            className="float-widget-a"
                            style={{ background: 'white', border: '2.5px solid #0f172a', borderRadius: '14px', padding: '0.85rem', boxShadow: '0 8px 0 #0f172a', marginBottom: '6px', cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#d97706', background: '#fef3c7', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>⭐ Student Score</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: '900', color: '#16a34a' }}>+10 pts</span>
                            </div>
                            <p style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.2rem' }}>{demoScore} Reward Points</p>
                            <p style={{ fontSize: '0.72rem', color: '#475569' }}>Top Contributor Badge Unlocked</p>
                        </div>

                        {/* 4. Notes & Calendar Card */}
                        <div
                            onClick={() => { setActiveTab(3); document.getElementById('features-showcase')?.scrollIntoView({ behavior: 'smooth' }); }}
                            className="float-widget-b"
                            style={{ background: 'white', border: '2.5px solid #0f172a', borderRadius: '14px', padding: '0.85rem', boxShadow: '0 8px 0 #0f172a', marginBottom: '20px', cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#7e22ce', background: '#f3e8ff', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>📝 Notes & Planner</span>
                                <span style={{ fontSize: '0.68rem', color: '#e11d48', fontWeight: '800' }}>Tomorrow</span>
                            </div>
                            <p style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.2rem' }}>OS Midterm Revision</p>
                            <p style={{ fontSize: '0.72rem', color: '#475569' }}>Synced with Personal Notes & Calendar</p>
                        </div>

                    </div>
                </div>

                {/* Layered Rolling Hills Horizon SVG */}
                <div style={{ width: '100%', lineHeight: 0, marginTop: '-70px', zIndex: 5 }}>
                    <svg viewBox="0 0 1440 130" width="100%" height="105px" preserveAspectRatio="none">
                        <path d="M0,85 C320,20 620,110 960,45 C1200,10 1350,65 1440,35 L1440,130 L0,130 Z" fill="#86efac" opacity="0.6" />
                        <path d="M0,65 C280,15 520,105 840,55 C1120,10 1320,80 1440,45 L1440,130 L0,130 Z" fill="#bef264" stroke="#0f172a" strokeWidth="3" />
                    </svg>
                </div>
            </section>

            {/* =========================================================
                TICKER TAPE: AUTHENTIC MINDORA CAPABILITIES MARQUEE
               ========================================================= */}
            <div style={{ background: '#a3e635', borderTop: '2.5px solid #0f172a', borderBottom: '2.5px solid #0f172a', padding: '0.7rem 0', overflow: 'hidden' }}>
                <div className="marquee-track">
                    {[...Array(2)].map((_, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '2.5rem', paddingRight: '2.5rem', fontWeight: '800', fontSize: '0.85rem', color: '#0f172a' }}>
                            <span>💬 1-ON-1 & GROUP STUDY CHATS</span>
                            <span>•</span>
                            <span>📚 UPLOAD & PREVIEW LECTURE PDFS</span>
                            <span>•</span>
                            <span>⭐ EARN +10 REWARD SCORE PER UPLOAD</span>
                            <span>•</span>
                            <span>📝 ORGANIZE PERSONAL QUICK NOTES</span>
                            <span>•</span>
                            <span>📅 EXAM & DEADLINE CALENDAR</span>
                            <span>•</span>
                            <span>🔍 FIND CLASSMATES BY ROLL NUMBER</span>
                            <span>•</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* =========================================================
                SECTION 2: INTERACTIVE 5-PILLAR PRODUCT SHOWCASE (Replaces Irrelevant Boards)
               ========================================================= */}
            <section id="features-showcase" style={{ background: '#bef264', padding: '4.5rem 1.5rem', textAlign: 'center' }}>
                <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
                    <span style={{ background: '#0f172a', color: '#bef264', padding: '0.3rem 0.9rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Built for Real Academic Workflows
                    </span>
                    <h2 style={{ fontSize: 'clamp(1.85rem, 3.5vw, 2.6rem)', fontWeight: '800', color: '#0f172a', marginTop: '0.75rem', marginBottom: '0.4rem' }}>
                        Everything you need to succeed on campus
                    </h2>
                    <p style={{ color: '#1e293b', fontSize: '1.05rem', marginBottom: '2rem', fontWeight: '500' }}>
                        Explore Mindora&apos;s five core modules below — click any tab to test the live interactive preview.
                    </p>

                    {/* Feature Selector Pills */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
                        {[
                            { idx: 0, label: '💬 Chat & Groups' },
                            { idx: 1, label: '📚 Resource Library' },
                            { idx: 2, label: '⭐ Score & Rewards' },
                            { idx: 3, label: '📝 Personal Notes' },
                            { idx: 4, label: '📅 Exam Calendar' }
                        ].map((tab) => (
                            <button
                                key={tab.idx}
                                onClick={() => { setActiveTab(tab.idx); setIsAutoPlaying(false); }}
                                style={{
                                    background: activeTab === tab.idx ? '#0f172a' : 'rgba(255,255,255,0.85)',
                                    color: activeTab === tab.idx ? '#ffffff' : '#0f172a',
                                    border: '2px solid #0f172a',
                                    padding: '0.6rem 1.25rem',
                                    borderRadius: '999px',
                                    fontWeight: '800',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    boxShadow: activeTab === tab.idx ? '0 4px 0 #4f46e5' : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* INTERACTIVE WORKSPACE WINDOW */}
                    <div
                        key={currentFeature.id}
                        className="board-fade"
                        style={{
                            background: currentFeature.bgGradient,
                            borderRadius: '20px',
                            padding: '2.25rem',
                            color: 'white',
                            textAlign: 'left',
                            boxShadow: '0 24px 48px rgba(15, 23, 42, 0.22)',
                            border: '2.5px solid #0f172a',
                            minHeight: '430px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '2rem',
                            alignItems: 'center'
                        }}
                    >
                        {/* Left Column: Feature Description & Highlights */}
                        <div>
                            <span style={{ background: 'rgba(255,255,255,0.14)', color: '#ffffff', padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700' }}>
                                {currentFeature.badge}
                            </span>
                            <h3 style={{ fontSize: 'clamp(1.55rem, 2.6vw, 2.1rem)', fontWeight: '800', margin: '1rem 0 0.65rem 0', lineHeight: '1.2' }}>
                                {currentFeature.title}
                            </h3>
                            <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                                {currentFeature.subtitle}
                            </p>

                            {activeTab === 0 && (
                                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem', color: '#e2e8f0' }}>
                                    <li>✓ Search classmates by Name, Email, or University Roll Number</li>
                                    <li>✓ Form dedicated Study Groups with Admin rename & member controls</li>
                                    <li>✓ Real-time unread badges, message copy, and instant deletion</li>
                                </ul>
                            )}
                            {activeTab === 1 && (
                                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem', color: '#e2e8f0' }}>
                                    <li>✓ Filter by Lecture Notes, Past Papers, Lab Manuals, or Assignments</li>
                                    <li>✓ Built-in modal file preview before downloading</li>
                                    <li>✓ Automatic personal download history & group-specific sharing</li>
                                </ul>
                            )}
                            {activeTab === 2 && (
                                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem', color: '#e2e8f0' }}>
                                    <li>✓ Automatic +10 Reward Points credited on every verified upload</li>
                                    <li>✓ Track total downloads across your shared notes</li>
                                    <li>✓ Showcase your academic bio, roll number, and achievement tier</li>
                                </ul>
                            )}
                            {activeTab === 3 && (
                                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem', color: '#e2e8f0' }}>
                                    <li>✓ Create personal study cards for formulas, definitions, and code snippets</li>
                                    <li>✓ Instant keyword filtering across all your saved notes</li>
                                    <li>✓ Clean card layout with one-click copy and deletion</li>
                                </ul>
                            )}
                            {activeTab === 4 && (
                                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem', color: '#e2e8f0' }}>
                                    <li>✓ Switch seamlessly between Month, Week, and Day calendar grids</li>
                                    <li>✓ Color-coded badges for Study Sessions, Group Meetings, Deadlines, and Exams</li>
                                    <li>✓ Custom locations, reminders, and Upcoming vs. Past filters</li>
                                </ul>
                            )}

                            <div style={{ marginTop: '1.75rem' }}>
                                <Link
                                    to={token ? `/${currentFeature.id === 'score' ? 'profile' : currentFeature.id}` : '/register'}
                                    className="pink-pill-btn"
                                    style={{ padding: '0.65rem 1.45rem', fontSize: '0.9rem' }}
                                >
                                    {token ? `Open ${currentFeature.title.split(' ')[0]}` : 'Start Using Mindora Free →'}
                                </Link>
                            </div>
                        </div>

                        {/* Right Column: Live Interactive UI Preview for the Selected Tab */}
                        <div style={{ background: '#ffffff', color: '#0f172a', borderRadius: '16px', padding: '1.35rem', boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }}>
                            
                            {/* TAB 0 PREVIEW: LIVE CHAT */}
                            {activeTab === 0 && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
                                        <div>
                                            <strong style={{ fontSize: '0.95rem' }}>CSE & AI Study Group</strong>
                                            <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '700' }}>● 8 Classmates Active</div>
                                        </div>
                                        <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '800' }}>Admin: You</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: '190px', overflowY: 'auto', marginBottom: '0.85rem' }}>
                                        {demoChatMessages.map((m, i) => (
                                            <div key={i} style={{ alignSelf: m.isMe ? 'flex-end' : 'flex-start', background: m.isMe ? '#4f46e5' : '#f1f5f9', color: m.isMe ? 'white' : '#0f172a', padding: '0.55rem 0.8rem', borderRadius: '10px', maxWidth: '85%', fontSize: '0.78rem' }}>
                                                <div style={{ fontSize: '0.65rem', opacity: 0.75, fontWeight: '700', marginBottom: '0.15rem' }}>{m.sender} • {m.time}</div>
                                                <div>{m.text}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        <button onClick={() => handleDemoSend('Thanks Ananya! Downloading it now 🙌')} style={{ flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.45rem', fontSize: '0.74rem', fontWeight: '600', cursor: 'pointer' }}>
                                            Reply: &ldquo;Downloading it now 🙌&rdquo;
                                        </button>
                                        <button onClick={() => handleDemoSend('Let’s meet in Library Pod 2 at 5 PM!')} style={{ flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.45rem', fontSize: '0.74rem', fontWeight: '600', cursor: 'pointer' }}>
                                            Reply: &ldquo;Meet at Library Pod 2!&rdquo;
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* TAB 1 PREVIEW: RESOURCES */}
                            {activeTab === 1 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.6rem' }}>
                                        <strong style={{ fontSize: '0.95rem' }}>Shared Resource Vault</strong>
                                        <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: '700' }}>3 Verified Files</span>
                                    </div>
                                    {[
                                        { title: 'DSA Trees & Graphs Complete Notes', sub: 'Data Structures', cat: 'Lecture Notes', dl: 64 },
                                        { title: 'DBMS Indexing & B-Trees Past Paper', sub: 'Database Systems', cat: 'Past Paper', dl: 41 },
                                        { title: 'Operating Systems Process Sync Lab', sub: 'OS Lab', cat: 'Lab Manual', dl: 29 }
                                    ].map((item, i) => (
                                        <div key={i} style={{ padding: '0.7rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '0.82rem', fontWeight: '700' }}>{item.title}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.sub} • {item.cat} • ⬇ {item.dl}</div>
                                            </div>
                                            <span style={{ background: '#10b981', color: 'white', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700' }}>Preview</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* TAB 2 PREVIEW: STUDENT SCORE & REWARDS */}
                            {activeTab === 2 && (
                                <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: '#fef3c7', fontSize: '2rem', marginBottom: '0.6rem', border: '2px solid #f59e0b' }}>
                                        ⭐
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Live Academic Reward Balance</div>
                                    <div style={{ fontSize: '2.4rem', fontWeight: '900', color: '#0f172a', margin: '0.2rem 0' }}>{demoScore} PTS</div>
                                    <p style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '1rem' }}>
                                        Rank: <strong style={{ color: '#d97706' }}>Gold Campus Scholar</strong> • Next tier at 200 PTS
                                    </p>
                                    <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginBottom: '1.15rem' }}>
                                        <div style={{ width: `${Math.min(100, (demoScore / 200) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #10b981)', transition: 'width 0.3s ease' }} />
                                    </div>
                                    <button
                                        onClick={handleSimulateUpload}
                                        style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', padding: '0.65rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer' }}
                                    >
                                        Simulate Uploading a Study Resource (+10 ⭐)
                                    </button>
                                </div>
                            )}

                            {/* TAB 3 PREVIEW: QUICK NOTES */}
                            {activeTab === 3 && (
                                <div>
                                    <form onSubmit={handleAddQuickDemoNote} style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
                                        <input
                                            type="text"
                                            placeholder="Type a quick revision note..."
                                            value={newDemoNote}
                                            onChange={(e) => setNewDemoNote(e.target.value)}
                                            style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                        />
                                        <button type="submit" style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 0.85rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}>
                                            + Save
                                        </button>
                                    </form>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                        {demoNotes.slice(0, 3).map((n) => (
                                            <div key={n.id} style={{ padding: '0.7rem', borderRadius: '8px', background: '#f8fafc', borderLeft: '4px solid #10b981', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                                    <strong style={{ fontSize: '0.82rem' }}>{n.title}</strong>
                                                    <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#166534', padding: '0.1rem 0.45rem', borderRadius: '999px', fontWeight: '700' }}>{n.tag}</span>
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: '#475569', margin: 0 }}>{n.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB 4 PREVIEW: SMART CALENDAR */}
                            {activeTab === 4 && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <strong style={{ fontSize: '0.92rem' }}>Upcoming Academic Schedule</strong>
                                        <span style={{ fontSize: '0.7rem', background: '#f3e8ff', color: '#7e22ce', padding: '0.2rem 0.55rem', borderRadius: '999px', fontWeight: '700' }}>Month / Week / Day</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {[
                                            { title: 'DBMS Midterm Exam', cat: 'Exam', time: 'Oct 28 • 10:00 AM', color: '#f97316', bg: '#fff7ed' },
                                            { title: 'AI Project Sprint Meeting', cat: 'Group Meeting', time: 'Oct 26 • 4:30 PM', color: '#16a34a', bg: '#f0fdf4' },
                                            { title: 'DSA Assignment #4 Submission', cat: 'Deadline', time: 'Oct 25 • 11:59 PM', color: '#9333ea', bg: '#faf5ff' }
                                        ].map((ev, i) => (
                                            <div key={i} style={{ padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${ev.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: '700' }}>{ev.title}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{ev.time}</div>
                                                </div>
                                                <span style={{ background: ev.bg, color: ev.color, padding: '0.2rem 0.55rem', borderRadius: '999px', fontSize: '0.68rem', fontWeight: '700' }}>{ev.cat}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Indicator Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', gap: '0.85rem', padding: '0 0.5rem' }}>
                        <button
                            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '800', color: '#365314' }}
                        >
                            {isAutoPlaying ? '||' : '▶'}
                        </button>
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.45rem' }}>
                            {FEATURE_TABS.map((_, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => { setActiveTab(idx); setIsAutoPlaying(false); }}
                                    style={{
                                        height: '6px',
                                        borderRadius: '999px',
                                        background: idx <= activeTab ? '#4f46e5' : '#a3e635',
                                        border: '1px solid rgba(15, 23, 42, 0.2)',
                                        cursor: 'pointer'
                                    }}
                                />
                            ))}
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#365314' }}>
                            {activeTab + 1} / {FEATURE_TABS.length}
                        </span>
                    </div>
                </div>
            </section>

            {/* =========================================================
                SECTION 3: BENTO GRID OVERVIEW OF WHY STUDENTS USE MINDORA
               ========================================================= */}
            <section style={{ background: '#f8fafc', padding: '5rem 1.5rem', borderTop: '2.5px solid #0f172a' }}>
                <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <span style={{ color: '#4f46e5', fontWeight: '800', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Designed for University Life
                        </span>
                        <h2 style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.5rem)', fontWeight: '800', color: '#0f172a', marginTop: '0.4rem' }}>
                            Everything connected in one unified student platform
                        </h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.35rem' }}>
                        {[
                            {
                                icon: '💬',
                                title: 'Roll-Number Peer Network',
                                desc: 'Never confuse students with the same name. Find classmates by their unique university roll number, send friend requests, and launch 1-on-1 or group chats.',
                                badge: 'Real-Time Socket.io',
                                color: '#eef2ff',
                                text: '#4f46e5'
                            },
                            {
                                icon: '📚',
                                title: 'Group & Public Resource Vault',
                                desc: 'Share lecture notes, past exam papers, and lab manuals either with the entire campus or privately inside your specific study group.',
                                badge: 'In-App File Previews',
                                color: '#e0f2fe',
                                text: '#0284c7'
                            },
                            {
                                icon: '⭐',
                                title: 'Academic Score & Rewards',
                                desc: 'Every resource you upload earns +10 Reward Points automatically. Track your contributions and build a strong academic profile.',
                                badge: '+10 Points / Upload',
                                color: '#fef3c7',
                                text: '#d97706'
                            },
                            {
                                icon: '📅',
                                title: 'Notes & Exam Calendar',
                                desc: 'Keep personal revision notes alongside a color-coded calendar for Study Sessions, Group Meetings, Deadlines, and Upcoming Exams.',
                                badge: 'Month • Week • Day',
                                color: '#f3e8ff',
                                text: '#7e22ce'
                            }
                        ].map((card, i) => (
                            <div key={i} className="mindora-card mindora-card-hover" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
                                        <span style={{ width: '46px', height: '46px', borderRadius: '12px', background: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.45rem' }}>
                                            {card.icon}
                                        </span>
                                        <span style={{ background: card.color, color: card.text, padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '800' }}>
                                            {card.badge}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: '1.18rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.55rem' }}>{card.title}</h3>
                                    <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.55' }}>{card.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* =========================================================
                SECTION 4: BOTANICAL FOLIAGE HORIZON & MODERN FOOTER
               ========================================================= */}
            <div style={{ background: '#f8fafc', lineHeight: 0, paddingTop: '1rem' }}>
                <svg viewBox="0 0 1440 130" width="100%" height="105px" preserveAspectRatio="none">
                    <path
                        d="M0,130 L0,75 L35,40 L55,85 L95,20 L125,80 L170,35 L210,90 L260,15 L300,85 L355,40 L395,90 L450,18 L495,85 L550,35 L600,90 L655,12 L705,82 L760,38 L810,90 L865,15 L915,85 L975,35 L1020,88 L1080,18 L1130,82 L1190,35 L1240,90 L1300,20 L1350,85 L1400,40 L1440,80 L1440,130 Z"
                        fill="#0f172a"
                    />
                </svg>
            </div>

            <footer style={{ background: '#0f172a', color: '#f8fafc', padding: '3.5rem 2.5rem 4rem 2.5rem' }}>
                <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2.5rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900' }}>
                                M
                            </div>
                            <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>Mindora</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.55', marginBottom: '1.25rem' }}>
                            The modern student collaboration platform for real-time study groups, verified resources, and academic progress tracking.
                        </p>
                    </div>

                    <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '0.85rem', color: '#ffffff' }}>Platform</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.85rem' }}>
                            <Link to={token ? "/dashboard" : "/login"} style={{ color: '#cbd5e1', textDecoration: 'none' }}>Student Dashboard</Link>
                            <Link to={token ? "/chat" : "/login"} style={{ color: '#cbd5e1', textDecoration: 'none' }}>Campus Chat & Groups</Link>
                            <Link to={token ? "/resources" : "/login"} style={{ color: '#cbd5e1', textDecoration: 'none' }}>Resource Vault</Link>
                            <Link to={token ? "/notes" : "/login"} style={{ color: '#cbd5e1', textDecoration: 'none' }}>Personal Notes</Link>
                            <Link to={token ? "/calendar" : "/login"} style={{ color: '#cbd5e1', textDecoration: 'none' }}>Exam Calendar</Link>
                        </div>
                    </div>

                    <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '0.85rem', color: '#ffffff' }}>Student Features</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                            <span>Roll-Number Lookup</span>
                            <span>+10 Upload Reward Score</span>
                            <span>In-App PDF Previews</span>
                            <span>Download History Tracker</span>
                        </div>
                    </div>

                    <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '0.85rem', color: '#ffffff' }}>Get Started</h4>
                        <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '1rem' }}>
                            Join your classmates and organize your semester today.
                        </p>
                        <Link to={token ? "/dashboard" : "/register"} className="pink-pill-btn" style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}>
                            {token ? "Go to Workspace" : "Create Free Account"}
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}