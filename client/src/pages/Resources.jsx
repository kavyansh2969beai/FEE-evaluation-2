import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { API_BASE_URL } from '../api';

const RESOURCE_CATEGORIES = [
    'All',
    'Lecture Notes',
    'Past Paper',
    'Lab Manual',
    'Assignment',
    'Reference Book'
];

export default function Resources() {
    const { user, token } = useAuthStore();
    const fileInputRef = useRef(null);

    const currentUserId = String(user?._id || user?.id || '');

    // Resources & Groups State
    const [resources, setResources] = useState([]);
    const [myGroups, setMyGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Search, Filter & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [scopeFilter, setScopeFilter] = useState('all'); // 'all', 'groups', 'mine'
    const [sortBy, setSortBy] = useState('newest'); // 'newest', 'popular', 'az'

    // Upload Resource Modal State
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState('Lecture Notes');
    const [description, setDescription] = useState('');
    const [sharedInGroup, setSharedInGroup] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Preview Modal State
    const [previewResource, setPreviewResource] = useState(null);

    const headers = { Authorization: `Bearer ${token}` };

    const fetchResourcesAndGroups = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const [resResponse, chatResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/resources`, { headers }),
                axios.get(`${API_BASE_URL}/api/chats`, { headers }).catch(() => ({ data: [] }))
            ]);
            setResources(resResponse.data || []);
            const groups = (chatResponse.data || []).filter((c) => c.isGroupChat);
            setMyGroups(groups);
        } catch (error) {
            toast.error('Failed to load study resources.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchResourcesAndGroups();
    }, [token]);

    // Upload Resource Handler (+10 Reward Points)
    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            return toast.error('Please select a file to upload.');
        }

        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('subject', subject.trim());
        formData.append('category', category);
        formData.append('description', description.trim());
        if (sharedInGroup) formData.append('sharedInGroup', sharedInGroup);
        formData.append('file', selectedFile);

        setIsUploading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/resources`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success('Resource shared! +10 Reward Points earned ⭐');
            setTitle('');
            setSubject('');
            setCategory('Lecture Notes');
            setDescription('');
            setSharedInGroup('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setIsUploadOpen(false);
            fetchResourcesAndGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to upload resource.');
        } finally {
            setIsUploading(false);
        }
    };

    // Download Resource & Increment Counter
    const handleDownload = async (resItem) => {
        try {
            await axios.post(`${API_BASE_URL}/api/resources/download/${resItem._id}`, {}, { headers });
            setResources((prev) =>
                prev.map((r) => (r._id === resItem._id ? { ...r, downloadCount: (r.downloadCount || 0) + 1 } : r))
            );
        } catch {
            // Proceed with file download even if tracking endpoint fails
        }
        const fileUrl = `${API_BASE_URL}/uploads/${resItem.fileUrl}`;
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
    };

    // Delete Own Resource
    const handleDeleteResource = async (id) => {
        if (!window.confirm('Delete this resource permanently?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/resources/${id}`, { headers });
            setResources((prev) => prev.filter((r) => r._id !== id));
            if (previewResource?._id === id) setPreviewResource(null);
            toast.success('Resource deleted.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete resource.');
        }
    };

    // File Type Badge Helper
    const getFileTypeInfo = (fileUrl = '') => {
        const ext = fileUrl.split('.').pop()?.toLowerCase() || '';
        if (ext === 'pdf') return { icon: '📕', label: 'PDF Document', accent: '#e11d48', bg: 'rgba(225, 29, 72, 0.12)' };
        if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return { icon: '🖼️', label: 'Image / Diagram', accent: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)' };
        if (['doc', 'docx', 'ppt', 'pptx'].includes(ext)) return { icon: '📘', label: 'Office Document', accent: '#4f46e5', bg: 'rgba(79, 70, 229, 0.12)' };
        if (['txt', 'md', 'c', 'cpp', 'java', 'py', 'js'].includes(ext)) return { icon: '💻', label: 'Text / Code', accent: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
        return { icon: '📄', label: ext ? ext.toUpperCase() : 'Study File', accent: '#d97706', bg: 'rgba(217, 119, 6, 0.12)' };
    };

    // Filter & Sort Logic
    const filteredResources = resources
        .filter((r) => {
            if (selectedCategory !== 'All' && r.category !== selectedCategory) return false;
            if (scopeFilter === 'groups' && !r.sharedInGroup) return false;
            if (scopeFilter === 'mine' && String(r.uploader?._id || r.uploader) !== currentUserId) return false;

            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                r.title?.toLowerCase().includes(q) ||
                r.subject?.toLowerCase().includes(q) ||
                r.description?.toLowerCase().includes(q) ||
                r.uploader?.name?.toLowerCase().includes(q)
            );
        })
        .sort((a, b) => {
            if (sortBy === 'popular') return (b.downloadCount || 0) - (a.downloadCount || 0);
            if (sortBy === 'az') return (a.title || '').localeCompare(b.title || '');
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

    const totalDownloads = resources.reduce((sum, r) => sum + (r.downloadCount || 0), 0);
    const myUploadsCount = resources.filter((r) => String(r.uploader?._id || r.uploader) === currentUserId).length;

    return (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.75rem 1.5rem 4rem 1.5rem' }}>

            {/* =========================================================
                TOP HERO BANNER (Matches Desktop Theme & Adapts to Dark Theme)
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
                        <span>📚</span> Campus Knowledge Repository • +10 ⭐ Per Upload
                    </div>
                    <h1 className="mindora-hero-title" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.35rem)', margin: '0 0 0.4rem 0' }}>
                        Student Resource Vault
                    </h1>
                    <p style={{ color: 'var(--hero-sub-color)', fontSize: '0.96rem', fontWeight: '500', maxWidth: '620px', margin: 0 }}>
                        Access verified lecture notes, past papers, and lab manuals shared by your classmates—or contribute your own study materials to earn reward points.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={() => setIsUploadOpen(true)}
                        className="pink-pill-btn"
                    >
                        + Upload Resource (+10 ⭐)
                    </button>
                </div>
            </div>

            {/* =========================================================
                SUMMARY STATS ROW
               ========================================================= */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.15rem', marginBottom: '1.75rem' }}>
                <div className="mindora-card" style={{ padding: '1.25rem 1.4rem', borderLeft: '4px solid #4f46e5' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: '800', color: 'var(--text-muted)' }}>AVAILABLE RESOURCES</div>
                    <div style={{ fontSize: '1.85rem', fontWeight: '800', marginTop: '0.2rem' }}>{resources.length} Files</div>
                    <div style={{ fontSize: '0.76rem', color: '#4f46e5', fontWeight: '700' }}>Public & study group uploads</div>
                </div>
                <div className="mindora-card" style={{ padding: '1.25rem 1.4rem', borderLeft: '4px solid #0ea5e9' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: '800', color: 'var(--text-muted)' }}>CAMPUS DOWNLOADS</div>
                    <div style={{ fontSize: '1.85rem', fontWeight: '800', marginTop: '0.2rem' }}>{totalDownloads}</div>
                    <div style={{ fontSize: '0.76rem', color: '#0ea5e9', fontWeight: '700' }}>Total peer downloads</div>
                </div>
                <div className="mindora-card" style={{ padding: '1.25rem 1.4rem', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: '800', color: 'var(--text-muted)' }}>YOUR CONTRIBUTIONS</div>
                    <div style={{ fontSize: '1.85rem', fontWeight: '800', marginTop: '0.2rem' }}>{myUploadsCount} Shared</div>
                    <div style={{ fontSize: '0.76rem', color: '#f59e0b', fontWeight: '700' }}>+{myUploadsCount * 10} Reward Score earned ⭐</div>
                </div>
            </div>

            {/* =========================================================
                SEARCH, FILTER & SORT CONTROL BAR
               ========================================================= */}
            <div className="mindora-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    {/* Search Input */}
                    <div style={{ flex: '1 1 300px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '0.95rem', color: 'var(--text-muted)' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Search by title, subject, keyword, or uploader name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="mindora-input"
                            style={{ paddingLeft: '2.5rem' }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                style={{ position: 'absolute', right: '0.85rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '800' }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Scope & Sort Selectors */}
                    <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <select
                            value={scopeFilter}
                            onChange={(e) => setScopeFilter(e.target.value)}
                            className="mindora-input"
                            style={{ width: 'auto', fontWeight: '700', cursor: 'pointer' }}
                        >
                            <option value="all">🌐 All Visible Files</option>
                            <option value="groups">👥 Study Group Files</option>
                            <option value="mine">👤 My Uploads ({myUploadsCount})</option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="mindora-input"
                            style={{ width: 'auto', fontWeight: '700', cursor: 'pointer' }}
                        >
                            <option value="newest">🕒 Newest First</option>
                            <option value="popular">🔥 Most Downloaded</option>
                            <option value="az">🔤 Title (A–Z)</option>
                        </select>
                    </div>
                </div>

                {/* Category Filter Pills */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {RESOURCE_CATEGORIES.map((cat) => {
                        const isActive = selectedCategory === cat;
                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedCategory(cat)}
                                style={{
                                    background: isActive ? 'var(--nav-active-bg)' : 'var(--bg-elevated)',
                                    color: isActive ? 'var(--nav-active-text)' : 'var(--text-secondary)',
                                    border: isActive ? '1.5px solid var(--nav-active-bg)' : '1.5px solid var(--border-light)',
                                    padding: '0.42rem 1rem',
                                    borderRadius: '999px',
                                    fontSize: '0.82rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {cat}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* =========================================================
                RESOURCES GRID
               ========================================================= */}
            {isLoading ? (
                <div className="mindora-card" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading campus resources...
                </div>
            ) : filteredResources.length === 0 ? (
                <div className="mindora-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.6rem', marginBottom: '0.75rem' }}>📂</div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.4rem' }}>No matching resources found</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '460px', margin: '0 auto 1.35rem auto' }}>
                        Be the first to upload lecture notes, past papers, or lab manuals for this category and earn +10 Reward Points!
                    </p>
                    <button type="button" onClick={() => setIsUploadOpen(true)} className="indigo-pill-btn">
                        + Upload First Resource
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.35rem' }}>
                    {filteredResources.map((resItem) => {
                        const fileInfo = getFileTypeInfo(resItem.fileUrl);
                        const isOwner = String(resItem.uploader?._id || resItem.uploader) === currentUserId;

                        return (
                            <div
                                key={resItem._id}
                                className="mindora-card mindora-card-hover"
                                style={{
                                    padding: '1.45rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '1.1rem',
                                    borderTop: `4px solid ${fileInfo.accent}`
                                }}
                            >
                                <div>
                                    {/* Top Row: File Type Pill & Category */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                                        <span
                                            style={{
                                                background: fileInfo.bg,
                                                color: fileInfo.accent,
                                                padding: '0.25rem 0.7rem',
                                                borderRadius: '999px',
                                                fontSize: '0.74rem',
                                                fontWeight: '800',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.35rem'
                                            }}
                                        >
                                            <span>{fileInfo.icon}</span> {fileInfo.label}
                                        </span>

                                        <span
                                            style={{
                                                background: 'var(--bg-elevated)',
                                                color: 'var(--text-secondary)',
                                                border: '1px solid var(--border-light)',
                                                padding: '0.22rem 0.65rem',
                                                borderRadius: '999px',
                                                fontSize: '0.72rem',
                                                fontWeight: '700'
                                            }}
                                        >
                                            {resItem.category || 'Lecture Notes'}
                                        </span>
                                    </div>

                                    {/* Title & Subject */}
                                    <h3 style={{ fontSize: '1.12rem', fontWeight: '800', marginBottom: '0.3rem', lineHeight: '1.35' }}>
                                        {resItem.title}
                                    </h3>
                                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#4f46e5', marginBottom: '0.55rem' }}>
                                        📘 Subject: {resItem.subject}
                                    </div>

                                    {resItem.description && (
                                        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '0.75rem' }}>
                                            {resItem.description}
                                        </p>
                                    )}

                                    {resItem.sharedInGroup && (
                                        <div style={{ display: 'inline-block', background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.73rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                                            👥 Shared in Group: {resItem.sharedInGroup.chatName || 'Study Group'}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    {/* Uploader & Metadata Bar */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            paddingTop: '0.75rem',
                                            marginBottom: '0.85rem',
                                            borderTop: '1px solid var(--border-light)',
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)'
                                        }}
                                    >
                                        <span>
                                            By <strong style={{ color: 'var(--text-primary)' }}>{resItem.uploader?.name || 'Classmate'}</strong>
                                        </span>
                                        <span>
                                            ⬇ {resItem.downloadCount || 0} • {resItem.createdAt ? new Date(resItem.createdAt).toLocaleDateString() : 'Recent'}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewResource(resItem)}
                                            style={{
                                                flex: 1,
                                                background: 'var(--bg-elevated)',
                                                color: 'var(--text-primary)',
                                                border: '1.5px solid var(--border-strong)',
                                                padding: '0.55rem 0.8rem',
                                                borderRadius: '10px',
                                                fontSize: '0.82rem',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            👁️ Preview
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDownload(resItem)}
                                            style={{
                                                flex: 1,
                                                background: '#4f46e5',
                                                color: '#ffffff',
                                                border: 'none',
                                                padding: '0.55rem 0.8rem',
                                                borderRadius: '10px',
                                                fontSize: '0.82rem',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ⬇ Download
                                        </button>
                                        {isOwner && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteResource(resItem._id)}
                                                title="Delete your upload"
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.12)',
                                                    color: '#ef4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    padding: '0.55rem 0.7rem',
                                                    borderRadius: '10px',
                                                    fontSize: '0.82rem',
                                                    fontWeight: '800',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* =========================================================
                MODAL 1: UPLOAD STUDY RESOURCE
               ========================================================= */}
            {isUploadOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '1rem' }}>
                    <div className="mindora-card" style={{ width: '100%', maxWidth: '520px', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Upload Study Resource</h3>
                                <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700' }}>⭐ Earn +10 Reward Score automatically upon upload</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsUploadOpen(false)}
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.35rem' }}>Resource Title *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Complete DBMS Normalization & Indexing Notes"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="mindora-input"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.35rem' }}>Subject / Course *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g., Database Systems"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="mindora-input"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.35rem' }}>Category</label>
                                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="mindora-input">
                                        {RESOURCE_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.35rem' }}>Share Visibility (Optional Study Group)</label>
                                <select value={sharedInGroup} onChange={(e) => setSharedInGroup(e.target.value)} className="mindora-input">
                                    <option value="">🌐 Public Campus Vault (Visible to Everyone)</option>
                                    {myGroups.map((g) => (
                                        <option key={g._id} value={g._id}>👥 Study Group: {g.chatName}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.35rem' }}>Short Description</label>
                                <textarea
                                    rows="2"
                                    placeholder="Briefly mention the units, topics, or semester covered..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="mindora-input"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.35rem' }}>Select Study File *</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    required
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    className="mindora-input"
                                    style={{ padding: '0.55rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsUploadOpen(false)}
                                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: '0.65rem 1.25rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" disabled={isUploading} className="indigo-pill-btn" style={{ borderRadius: '10px', padding: '0.65rem 1.45rem' }}>
                                    {isUploading ? 'Uploading...' : 'Upload & Earn +10 ⭐'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =========================================================
                MODAL 2: IN-APP RESOURCE PREVIEW
               ========================================================= */}
            {previewResource && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 450, padding: '1.25rem' }}>
                    <div className="mindora-card" style={{ width: '100%', maxWidth: '880px', height: '84vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.35rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>{previewResource.title}</h3>
                                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                    {previewResource.subject} • Uploaded by {previewResource.uploader?.name || 'Classmate'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => handleDownload(previewResource)}
                                    style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    ⬇ Download File
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewResource(null)}
                                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, background: '#18181b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {/\.(png|jpg|jpeg|webp|gif)$/i.test(previewResource.fileUrl || '') ? (
                                <img
                                    src={`${API_BASE_URL}/uploads/${previewResource.fileUrl}`}
                                    alt={previewResource.title}
                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                />
                            ) : (
                                <iframe
                                    src={`${API_BASE_URL}/uploads/${previewResource.fileUrl}`}
                                    title={previewResource.title}
                                    style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff' }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}