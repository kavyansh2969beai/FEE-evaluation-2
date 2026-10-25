import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { getAvatarUrl } from '../components/Navbar';
import { API_BASE_URL } from '../api';

export default function Profile() {
    const { token, user, login, theme, setTheme } = useAuthStore();
    const location = useLocation();
    const fileInputRef = useRef(null);

    const [activeSection, setActiveSection] = useState('overview'); // 'overview', 'edit', 'settings'
    const [profile, setProfile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    // Editable Profile Fields
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [department, setDepartment] = useState('Computer Science & Engineering');
    const [semester, setSemester] = useState('Undergraduate');
    const [skills, setSkills] = useState([]);
    const [skillInput, setSkillInput] = useState('');
    const [themePreference, setThemePreference] = useState(theme || 'light');

    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        if (location.state?.openTab === 'settings') {
            setActiveSection('settings');
        }
    }, [location.state]);

    const fetchProfile = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/users/profile`, { headers });
            const data = res.data;
            setProfile(data);
            setName(data.name || '');
            setBio(data.bio || '');
            setDepartment(data.department || 'Computer Science & Engineering');
            setSemester(data.semester || 'Undergraduate');
            setSkills(data.skills || []);
            const resolvedTheme = data.themePreference === 'dark' ? 'dark' : 'light';
            setThemePreference(resolvedTheme);
            login({ ...user, ...data, themePreference: resolvedTheme }, token);
        } catch {
            toast.error('Failed to load profile.');
        }
    };

    useEffect(() => {
        if (token) fetchProfile();
    }, [token]);

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            return toast.error('Please upload a JPG, PNG, WEBP, or GIF image.');
        }
        if (file.size > 5 * 1024 * 1024) {
            return toast.error('Image must be smaller than 5MB.');
        }

        const formData = new FormData();
        formData.append('avatar', file);

        setIsUploadingAvatar(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/users/profile/avatar`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            const updatedPic = res.data.profilePicture;
            setProfile((prev) => ({ ...prev, profilePicture: updatedPic }));
            login({ ...user, profilePicture: updatedPic }, token);
            toast.success('Profile picture updated!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to upload image.');
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAvatar = async () => {
        try {
            await axios.delete(`${API_BASE_URL}/api/users/profile/avatar`, { headers });
            setProfile((prev) => ({ ...prev, profilePicture: '' }));
            login({ ...user, profilePicture: '' }, token);
            toast.success('Profile picture removed.');
        } catch {
            toast.error('Failed to remove profile picture.');
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await axios.put(
                `${API_BASE_URL}/api/users/profile`,
                { name, bio, department, semester, skills, themePreference },
                { headers }
            );
            setProfile((prev) => ({ ...prev, ...res.data }));
            login({ ...user, ...res.data }, token);
            toast.success('Profile saved successfully!');
            setActiveSection('overview');
        } catch {
            toast.error('Failed to save profile changes.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleThemeSelect = async (selectedTheme) => {
        const validTheme = selectedTheme === 'dark' ? 'dark' : 'light';
        setThemePreference(validTheme);
        setTheme(validTheme);
        try {
            await axios.put(`${API_BASE_URL}/api/users/profile`, { themePreference: validTheme }, { headers });
            toast.success(`${validTheme === 'dark' ? 'Dark Theme' : 'Light Theme'} activated!`);
        } catch {
            toast.error('Theme applied locally, but could not sync to server.');
        }
    };

    const handleAddSkill = (e) => {
        e.preventDefault();
        const trimmed = skillInput.trim();
        if (!trimmed || skills.includes(trimmed)) return;
        if (skills.length >= 12) return toast.error('Up to 12 skills can be added.');
        setSkills([...skills, trimmed]);
        setSkillInput('');
    };

    const handleRemoveSkill = (skillToRemove) => {
        setSkills(skills.filter((s) => s !== skillToRemove));
    };

    const completionChecks = [
        Boolean(profile?.name),
        Boolean(profile?.profilePicture),
        Boolean(profile?.bio && profile.bio.trim().length > 10),
        Boolean(skills.length > 0),
        Boolean((profile?.stats?.friendsCount || 0) > 0 || (profile?.stats?.resourcesCount || 0) > 0)
    ];
    const completionPercent = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);

    const avatarUrl = getAvatarUrl(profile?.profilePicture);
    const score = profile?.rewardBalance || 0;

    return (
        <div style={{ maxWidth: '1220px', margin: '0 auto', padding: '1.75rem 1.5rem 4rem 1.5rem' }}>

            {/* =========================================================
                1. PROFILE HEADER BANNER (Theme-Aware Text & Buttons)
               ========================================================= */}
            <div className="mindora-hero-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={profile?.name || 'Student'}
                                style={{
                                    width: '96px',
                                    height: '96px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '3px solid var(--border-ink)',
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.25)'
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: '96px',
                                    height: '96px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                    color: '#fde047',
                                    border: '3px solid var(--border-ink)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2.4rem',
                                    fontWeight: '900'
                                }}
                            >
                                {(profile?.name || user?.name || 'S').charAt(0).toUpperCase()}
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingAvatar}
                            title="Upload or change profile picture"
                            style={{
                                position: 'absolute',
                                right: '-2px',
                                bottom: '-2px',
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: '#f59e0b',
                                color: '#0f172a',
                                border: '2px solid #0f172a',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.95rem',
                                fontWeight: '800'
                            }}
                        >
                            📷
                        </button>
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
                            <span style={{ background: 'var(--hero-badge-bg)', color: 'var(--hero-badge-text)', padding: '0.28rem 0.85rem', borderRadius: '999px', fontSize: '0.76rem', fontWeight: '800' }}>
                                🎓 Roll No: {profile?.rollNumber || user?.rollNumber || 'N/A'}
                            </span>
                            <span style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1.5px solid var(--border-strong)', padding: '0.26rem 0.85rem', borderRadius: '999px', fontSize: '0.76rem', fontWeight: '800' }}>
                                ⭐ {score} Reward Score
                            </span>
                        </div>

                        <h1 className="mindora-hero-title" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.35rem)', margin: '0 0 0.25rem 0' }}>
                            {profile?.name || user?.name || 'Student Profile'}
                        </h1>
                        <p style={{ margin: 0, color: 'var(--hero-sub-color)', fontSize: '0.92rem', fontWeight: '600' }}>
                            {department} • {semester} • {profile?.email || user?.email}
                        </p>
                    </div>
                </div>

                {/* Section Navigation Buttons */}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {[
                        { id: 'overview', label: 'Profile Overview' },
                        { id: 'edit', label: '✏️ Edit Profile' },
                        { id: 'settings', label: '⚙️ Settings & Theme' }
                    ].map((btn) => {
                        const isActive = activeSection === btn.id;
                        return (
                            <button
                                key={btn.id}
                                type="button"
                                onClick={() => setActiveSection(btn.id)}
                                style={{
                                    background: isActive ? 'var(--nav-active-bg)' : 'var(--bg-surface)',
                                    color: isActive ? 'var(--nav-active-text)' : 'var(--text-primary)',
                                    border: '2px solid var(--border-strong)',
                                    padding: '0.65rem 1.2rem',
                                    borderRadius: '999px',
                                    fontWeight: '800',
                                    fontSize: '0.86rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {btn.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* =========================================================
                2. ACTIVITY OVERVIEW STATS ROW
               ========================================================= */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.15rem', marginBottom: '2rem' }}>
                {[
                    { label: 'FRIENDS CONNECTED', value: profile?.stats?.friendsCount || 0, sub: 'Classmates in your network', icon: '🤝', accent: '#6366f1', link: '/chat' },
                    { label: 'STUDY GROUPS', value: profile?.stats?.groupsCount || 0, sub: 'Active group rooms joined', icon: '👥', accent: '#0ea5e9', link: '/chat' },
                    { label: 'NOTEBOOK PAGES', value: profile?.stats?.notesCount || 0, sub: 'Personal notes created', icon: '📓', accent: '#10b981', link: '/notes' },
                    { label: 'RESOURCES SHARED', value: profile?.stats?.resourcesCount || 0, sub: '+10 pts earned per upload', icon: '📚', accent: '#f59e0b', link: '/resources' }
                ].map((stat, i) => (
                    <Link
                        key={i}
                        to={stat.link}
                        className="mindora-card mindora-card-hover"
                        style={{ padding: '1.35rem', textDecoration: 'none', color: 'inherit', borderLeft: `4px solid ${stat.accent}` }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: '800', color: 'var(--text-muted)' }}>{stat.label}</span>
                            <span style={{ fontSize: '1.3rem' }}>{stat.icon}</span>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-primary)' }}>{stat.value}</div>
                        <div style={{ fontSize: '0.76rem', color: stat.accent, fontWeight: '700', marginTop: '0.2rem' }}>{stat.sub} →</div>
                    </Link>
                ))}
            </div>

            {/* =========================================================
                TAB 1: PROFILE OVERVIEW
               ========================================================= */}
            {activeSection === 'overview' && (
                <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.75rem', alignItems: 'start' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="mindora-card" style={{ padding: '1.65rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>About Me</h3>
                                <button
                                    type="button"
                                    onClick={() => setActiveSection('edit')}
                                    style={{
                                        background: 'var(--bg-elevated)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-strong)',
                                        padding: '0.38rem 0.85rem',
                                        borderRadius: '8px',
                                        fontSize: '0.78rem',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Edit Bio
                                </button>
                            </div>

                            {profile?.bio && profile.bio.trim() ? (
                                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.65', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                                    {profile.bio}
                                </p>
                            ) : (
                                <div style={{ padding: '1.35rem', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px dashed var(--border-strong)' }}>
                                    <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.92rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                        &ldquo;Tell your story. Share your interests, skills, and what you&apos;re working toward.&rdquo;
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection('edit')}
                                        style={{
                                            background: 'var(--nav-active-bg)',
                                            color: 'var(--nav-active-text)',
                                            border: 'none',
                                            padding: '0.45rem 0.95rem',
                                            borderRadius: '8px',
                                            fontSize: '0.78rem',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        + Write Introduction
                                    </button>
                                </div>
                            )}

                            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                                    Academic Skills & Interests
                                </div>
                                {skills.length === 0 ? (
                                    <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                                        No skills added yet. Add languages or subjects in Edit Profile.
                                    </span>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                                        {skills.map((skill, idx) => (
                                            <span
                                                key={idx}
                                                style={{
                                                    background: 'var(--bg-subtle)',
                                                    color: 'var(--text-primary)',
                                                    border: '1px solid var(--border-strong)',
                                                    padding: '0.3rem 0.75rem',
                                                    borderRadius: '999px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '700'
                                                }}
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mindora-card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Profile Completeness</strong>
                                <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#10b981' }}>{completionPercent}%</span>
                            </div>
                            <div style={{ height: '9px', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                                <div style={{ width: `${completionPercent}%`, height: '100%', background: 'linear-gradient(90deg, #4f46e5, #10b981)', transition: 'width 0.3s ease' }} />
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {completionPercent === 100
                                    ? '🌟 Your student profile is 100% complete!'
                                    : 'Upload a profile picture, write your bio, and add skills to complete your campus profile.'}
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Recent Activity Feed */}
                    <div className="mindora-card" style={{ padding: '1.65rem' }}>
                        <h3 style={{ margin: '0 0 1.15rem 0', fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                            Recent Mindora Activity
                        </h3>

                        <div style={{ marginBottom: '1.35rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    📚 Recently Shared Resources
                                </span>
                                <Link to="/resources" style={{ fontSize: '0.76rem', fontWeight: '700', color: '#6366f1', textDecoration: 'none' }}>View All →</Link>
                            </div>
                            {(profile?.recentActivity?.resources || []).length === 0 ? (
                                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>You haven&apos;t uploaded any study resources yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {profile.recentActivity.resources.map((r) => (
                                        <div key={r._id} style={{ padding: '0.65rem 0.85rem', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{r.title}</div>
                                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{r.subject} • ⬇ {r.downloadCount || 0} downloads</div>
                                            </div>
                                            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#10b981' }}>+10 ⭐</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: '1.35rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    👥 Study Groups Joined
                                </span>
                                <Link to="/chat" style={{ fontSize: '0.76rem', fontWeight: '700', color: '#6366f1', textDecoration: 'none' }}>Open Chat →</Link>
                            </div>
                            {(profile?.recentActivity?.groups || []).length === 0 ? (
                                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>Not part of any study groups yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {profile.recentActivity.groups.map((g) => (
                                        <div key={g._id} style={{ padding: '0.65rem 0.85rem', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{g.chatName}</div>
                                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{(g.participants || []).length} members</div>
                                            </div>
                                            <Link to="/chat" state={{ chatId: g._id }} style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6366f1', textDecoration: 'none' }}>Open →</Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    🔒 Your Private Notebook Pages
                                </span>
                                <Link to="/notes" style={{ fontSize: '0.76rem', fontWeight: '700', color: '#6366f1', textDecoration: 'none' }}>Notebook →</Link>
                            </div>
                            {(profile?.recentActivity?.notes || []).length === 0 ? (
                                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>No personal notes saved yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {profile.recentActivity.notes.map((n) => (
                                        <Link
                                            key={n._id}
                                            to="/notes"
                                            state={{ openNoteId: n._id }}
                                            style={{ padding: '0.65rem 0.85rem', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <span style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{n.title}</span>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{n.folder || 'General'}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            )}

            {/* =========================================================
                TAB 2: EDIT PROFILE & PICTURE MANAGEMENT
               ========================================================= */}
            {activeSection === 'edit' && (
                <div className="mindora-card" style={{ padding: '2rem', maxWidth: '760px', margin: '0 auto' }}>
                    <h2 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '1.35rem', fontWeight: '800' }}>Edit Student Profile</h2>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" style={{ width: '68px', height: '68px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-strong)' }} />
                        ) : (
                            <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#0f172a', color: '#fde047', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: '800' }}>
                                {(name || 'S').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '800', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Profile Photo</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>Supported formats: JPG, PNG, WEBP, GIF (Max 5MB)</div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingAvatar}
                                    style={{ background: 'var(--nav-active-bg)', color: 'var(--nav-active-text)', border: 'none', padding: '0.45rem 0.95rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    {isUploadingAvatar ? 'Uploading...' : 'Upload New Photo'}
                                </button>
                                {profile?.profilePicture && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveAvatar}
                                        style={{ background: 'rgba(239, 68, 68, 0.14)', color: '#ef4444', border: 'none', padding: '0.45rem 0.95rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Remove Photo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>Full Name</label>
                                <input type="text" className="mindora-input" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>Department / Specialization</label>
                                <input type="text" className="mindora-input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g., CSE (AI & ML)" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>Academic Year / Semester</label>
                                <input type="text" className="mindora-input" value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="e.g., Semester 4" />
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                <label style={{ fontSize: '0.82rem', fontWeight: '700' }}>About Me (Bio)</label>
                                <span style={{ fontSize: '0.75rem', color: bio.length > 450 ? '#e11d48' : 'var(--text-muted)' }}>
                                    {bio.length} / 500 characters
                                </span>
                            </div>
                            <textarea
                                rows="4"
                                maxLength={500}
                                className="mindora-input"
                                placeholder="Tell your story. Share your interests, skills, and what you're working toward."
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>Skills & Interests</label>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem' }}>
                                <input
                                    type="text"
                                    className="mindora-input"
                                    placeholder="Add a skill (e.g., React, Java, DBMS, Video Editing)..."
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddSkill(e);
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSkill}
                                    style={{ background: 'var(--nav-active-bg)', color: 'var(--nav-active-text)', border: 'none', padding: '0 1.15rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}
                                >
                                    + Add
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                                {skills.map((s, idx) => (
                                    <span key={idx} style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', padding: '0.3rem 0.7rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {s}
                                        <button type="button" onClick={() => handleRemoveSkill(s)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '900' }}>✕</button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button type="button" onClick={() => setActiveSection('overview')} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: '0.7rem 1.35rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button type="submit" disabled={isSaving} className="indigo-pill-btn" style={{ borderRadius: '10px', padding: '0.7rem 1.6rem' }}>
                                {isSaving ? 'Saving...' : 'Save Profile Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* =========================================================
                TAB 3: ACCOUNT SETTINGS & TWO-THEME ENGINE
               ========================================================= */}
            {activeSection === 'settings' && (
                <div className="mindora-card" style={{ padding: '2rem', maxWidth: '820px', margin: '0 auto' }}>
                    <h2 style={{ marginTop: 0, marginBottom: '0.4rem', fontSize: '1.35rem', fontWeight: '800' }}>Appearance & Theme Settings</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
                        Choose how Mindora looks across all your pages, menus, and workspaces. Your preference is saved to your student account automatically.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                        {/* Option 1: Light Theme (Default) */}
                        {(() => {
                            const isLightActive = (theme || themePreference) !== 'dark';
                            return (
                                <div
                                    onClick={() => handleThemeSelect('light')}
                                    style={{
                                        padding: '1.25rem',
                                        borderRadius: '16px',
                                        border: isLightActive ? '2.5px solid #4f46e5' : '1.5px solid var(--border-light)',
                                        background: 'var(--bg-elevated)',
                                        cursor: 'pointer',
                                        transition: 'all 0.18s ease'
                                    }}
                                >
                                    <div style={{ height: '92px', borderRadius: '10px', background: '#f4f6fb', border: '1.5px solid #cbd5e1', padding: '0.6rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div style={{ height: '24px', borderRadius: '6px', background: 'linear-gradient(135deg, #bae6fd 0%, #ecfccb 100%)', border: '1.5px solid #0f172a', display: 'flex', alignItems: 'center', padding: '0 0.5rem', justifyContent: 'space-between' }}>
                                            <span style={{ width: '40px', height: '6px', borderRadius: '999px', background: '#0f172a' }} />
                                            <span style={{ width: '18px', height: '8px', borderRadius: '999px', background: '#ff2e7e' }} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                            <div style={{ height: '36px', borderRadius: '6px', background: '#ffffff', border: '1px solid #e2e8f0' }} />
                                            <div style={{ height: '36px', borderRadius: '6px', background: '#ffffff', border: '1px solid #e2e8f0' }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input type="radio" checked={isLightActive} onChange={() => handleThemeSelect('light')} style={{ accentColor: '#4f46e5', width: '16px', height: '16px', cursor: 'pointer' }} />
                                            <strong style={{ fontSize: '1rem' }}>Light Theme</strong>
                                            <span style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', padding: '0.12rem 0.55rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '800' }}>
                                                Default
                                            </span>
                                        </div>
                                        {isLightActive && <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#4f46e5' }}>✓ Active</span>}
                                    </div>

                                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                        A clean, bright workspace with the default Mindora design.
                                    </p>
                                </div>
                            );
                        })()}

                        {/* Option 2: Dark Theme */}
                        {(() => {
                            const isDarkActive = (theme || themePreference) === 'dark';
                            return (
                                <div
                                    onClick={() => handleThemeSelect('dark')}
                                    style={{
                                        padding: '1.25rem',
                                        borderRadius: '16px',
                                        border: isDarkActive ? '2.5px solid #f59e0b' : '1.5px solid var(--border-light)',
                                        background: 'var(--bg-elevated)',
                                        cursor: 'pointer',
                                        transition: 'all 0.18s ease'
                                    }}
                                >
                                    <div style={{ height: '92px', borderRadius: '10px', backgroundColor: '#0c0c0c', backgroundImage: 'radial-gradient(#2e2e2e 1px, transparent 1px)', backgroundSize: '10px 10px', border: '1.5px solid #3f3f46', padding: '0.6rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div style={{ height: '24px', borderRadius: '6px', background: '#18181b', border: '1px solid #3f3f46', display: 'flex', alignItems: 'center', padding: '0 0.5rem', justifyContent: 'space-between' }}>
                                            <span style={{ width: '40px', height: '6px', borderRadius: '999px', background: '#fde047' }} />
                                            <span style={{ width: '18px', height: '8px', borderRadius: '999px', background: '#f59e0b' }} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                            <div style={{ height: '36px', borderRadius: '6px', background: '#141414', border: '1px solid #27272a' }} />
                                            <div style={{ height: '36px', borderRadius: '6px', background: '#141414', border: '1px solid #27272a' }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input type="radio" checked={isDarkActive} onChange={() => handleThemeSelect('dark')} style={{ accentColor: '#f59e0b', width: '16px', height: '16px', cursor: 'pointer' }} />
                                            <strong style={{ fontSize: '1rem' }}>Dark Theme</strong>
                                        </div>
                                        {isDarkActive && <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#f59e0b' }}>✓ Active</span>}
                                    </div>

                                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                        A darker interface inspired by Mindora&apos;s original Chat and Notes design.
                                    </p>
                                </div>
                            );
                        })()}
                    </div>

                    <div style={{ paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: '800', marginBottom: '0.5rem' }}>🔒 Privacy & University Identity</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.55', margin: 0 }}>
                            Your personal notebook pages and reminders are strictly private to your account ({profile?.email}). Your name, profile picture, bio, and unique university roll number ({profile?.rollNumber}) are visible to classmates so they can connect with you.
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
}