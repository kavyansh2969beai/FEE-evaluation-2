import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    parseISO,
    isAfter
} from 'date-fns';
import useAuthStore from '../store/authStore';
import { API_BASE_URL } from '../api';
import QuickNotesWidget from '../components/QuickNotesWidget';
import { getAvatarUrl } from '../components/Navbar';

export default function Dashboard() {
    const { user, token } = useAuthStore();
    const navigate = useNavigate();

    // Core User & Network Data
    const [profileData, setProfileData] = useState(null);
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [chats, setChats] = useState([]);
    const [resourceSummary, setResourceSummary] = useState({ friendsNotes: [], groupNotes: [], recentDownloads: [] });
    const [recentNotes, setRecentNotes] = useState([]);

    // A. Quick-Chat 4 Permanent Slots State
    const [quickSlots, setQuickSlots] = useState([null, null, null, null]);
    const [activeSlotIndex, setActiveSlotIndex] = useState(null);
    const [friendSearchQuery, setFriendSearchQuery] = useState('');

    // B. Quick Notes Floating Popup State
    const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);

    // C. Notifications Read-Tracking State
    const [readNotifIds, setReadNotifIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('mindora_read_notifs') || '[]');
        } catch {
            return [];
        }
    });

    // D. Mini Calendar & Reminders State
    const [calMonth, setCalMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState(null);
    const [remTitle, setRemTitle] = useState('');
    const [remDate, setRemDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [remTime, setRemTime] = useState('10:00');
    const [remCategory, setRemCategory] = useState('Deadline');
    const [remDesc, setRemDesc] = useState('');

    const headers = { Authorization: `Bearer ${token}` };

    const fetchDashboardData = async () => {
        if (!token) return;

        axios.get(`${API_BASE_URL}/api/users/profile`, { headers })
            .then((res) => {
                setProfileData(res.data);
                if (Array.isArray(res.data.quickChatSlots) && res.data.quickChatSlots.length > 0) {
                    const loaded = [0, 1, 2, 3].map((i) => res.data.quickChatSlots[i] || null);
                    setQuickSlots(loaded);
                }
            })
            .catch(() => {});

        axios.get(`${API_BASE_URL}/api/users/friends`, { headers })
            .then((res) => {
                setFriends(res.data.friends || []);
                setFriendRequests(res.data.friendRequests || []);
            })
            .catch(() => {});

        axios.get(`${API_BASE_URL}/api/chats`, { headers })
            .then((res) => setChats(res.data || []))
            .catch(() => {});

        axios.get(`${API_BASE_URL}/api/resources/dashboard`, { headers })
            .then((res) => setResourceSummary(res.data || { friendsNotes: [], groupNotes: [], recentDownloads: [] }))
            .catch(() => {});

        axios.get(`${API_BASE_URL}/api/notes`, { headers })
            .then((res) => setRecentNotes(res.data || []))
            .catch(() => {});

        axios.get(`${API_BASE_URL}/api/events`, { headers })
            .then((res) => setEvents(res.data || []))
            .catch(() => {});
    };

    useEffect(() => {
        fetchDashboardData();
    }, [token]);

    // Quick-Chat Slot Handlers
    const persistQuickSlots = async (newSlots) => {
        setQuickSlots(newSlots);
        const slotIds = newSlots.map((s) => (s ? s._id : null));
        try {
            await axios.put(`${API_BASE_URL}/api/users/quick-chat`, { slots: slotIds }, { headers });
        } catch {
            toast.error('Could not save shortcut slot.');
        }
    };

    const handleAssignFriendToSlot = (friendObj) => {
        if (activeSlotIndex === null) return;
        const updated = [...quickSlots];
        updated[activeSlotIndex] = friendObj;
        persistQuickSlots(updated);
        setActiveSlotIndex(null);
        setFriendSearchQuery('');
        toast.success(`${friendObj.name} pinned to Quick Chat!`);
    };

    const handleClearSlot = (index, e) => {
        e.stopPropagation();
        const updated = [...quickSlots];
        updated[index] = null;
        persistQuickSlots(updated);
        toast('Shortcut removed');
    };

    // Real Notifications Builder
    const buildNotifications = () => {
        const list = [];
        const myId = profileData?._id || user?._id || user?.id;

        friendRequests.forEach((reqUser) => {
            list.push({
                id: `freq-${reqUser._id}`,
                icon: '👋',
                accent: '#f59e0b',
                title: `Friend Request from ${reqUser.name}`,
                subtitle: `Roll No: ${reqUser.rollNumber || 'Student'} • Click to respond`,
                time: 'Pending',
                onClick: () => navigate('/chat')
            });
        });

        chats.slice(0, 5).forEach((c) => {
            if (c.latestMessage && String(c.latestMessage.sender?._id) !== String(myId)) {
                const chatLabel = c.isGroupChat
                    ? `Group: ${c.chatName}`
                    : `${c.latestMessage.sender?.name || 'Classmate'}`;
                list.push({
                    id: `msg-${c.latestMessage._id}`,
                    icon: c.isGroupChat ? '👥' : '💬',
                    accent: '#4f46e5',
                    title: `New message in ${chatLabel}`,
                    subtitle: `${c.latestMessage.sender?.name || 'Peer'}: "${c.latestMessage.content}"`,
                    time: c.latestMessage.createdAt
                        ? new Date(c.latestMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Recent',
                    onClick: () => navigate('/chat', { state: { chatId: c._id } })
                });
            }
        });

        [...(resourceSummary.groupNotes || []), ...(resourceSummary.friendsNotes || [])]
            .slice(0, 3)
            .forEach((res) => {
                list.push({
                    id: `res-${res._id}`,
                    icon: '📚',
                    accent: '#0ea5e9',
                    title: `${res.uploader?.name || 'A classmate'} shared "${res.title}"`,
                    subtitle: `Subject: ${res.subject}${res.sharedInGroup ? ` • Group: ${res.sharedInGroup.chatName}` : ''}`,
                    time: res.createdAt ? new Date(res.createdAt).toLocaleDateString() : 'Shared',
                    onClick: () => navigate('/resources')
                });
            });

        return list;
    };

    const notifications = buildNotifications();

    const markNotifRead = (id) => {
        if (!readNotifIds.includes(id)) {
            const updated = [...readNotifIds, id];
            setReadNotifIds(updated);
            localStorage.setItem('mindora_read_notifs', JSON.stringify(updated));
        }
    };

    // Mini Calendar & Reminder Handlers
    const calDays = eachDayOfInterval({
        start: startOfWeek(startOfMonth(calMonth)),
        end: endOfWeek(endOfMonth(calMonth))
    });

    const upcomingReminders = events
        .filter((ev) => isAfter(parseISO(ev.endDate), new Date()))
        .slice(0, 4);

    const openNewReminderModal = (dateObj = new Date()) => {
        setEditingReminder(null);
        setSelectedDate(dateObj);
        setRemTitle('');
        setRemDate(format(dateObj, 'yyyy-MM-dd'));
        setRemTime('10:00');
        setRemCategory('Deadline');
        setRemDesc('');
        setIsReminderModalOpen(true);
    };

    const openEditReminderModal = (ev) => {
        setEditingReminder(ev);
        const dt = parseISO(ev.startDate);
        setRemTitle(ev.title);
        setRemDate(format(dt, 'yyyy-MM-dd'));
        setRemTime(format(dt, 'HH:mm'));
        setRemCategory(ev.category || 'Deadline');
        setRemDesc(ev.description || '');
        setIsReminderModalOpen(true);
    };

    const handleSaveReminder = async (e) => {
        e.preventDefault();
        if (!remTitle.trim()) return;

        const startISO = new Date(`${remDate}T${remTime}:00`).toISOString();
        const endISO = new Date(new Date(`${remDate}T${remTime}:00`).getTime() + 60 * 60 * 1000).toISOString();

        const payload = {
            title: remTitle.trim(),
            description: remDesc,
            startDate: startISO,
            endDate: endISO,
            category: remCategory
        };

        try {
            if (editingReminder) {
                await axios.put(`${API_BASE_URL}/api/events/${editingReminder._id}`, payload, { headers });
                toast.success('Reminder updated!');
            } else {
                await axios.post(`${API_BASE_URL}/api/events`, payload, { headers });
                toast.success('Reminder added to calendar!');
            }
            setIsReminderModalOpen(false);
            fetchDashboardData();
        } catch {
            toast.error('Failed to save reminder.');
        }
    };

    const handleDeleteReminder = async (id) => {
        if (!window.confirm('Remove this reminder?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/events/${id}`, { headers });
            toast.success('Reminder deleted.');
            setIsReminderModalOpen(false);
            fetchDashboardData();
        } catch {
            toast.error('Failed to delete reminder.');
        }
    };

    // Smart Onboarding Steps for New Users
    const onboardingSteps = [];
    if (friends.length === 0) {
        onboardingSteps.push({
            icon: '🤝',
            title: 'Find Your People',
            desc: 'Connect with classmates by roll number and make it easier to study together.',
            btnText: 'Find Friends',
            accent: '#4f46e5',
            action: () => navigate('/chat')
        });
    }
    if (chats.filter((c) => c.isGroupChat).length === 0) {
        onboardingSteps.push({
            icon: '💬',
            title: 'Join the Conversation',
            desc: 'Create or join study group chats where ideas, questions, and resources come together.',
            btnText: 'Explore Groups',
            accent: '#0ea5e9',
            action: () => navigate('/chat')
        });
    }
    if (recentNotes.length === 0) {
        onboardingSteps.push({
            icon: '📓',
            title: 'Make Your Next Move',
            desc: 'Organize your thoughts on customizable notebook paper and keep your academic goals within reach.',
            btnText: 'Open Notebook',
            accent: '#10b981',
            action: () => navigate('/notes')
        });
    }

    const score = profileData?.rewardBalance ?? user?.rewardBalance ?? 0;

    return (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.75rem 1.5rem 4rem 1.5rem' }}>

            {/* =========================================================
                TOP HERO BANNER (Clean Sans-Serif & Theme-Consistent)
               ========================================================= */}
            <div className="mindora-hero-banner">
                <div>
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'var(--hero-badge-bg)',
                            color: 'var(--hero-badge-text)',
                            padding: '0.3rem 0.85rem',
                            borderRadius: '999px',
                            fontSize: '0.76rem',
                            fontWeight: '800',
                            marginBottom: '0.65rem'
                        }}
                    >
                        <span>🎓</span> Roll No: {profileData?.rollNumber || user?.rollNumber || 'Student'} • ⭐ {score} Reward Score
                    </div>
                    <h1
                        className="mindora-hero-title"
                        style={{
                            fontSize: 'clamp(1.75rem, 3vw, 2.35rem)',
                            margin: '0 0 0.4rem 0',
                            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                            fontWeight: '800',
                            letterSpacing: '-0.025em'
                        }}
                    >
                        Welcome back, {profileData?.name || user?.name || 'Scholar'}!
                    </h1>
                    <p style={{ color: 'var(--hero-sub-color)', fontSize: '0.96rem', fontWeight: '500', maxWidth: '600px', margin: 0 }}>
                        Your personal campus command center — jump straight into your pinned conversations, jot down quick notes, and stay ahead of upcoming deadlines.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setIsQuickNoteOpen(true)}
                        style={{
                            background: 'var(--nav-active-bg)',
                            color: 'var(--nav-active-text)',
                            border: '2px solid var(--border-ink)',
                            padding: '0.75rem 1.35rem',
                            borderRadius: '999px',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem'
                        }}
                    >
                        <span>📓</span> Quick Notes Popup
                    </button>
                    <Link to="/resources" className="pink-pill-btn">
                        + Share Resource (+10 ⭐)
                    </Link>
                </div>
            </div>

            {/* =========================================================
                SECTION A: PERMANENT 4-SLOT QUICK CHAT BAR
               ========================================================= */}
            <div className="mindora-card" style={{ padding: '1.35rem 1.5rem', marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>⚡</span>
                        <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                            Quick Chat Shortcuts
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                            • Pin up to 4 friends for instant 1-click messaging
                        </span>
                    </div>
                    <Link to="/chat" style={{ fontSize: '0.84rem', fontWeight: '700', color: '#6366f1', textDecoration: 'none' }}>
                        Open Full Chat →
                    </Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    {quickSlots.map((slotFriend, idx) => {
                        const slotAvatar = getAvatarUrl(slotFriend?.profilePicture);
                        return (
                            <div
                                key={idx}
                                onClick={() => {
                                    if (slotFriend) {
                                        navigate('/chat', { state: { friendId: slotFriend._id } });
                                    } else {
                                        setActiveSlotIndex(idx);
                                    }
                                }}
                                style={{
                                    padding: '0.9rem 1rem',
                                    borderRadius: '14px',
                                    border: slotFriend ? '2px solid var(--border-strong)' : '2px dashed var(--border-strong)',
                                    background: 'var(--bg-elevated)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.18s ease'
                                }}
                            >
                                {slotFriend ? (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                            {slotAvatar ? (
                                                <img
                                                    src={slotAvatar}
                                                    alt={slotFriend.name}
                                                    style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #f59e0b', flexShrink: 0 }}
                                                />
                                            ) : (
                                                <div style={{ position: 'relative', width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem', flexShrink: 0 }}>
                                                    {slotFriend.name?.charAt(0).toUpperCase()}
                                                    <span style={{ position: 'absolute', right: 0, bottom: 0, width: '11px', height: '11px', borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg-surface)' }} />
                                                </div>
                                            )}
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ fontWeight: '800', fontSize: '0.92rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {slotFriend.name}
                                                </div>
                                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                                    Roll #{slotFriend.rollNumber || 'N/A'} • Chat →
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setActiveSlotIndex(idx); }}
                                                title="Replace friend"
                                                style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}
                                            >
                                                ↻
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleClearSlot(idx, e)}
                                                title="Remove shortcut"
                                                style={{ background: 'rgba(239, 68, 68, 0.14)', color: '#ef4444', border: 'none', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800' }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: '700' }}>
                                            +
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                                Slot #{idx + 1} Empty
                                            </div>
                                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                                Click to pin a friend
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* =========================================================
                MAIN TWO-COLUMN WORKSPACE: ACTIVITY/ONBOARDING + MINI CALENDAR
               ========================================================= */}
            <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '1.75rem', alignItems: 'start' }}>

                {/* LEFT COLUMN: NOTIFICATIONS, ONBOARDING & RECENT NOTES/RESOURCES */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

                    {/* C. Real Notifications & Activity Feed */}
                    <div className="mindora-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.2rem' }}>🔔</span>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                    Notifications & Live Activity
                                </h3>
                            </div>
                            {notifications.length > 0 && (
                                <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.74rem', fontWeight: '800' }}>
                                    {notifications.filter((n) => !readNotifIds.includes(n.id)).length} Unread
                                </span>
                            )}
                        </div>

                        {notifications.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                {notifications.map((notif) => {
                                    const isUnread = !readNotifIds.includes(notif.id);
                                    return (
                                        <div
                                            key={notif.id}
                                            onClick={() => {
                                                markNotifRead(notif.id);
                                                notif.onClick();
                                            }}
                                            style={{
                                                padding: '0.85rem 1rem',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-light)',
                                                borderLeft: `4px solid ${notif.accent}`,
                                                background: isUnread ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '0.75rem'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                                <span style={{ fontSize: '1.35rem' }}>{notif.icon}</span>
                                                <div style={{ overflow: 'hidden' }}>
                                                    <div style={{ fontWeight: isUnread ? '800' : '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                        {notif.title}
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {notif.subtitle}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>{notif.time}</span>
                                                {isUnread && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff2e7e' }} />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                                You are all caught up! New friend requests, group messages, and shared resources will appear here automatically.
                            </div>
                        )}

                        {/* Smart Onboarding Cards for New Users */}
                        {onboardingSteps.length > 0 && (
                            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
                                <div style={{ fontSize: '0.76rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                    Recommended Next Steps for Your Workspace
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
                                    {onboardingSteps.map((step, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                background: 'var(--bg-elevated)',
                                                borderRadius: '12px',
                                                padding: '1.1rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                gap: '0.85rem',
                                                border: '1px solid var(--border-light)',
                                                borderTop: `3px solid ${step.accent}`
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>{step.icon}</div>
                                                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                    {step.title}
                                                </h4>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                                                    {step.desc}
                                                </p>
                                            </div>
                                            <button
                                                onClick={step.action}
                                                style={{
                                                    background: 'var(--nav-active-bg)',
                                                    color: 'var(--nav-active-text)',
                                                    border: 'none',
                                                    padding: '0.45rem 0.9rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.78rem',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    alignSelf: 'flex-start'
                                                }}
                                            >
                                                {step.btnText} →
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* E. Recent Notebook Pages & Shared Resources Split Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>

                        {/* Recent Notebook Pages */}
                        <div className="mindora-card" style={{ padding: '1.35rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>📓 Recent Notebook Pages</h3>
                                <Link to="/notes" style={{ fontSize: '0.78rem', fontWeight: '700', color: '#6366f1', textDecoration: 'none' }}>Notebook →</Link>
                            </div>
                            {recentNotes.length === 0 ? (
                                <div style={{ padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px dashed var(--border-strong)', textAlign: 'center' }}>
                                    <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                        Your digital notebook is ready for your first lecture page.
                                    </p>
                                    <button onClick={() => setIsQuickNoteOpen(true)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '6px', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}>
                                        + Write Quick Note
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {recentNotes.slice(0, 3).map((n) => (
                                        <div
                                            key={n._id}
                                            onClick={() => navigate('/notes', { state: { openNoteId: n._id } })}
                                            style={{
                                                padding: '0.75rem 0.9rem',
                                                borderRadius: '10px',
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-light)',
                                                borderLeft: '4px solid #10b981',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{n.title}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                                {n.folder || 'General'} • Edited {new Date(n.updatedAt || n.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Study Materials */}
                        <div className="mindora-card" style={{ padding: '1.35rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>📚 Recent Study Files</h3>
                                <Link to="/resources" style={{ fontSize: '0.78rem', fontWeight: '700', color: '#6366f1', textDecoration: 'none' }}>Vault →</Link>
                            </div>
                            {[...(resourceSummary.groupNotes || []), ...(resourceSummary.friendsNotes || [])].length === 0 ? (
                                <div style={{ padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px dashed var(--border-strong)', textAlign: 'center' }}>
                                    <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                        Share or download study PDFs to populate your vault.
                                    </p>
                                    <Link to="/resources" style={{ display: 'inline-block', background: '#4f46e5', color: 'white', textDecoration: 'none', padding: '0.45rem 0.9rem', borderRadius: '6px', fontSize: '0.76rem', fontWeight: '700' }}>
                                        Explore Resources
                                    </Link>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {[...(resourceSummary.groupNotes || []), ...(resourceSummary.friendsNotes || [])].slice(0, 3).map((res) => (
                                        <div
                                            key={res._id}
                                            onClick={() => navigate('/resources')}
                                            style={{ padding: '0.75rem 0.9rem', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderLeft: '4px solid #0ea5e9', cursor: 'pointer' }}
                                        >
                                            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{res.title}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                {res.subject} • By {res.uploader?.name || 'Classmate'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* RIGHT COLUMN: D. COMPACT MINI CALENDAR & REMINDERS */}
                <div className="mindora-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                📅 Mini Calendar & Reminders
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Click any date to schedule a reminder
                            </span>
                        </div>
                        <button
                            onClick={() => openNewReminderModal(selectedDate)}
                            style={{
                                background: 'var(--nav-active-bg)',
                                color: 'var(--nav-active-text)',
                                border: 'none',
                                padding: '0.42rem 0.9rem',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            + Add
                        </button>
                    </div>

                    {/* Month Navigation Header (Theme-Aware) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', padding: '0.5rem 0.75rem', borderRadius: '10px', marginBottom: '0.75rem' }}>
                        <button onClick={() => setCalMonth(subMonths(calMonth, 1))} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: '800' }}>‹</button>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{format(calMonth, 'MMMM yyyy')}</strong>
                        <button onClick={() => setCalMonth(addMonths(calMonth, 1))} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: '800' }}>›</button>
                    </div>

                    {/* Compact 7-Column Calendar Grid (Readable in Both Light & Dark Themes) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', gap: '0.25rem', marginBottom: '1.25rem' }}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                            <div key={d} style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', padding: '0.25rem 0' }}>{d}</div>
                        ))}
                        {calDays.map((day) => {
                            const isToday = isSameDay(day, new Date());
                            const isSelected = isSameDay(day, selectedDate);
                            const inMonth = isSameMonth(day, calMonth);
                            const dayReminders = events.filter((ev) => isSameDay(parseISO(ev.startDate), day));

                            return (
                                <button
                                    key={day.toString()}
                                    onClick={() => openNewReminderModal(day)}
                                    style={{
                                        height: '36px',
                                        borderRadius: '8px',
                                        border: isSelected ? '2px solid #6366f1' : 'none',
                                        background: isToday
                                            ? '#f59e0b'
                                            : dayReminders.length > 0
                                            ? 'var(--bg-subtle)'
                                            : 'transparent',
                                        color: isToday
                                            ? '#0f172a'
                                            : inMonth
                                            ? 'var(--text-primary)'
                                            : 'var(--text-muted)',
                                        opacity: inMonth ? 1 : 0.4,
                                        fontWeight: isToday || dayReminders.length > 0 ? '800' : '600',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <span>{format(day, 'd')}</span>
                                    {dayReminders.length > 0 && (
                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isToday ? '#0f172a' : '#e11d48', marginTop: '1px' }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Upcoming Reminders List */}
                    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Upcoming Reminders</strong>
                            <Link to="/calendar" style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: '700', textDecoration: 'none' }}>Full Calendar →</Link>
                        </div>

                        {upcomingReminders.length === 0 ? (
                            <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', padding: '1.15rem', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                                <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                    Your next important date deserves a reminder.
                                </div>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', lineHeight: '1.45' }}>
                                    Add an exam, deadline, or event so nothing important slips through.
                                </p>
                                <button
                                    onClick={() => openNewReminderModal(new Date())}
                                    style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Add Reminder
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                {upcomingReminders.map((rem) => (
                                    <div
                                        key={rem._id}
                                        onClick={() => openEditReminderModal(rem)}
                                        style={{
                                            padding: '0.65rem 0.85rem',
                                            borderRadius: '10px',
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-light)',
                                            borderLeft: '4px solid #4f46e5',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{rem.title}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                {format(parseISO(rem.startDate), 'MMM d • h:mm a')} • {rem.category}
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: '700' }}>Edit</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* MODAL 1: FRIEND SELECTOR FOR QUICK-CHAT SLOTS */}
            {activeSlotIndex !== null && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="mindora-card" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                Pin Friend to Quick Chat Slot #{activeSlotIndex + 1}
                            </h3>
                            <button onClick={() => setActiveSlotIndex(null)} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>✕</button>
                        </div>

                        {friends.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                    You haven&apos;t added any friends yet. Connect with classmates by roll number first!
                                </p>
                                <button onClick={() => navigate('/chat')} className="indigo-pill-btn" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                                    Find & Add Friends →
                                </button>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    placeholder="Search your friends by name or roll number..."
                                    value={friendSearchQuery}
                                    onChange={(e) => setFriendSearchQuery(e.target.value)}
                                    className="mindora-input"
                                    style={{ marginBottom: '0.85rem' }}
                                />
                                <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                    {friends
                                        .filter((f) =>
                                            f.name?.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
                                            f.rollNumber?.toLowerCase().includes(friendSearchQuery.toLowerCase())
                                        )
                                        .map((f) => (
                                            <div
                                                key={f._id}
                                                onClick={() => handleAssignFriendToSlot(f)}
                                                style={{ padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'var(--bg-elevated)' }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{f.name}</div>
                                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Roll No: {f.rollNumber || 'N/A'}</div>
                                                </div>
                                                <span style={{ background: '#4f46e5', color: 'white', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>Pin +</span>
                                            </div>
                                        ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL 2: ADD / EDIT REMINDER MODAL */}
            {isReminderModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="mindora-card" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                            {editingReminder ? 'Edit Reminder' : 'Add Academic Reminder'}
                        </h3>
                        <form onSubmit={handleSaveReminder} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Title *</label>
                                <input type="text" required value={remTitle} onChange={(e) => setRemTitle(e.target.value)} placeholder="e.g., DBMS Assignment Submission" className="mindora-input" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Date *</label>
                                    <input type="date" required value={remDate} onChange={(e) => setRemDate(e.target.value)} className="mindora-input" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Time *</label>
                                    <input type="time" required value={remTime} onChange={(e) => setRemTime(e.target.value)} className="mindora-input" />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Type</label>
                                <select value={remCategory} onChange={(e) => setRemCategory(e.target.value)} className="mindora-input">
                                    <option value="Deadline">Deadline</option>
                                    <option value="Exam">Exam</option>
                                    <option value="Study Session">Study Session</option>
                                    <option value="Group Meeting">Group Meeting</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Optional Notes</label>
                                <textarea rows="2" value={remDesc} onChange={(e) => setRemDesc(e.target.value)} placeholder="Room number, syllabus topics, or links..." className="mindora-input" />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                                {editingReminder ? (
                                    <button type="button" onClick={() => handleDeleteReminder(editingReminder._id)} style={{ background: 'rgba(239, 68, 68, 0.14)', color: '#ef4444', border: 'none', padding: '0.55rem 0.95rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                                        Delete
                                    </button>
                                ) : <div />}
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button type="button" onClick={() => setIsReminderModalOpen(false)} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: '0.55rem 0.95rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.55rem 1.2rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Save Reminder</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* B. FLOATING QUICK NOTES NOTEBOOK POPUP */}
            <QuickNotesWidget
                isOpen={isQuickNoteOpen}
                onClose={() => setIsQuickNoteOpen(false)}
                onSaved={fetchDashboardData}
            />
        </div>
    );
}