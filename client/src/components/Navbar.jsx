import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import useAuthStore from '../store/authStore';
import { API_BASE_URL } from '../api';

export const getAvatarUrl = (profilePicture) => {
    if (!profilePicture) return null;
    if (profilePicture.startsWith('http')) return profilePicture;
    return `${API_BASE_URL}/uploads/${profilePicture}`;
};

export default function Navbar() {
    const { token, user, login, logout, setTheme } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [floatingNotifs, setFloatingNotifs] = useState([]);
    const dropdownRef = useRef(null);

    const currentUserId = user?._id || user?.id;

    // Sync latest user profile & saved theme preference
    useEffect(() => {
        if (!token) return;
        axios
            .get(`${API_BASE_URL}/api/users/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then((res) => {
                if (res.data) {
                    const resolvedTheme = res.data.themePreference === 'dark' ? 'dark' : 'light';
                    login({ ...user, ...res.data, themePreference: resolvedTheme }, token);
                    setTheme(resolvedTheme);
                }
            })
            .catch(() => {});
    }, [token]);

    // Close Account Dropdown on outside click or Escape key
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        setIsDropdownOpen(false);
    }, [location.pathname]);

    // Global Real-Time Floating Message Notification Listener
    useEffect(() => {
        if (!token || !currentUserId) return;

        const notifSocket = io(API_BASE_URL, { auth: { token } });

        notifSocket.on('message_received', (newMsg) => {
            const senderId = String(newMsg?.sender?._id || newMsg?.sender);
            if (senderId === String(currentUserId)) return;

            const incomingChatId = String(newMsg?.conversation?._id || newMsg?.conversation);
            const activeOpenChatId = window.__MINDORA_ACTIVE_CHAT_ID__;

            if (location.pathname === '/chat' && String(activeOpenChatId) === incomingChatId) {
                return;
            }

            const isGroup = Boolean(newMsg?.conversation?.isGroupChat);
            const notifTitle = isGroup
                ? newMsg.conversation.chatName || 'Study Group'
                : newMsg.sender?.name || 'Classmate';
            const notifPreview = isGroup
                ? `${newMsg.sender?.name || 'Member'}: ${newMsg.content}`
                : newMsg.content;

            const notifItem = {
                id: `${newMsg._id || Date.now()}-${Math.random()}`,
                chatId: incomingChatId,
                isGroup,
                title: notifTitle,
                preview: notifPreview,
                avatar: getAvatarUrl(newMsg.sender?.profilePicture),
                initial: (newMsg.sender?.name || 'M').charAt(0).toUpperCase(),
                time: 'Just now'
            };

            setFloatingNotifs((prev) => [notifItem, ...prev].slice(0, 3));

            setTimeout(() => {
                setFloatingNotifs((prev) => prev.filter((item) => item.id !== notifItem.id));
            }, 6000);
        });

        return () => notifSocket.disconnect();
    }, [token, currentUserId, location.pathname]);

    if (['/', '/login', '/register'].includes(location.pathname)) {
        return null;
    }

    const handleLogout = () => {
        setIsDropdownOpen(false);
        logout();
        navigate('/');
    };

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: '⚡' },
        { path: '/chat', label: 'Chat', icon: '💬' },
        { path: '/resources', label: 'Resources', icon: '📚' },
        { path: '/notes', label: 'Notes', icon: '📝' },
        { path: '/calendar', label: 'Calendar', icon: '📅' },
        { path: '/profile', label: 'Profile', icon: '🎓' }
    ];

    const avatarUrl = getAvatarUrl(user?.profilePicture);

    return (
        <>
            <header
                style={{
                    background: 'var(--nav-bg)',
                    backdropFilter: 'blur(14px)',
                    borderBottom: '1px solid var(--nav-border)',
                    padding: '0.65rem 1.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 200,
                    color: 'var(--text-primary)',
                    transition: 'background 0.2s ease, border-color 0.2s ease'
                }}
            >
                {/* Brand & Primary Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                            style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '9px',
                                background: 'linear-gradient(135deg, #f59e0b, #eab308)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#0f172a',
                                fontWeight: '900',
                                fontSize: '1.05rem'
                            }}
                        >
                            M
                        </div>
                        <span style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                            Mindora
                        </span>
                    </Link>

                    {token && (
                        <nav
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                flexWrap: 'wrap',
                                background: 'var(--nav-pill-bg)',
                                padding: '0.28rem',
                                borderRadius: '999px',
                                border: '1px solid var(--border-light)'
                            }}
                        >
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        style={{
                                            textDecoration: 'none',
                                            color: isActive ? 'var(--nav-active-text)' : 'var(--nav-link-color)',
                                            background: isActive ? 'var(--nav-active-bg)' : 'transparent',
                                            padding: '0.4rem 0.9rem',
                                            borderRadius: '999px',
                                            fontWeight: isActive ? '800' : '600',
                                            fontSize: '0.84rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <span>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    )}
                </div>

                {/* Top-Right Compact Account Menu (Theme-Aware) */}
                {token && (
                    <div ref={dropdownRef} style={{ position: 'relative' }}>
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen((prev) => !prev)}
                            aria-expanded={isDropdownOpen}
                            aria-haspopup="true"
                            style={{
                                background: 'var(--bg-elevated)',
                                border: isDropdownOpen ? '1.5px solid #f59e0b' : '1.5px solid var(--border-strong)',
                                borderRadius: '999px',
                                padding: '0.3rem 0.75rem 0.3rem 0.35rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                transition: 'all 0.18s ease'
                            }}
                        >
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={user?.name || 'Profile'}
                                    style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #f59e0b' }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                                        color: '#0f172a',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: '800',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    {(user?.name || 'S').charAt(0).toUpperCase()}
                                </div>
                            )}

                            <span style={{ fontSize: '0.86rem', fontWeight: '700', maxWidth: '130px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user?.name || 'Student'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease' }}>
                                ▼
                            </span>
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div
                                className="account-dropdown-anim"
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 'calc(100% + 10px)',
                                    width: '235px',
                                    background: 'var(--bg-surface)',
                                    border: '1.5px solid var(--border-strong)',
                                    borderRadius: '14px',
                                    padding: '0.5rem',
                                    boxShadow: 'var(--shadow-lg)',
                                    zIndex: 300
                                }}
                            >
                                <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border-light)', marginBottom: '0.35rem' }}>
                                    <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user?.name || 'Student'}</div>
                                    <div style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: '700', marginTop: '0.1rem' }}>
                                        Roll No: {user?.rollNumber || 'Verified'}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => navigate('/profile')}
                                    style={{
                                        width: '100%',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-primary)',
                                        padding: '0.6rem 0.75rem',
                                        borderRadius: '8px',
                                        textAlign: 'left',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <span>👤</span> My Profile
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate('/profile', { state: { openTab: 'settings' } })}
                                    style={{
                                        width: '100%',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-primary)',
                                        padding: '0.6rem 0.75rem',
                                        borderRadius: '8px',
                                        textAlign: 'left',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <span>⚙️</span> Settings & Theme
                                </button>

                                <div style={{ height: '1px', background: 'var(--border-light)', margin: '0.35rem 0' }} />

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    style={{
                                        width: '100%',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#ef4444',
                                        padding: '0.6rem 0.75rem',
                                        borderRadius: '8px',
                                        textAlign: 'left',
                                        fontSize: '0.85rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <span>🚪</span> Log Out
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* GLOBAL FLOATING INCOMING MESSAGE NOTIFICATIONS */}
            {floatingNotifs.length > 0 && (
                <div
                    style={{
                        position: 'fixed',
                        top: '68px',
                        right: '1.25rem',
                        zIndex: 250,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                        width: 'min(340px, calc(100vw - 2.5rem))'
                    }}
                >
                    {floatingNotifs.map((item) => (
                        <div
                            key={item.id}
                            className="floating-msg-toast"
                            onClick={() => {
                                setFloatingNotifs((prev) => prev.filter((n) => n.id !== item.id));
                                navigate('/chat', { state: { chatId: item.chatId } });
                            }}
                            style={{
                                background: 'var(--bg-surface)',
                                border: '1.5px solid #f59e0b',
                                borderRadius: '14px',
                                padding: '0.85rem 1rem',
                                color: 'var(--text-primary)',
                                boxShadow: 'var(--shadow-lg)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                {item.avatar ? (
                                    <img
                                        src={item.avatar}
                                        alt={item.title}
                                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #f59e0b', flexShrink: 0 }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: '#fde047',
                                            color: '#0f172a',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '900',
                                            fontSize: '1rem',
                                            flexShrink: 0
                                        }}
                                    >
                                        {item.isGroup ? '👥' : item.initial}
                                    </div>
                                )}
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <strong style={{ fontSize: '0.88rem', color: '#d97706', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.title}
                                        </strong>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>• {item.time}</span>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-secondary)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            marginTop: '0.15rem'
                                        }}
                                    >
                                        &ldquo;{item.preview}&rdquo;
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFloatingNotifs((prev) => prev.filter((n) => n.id !== item.id));
                                }}
                                style={{
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-muted)',
                                    border: '1px solid var(--border-light)',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    fontSize: '0.72rem',
                                    flexShrink: 0
                                }}
                                title="Dismiss"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}