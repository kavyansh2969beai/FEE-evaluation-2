import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import useAuthStore from '../store/authStore';
import { API_BASE_URL } from '../api';

const PAPER_PALETTE = [
    { name: 'Warm Cream', hex: '#fdfbf7', rgb: [253, 251, 247] },
    { name: 'Soft Canary', hex: '#fef9c3', rgb: [254, 249, 195] },
    { name: 'Crisp White', hex: '#ffffff', rgb: [255, 255, 255] },
    { name: 'Sage Mint', hex: '#f0fdf4', rgb: [240, 253, 244] },
    { name: 'Sky Mist', hex: '#f0f9ff', rgb: [240, 249, 255] },
    { name: 'Pastel Rose', hex: '#fff1f2', rgb: [255, 241, 242] }
];

const FOLDERS = ['All', 'General', 'Lecture Notes', 'Exam Prep', 'Lab & Code', 'Quick Notes'];

export default function Notes() {
    const { token } = useAuthStore();
    const location = useLocation();
    const editorRef = useRef(null);
    const saveVersionRef = useRef(0);
    const autosaveTimerRef = useRef(null);

    const [notes, setNotes] = useState([]);
    const [selectedNoteId, setSelectedNoteId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFolder, setActiveFolder] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState('All changes saved');

    // Active Notebook Page State
    const [title, setTitle] = useState('');
    const [folder, setFolder] = useState('Lecture Notes');
    const [paperStyle, setPaperStyle] = useState('lined');
    const [pageColor, setPageColor] = useState('#fdfbf7');
    const [fontFamily, setFontFamily] = useState("'Inter', sans-serif");
    const [fontSize, setFontSize] = useState('16px');
    const [textColor, setTextColor] = useState('#1e293b');
    const [showMarginLine, setShowMarginLine] = useState(true);
    const [lastEdited, setLastEdited] = useState(null);

    const headers = { Authorization: `Bearer ${token}` };

    const fetchNotes = async (selectId = null) => {
        try {
            setIsLoading(true);
            const res = await axios.get(`${API_BASE_URL}/api/notes`, { headers });
            const fetched = res.data || [];
            setNotes(fetched);

            const targetId = selectId || location.state?.openNoteId || selectedNoteId;
            if (targetId) {
                const found = fetched.find((n) => n._id === targetId);
                if (found) {
                    loadNoteIntoEditor(found);
                    return;
                }
            }
            if (fetched.length > 0 && !selectedNoteId) {
                loadNoteIntoEditor(fetched[0]);
            }
        } catch {
            toast.error('Failed to load your notebooks.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchNotes();
        return () => clearTimeout(autosaveTimerRef.current);
    }, [token]);

    const loadNoteIntoEditor = (noteObj) => {
        clearTimeout(autosaveTimerRef.current);
        setSelectedNoteId(noteObj._id);
        setTitle(noteObj.title || 'Untitled Note');
        setFolder(noteObj.folder || (noteObj.isQuickNote ? 'Quick Notes' : 'General'));
        setPaperStyle(noteObj.paperStyle || 'lined');
        setPageColor(noteObj.pageColor || '#fdfbf7');
        setFontFamily(noteObj.fontFamily || "'Inter', sans-serif");
        setFontSize(noteObj.fontSize || '16px');
        setTextColor(noteObj.textColor || '#1e293b');
        setShowMarginLine(noteObj.showMarginLine !== undefined ? noteObj.showMarginLine : true);
        setLastEdited(noteObj.updatedAt || noteObj.createdAt);
        setSaveStatus('Saved ✓');

        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.innerHTML = noteObj.htmlContent || noteObj.content || '';
            }
        }, 0);
    };

    const handleCreateNewNote = async () => {
        try {
            const defaultFolder = activeFolder === 'All' ? 'Lecture Notes' : activeFolder;
            const res = await axios.post(
                `${API_BASE_URL}/api/notes`,
                {
                    title: 'Untitled Lecture Page',
                    content: '',
                    htmlContent: '',
                    folder: defaultFolder,
                    paperStyle: 'lined',
                    pageColor: '#fdfbf7',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '16px',
                    textColor: '#1e293b',
                    showMarginLine: true
                },
                { headers }
            );
            const created = res.data;
            setNotes((prev) => [created, ...prev]);
            loadNoteIntoEditor(created);
            toast.success('New notebook page created!');
        } catch {
            toast.error('Could not create new note.');
        }
    };

    const saveCurrentNote = async (silent = true, overrides = {}) => {
        if (!selectedNoteId) return;
        const currentVersion = ++saveVersionRef.current;

        const htmlContent = editorRef.current ? editorRef.current.innerHTML : '';
        const plainText = editorRef.current ? editorRef.current.innerText : '';

        const payload = {
            title: (overrides.title !== undefined ? overrides.title : title).trim() || 'Untitled Note',
            content: plainText || ' ',
            htmlContent,
            folder: overrides.folder !== undefined ? overrides.folder : folder,
            paperStyle: overrides.paperStyle !== undefined ? overrides.paperStyle : paperStyle,
            pageColor: overrides.pageColor !== undefined ? overrides.pageColor : pageColor,
            fontFamily: overrides.fontFamily !== undefined ? overrides.fontFamily : fontFamily,
            fontSize: overrides.fontSize !== undefined ? overrides.fontSize : fontSize,
            textColor: overrides.textColor !== undefined ? overrides.textColor : textColor,
            showMarginLine: overrides.showMarginLine !== undefined ? overrides.showMarginLine : showMarginLine
        };

        setSaveStatus('Saving...');
        try {
            const res = await axios.put(
                `${API_BASE_URL}/api/notes/${selectedNoteId}`,
                payload,
                { headers }
            );
            if (currentVersion === saveVersionRef.current) {
                setSaveStatus('Saved ✓');
                setLastEdited(res.data.updatedAt);
                setNotes((prev) => prev.map((n) => (n._id === selectedNoteId ? res.data : n)));
                if (!silent) toast.success('Notebook page saved!');
            }
        } catch {
            if (currentVersion === saveVersionRef.current) {
                setSaveStatus('Save failed — retry');
                if (!silent) toast.error('Failed to save changes.');
            }
        }
    };

    const scheduleAutosave = (overrides = {}) => {
        setSaveStatus('Unsaved changes...');
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = setTimeout(() => {
            saveCurrentNote(true, overrides);
        }, 900);
    };

    const handleDeleteNote = async (id, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Delete this notebook page permanently?')) return;

        try {
            await axios.delete(`${API_BASE_URL}/api/notes/${id}`, { headers });
            const remaining = notes.filter((n) => n._id !== id);
            setNotes(remaining);
            toast.success('Notebook page deleted.');
            if (selectedNoteId === id) {
                if (remaining.length > 0) loadNoteIntoEditor(remaining[0]);
                else setSelectedNoteId(null);
            }
        } catch {
            toast.error('Failed to delete note.');
        }
    };

    const applyFormatting = (command, value = null) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        document.execCommand(command, false, value);
        scheduleAutosave();
    };

    const handleExportTXT = () => {
        if (!selectedNoteId) return;
        const plainText = editorRef.current ? editorRef.current.innerText : '';
        const fileHeader = `${title}\nFolder: ${folder}\nLast Edited: ${lastEdited ? new Date(lastEdited).toLocaleString() : 'Today'}\n${'='.repeat(48)}\n\n`;
        const blob = new Blob([fileHeader + plainText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeName = (title || 'mindora-note').replace(/[^a-z0-9-_]/gi, '_');
        link.href = url;
        link.download = `${safeName}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Downloaded .txt file!');
    };

    const handleExportPDF = () => {
        if (!selectedNoteId) return;
        try {
            const doc = new jsPDF({ unit: 'pt', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            const selectedPalette = PAPER_PALETTE.find((p) => p.hex === pageColor) || PAPER_PALETTE[0];
            const plainText = editorRef.current ? editorRef.current.innerText : '';

            const drawNotebookBackground = () => {
                doc.setFillColor(...selectedPalette.rgb);
                doc.rect(0, 0, pageWidth, pageHeight, 'F');

                doc.setDrawColor(205, 213, 225);
                doc.setLineWidth(0.6);

                if (paperStyle === 'lined') {
                    for (let y = 85; y < pageHeight - 40; y += 24) {
                        doc.line(36, y, pageWidth - 36, y);
                    }
                } else if (paperStyle === 'grid') {
                    for (let y = 70; y < pageHeight - 40; y += 22) {
                        doc.line(36, y, pageWidth - 36, y);
                    }
                    for (let x = 36; x < pageWidth - 36; x += 22) {
                        doc.line(x, 70, x, pageHeight - 40);
                    }
                } else if (paperStyle === 'dotted') {
                    doc.setFillColor(180, 190, 205);
                    for (let y = 76; y < pageHeight - 40; y += 20) {
                        for (let x = 44; x < pageWidth - 40; x += 20) {
                            doc.circle(x, y, 0.9, 'F');
                        }
                    }
                }

                if (showMarginLine) {
                    doc.setDrawColor(244, 114, 130);
                    doc.setLineWidth(1);
                    doc.line(68, 0, 68, pageHeight);
                }
            };

            drawNotebookBackground();

            const leftX = showMarginLine ? 82 : 48;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(15, 23, 42);
            doc.text(title || 'Untitled Note', leftX, 52);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.text(
                `Mindora Notebook • Folder: ${folder} • Exported ${new Date().toLocaleDateString()}`,
                leftX,
                68
            );

            const hex = textColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16) || 30;
            const g = parseInt(hex.substring(2, 4), 16) || 41;
            const b = parseInt(hex.substring(4, 6), 16) || 59;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.setTextColor(r, g, b);

            const maxLineWidth = pageWidth - leftX - 45;
            const wrappedLines = doc.splitTextToSize(plainText || ' ', maxLineWidth);

            let cursorY = 104;
            const lineHeight = 24;

            wrappedLines.forEach((line) => {
                if (cursorY > pageHeight - 52) {
                    doc.addPage();
                    drawNotebookBackground();
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(12);
                    doc.setTextColor(r, g, b);
                    cursorY = 85;
                }
                doc.text(line, leftX, cursorY);
                cursorY += lineHeight;
            });

            const safeName = (title || 'mindora-note').replace(/[^a-z0-9-_]/gi, '_');
            doc.save(`${safeName}.pdf`);
            toast.success('Downloaded styled PDF notebook!');
        } catch {
            toast.error('Failed to generate PDF.');
        }
    };

    const filteredNotes = notes.filter((n) => {
        const matchesFolder =
            activeFolder === 'All' ||
            (activeFolder === 'Quick Notes' ? n.isQuickNote || n.folder === 'Quick Notes' : (n.folder || 'General') === activeFolder);
        const q = searchQuery.toLowerCase();
        const matchesQuery =
            !q ||
            n.title?.toLowerCase().includes(q) ||
            n.content?.toLowerCase().includes(q);
        return matchesFolder && matchesQuery;
    });

    return (
        <div className="auth-dotted-bg" style={{ minHeight: 'calc(100vh - 62px)', padding: '1.5rem' }}>
            <div style={{ maxWidth: '1340px', margin: '0 auto', display: 'grid', gridTemplateColumns: '310px 1fr', gap: '1.5rem', alignItems: 'start' }} className="responsive-grid-2">

                {/* =========================================================
                    LEFT SIDEBAR: NOTEBOOK INDEX, FOLDERS & SEARCH (Theme-Aware)
                   ========================================================= */}
                <div className="mindora-card" style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>📓 My Notebooks</h2>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{notes.length} saved page(s)</span>
                        </div>
                        <button
                            onClick={handleCreateNewNote}
                            style={{
                                background: '#ff2e7e',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem 0.95rem',
                                borderRadius: '999px',
                                fontWeight: '800',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(255,46,126,0.3)'
                            }}
                        >
                            + New Page
                        </button>
                    </div>

                    <input
                        type="text"
                        placeholder="🔍 Search title or content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="mindora-input"
                        style={{ padding: '0.65rem 0.9rem', fontSize: '0.85rem' }}
                    />

                    {/* Folder Filter Pills */}
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {FOLDERS.map((f) => (
                            <button
                                key={f}
                                onClick={() => setActiveFolder(f)}
                                style={{
                                    background: activeFolder === f ? '#f59e0b' : 'var(--bg-elevated)',
                                    color: activeFolder === f ? '#0f172a' : 'var(--text-secondary)',
                                    border: activeFolder === f ? '1px solid #f59e0b' : '1px solid var(--border-light)',
                                    padding: '0.28rem 0.65rem',
                                    borderRadius: '999px',
                                    fontSize: '0.72rem',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Scrollable Notes List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: '62vh', overflowY: 'auto', paddingRight: '0.2rem' }}>
                        {isLoading ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>Loading pages...</p>
                        ) : filteredNotes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', border: '1px dashed var(--border-strong)', borderRadius: '12px' }}>
                                <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.86rem' }}>No notebook pages in this view.</p>
                                <button onClick={handleCreateNewNote} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}>
                                    Create First Page
                                </button>
                            </div>
                        ) : (
                            filteredNotes.map((n) => {
                                const isSelected = n._id === selectedNoteId;
                                return (
                                    <div
                                        key={n._id}
                                        onClick={() => loadNoteIntoEditor(n)}
                                        style={{
                                            padding: '0.85rem',
                                            borderRadius: '12px',
                                            background: isSelected ? 'var(--bg-subtle)' : 'var(--bg-elevated)',
                                            border: isSelected ? '1.5px solid #f59e0b' : '1px solid var(--border-light)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            gap: '0.5rem',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: n.pageColor || '#fdfbf7', border: '1px solid #64748b', flexShrink: 0 }} />
                                                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {n.title}
                                                </strong>
                                            </div>
                                            <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {n.content || 'Empty page...'}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                <span style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                                                    {n.folder || 'General'}
                                                </span>
                                                <span>• {new Date(n.updatedAt || n.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteNote(n._id, e)}
                                            title="Delete page"
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', padding: '0.15rem' }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* =========================================================
                    RIGHT MAIN STUDIO: CUSTOMIZABLE TOOLBAR & PAPER SHEET
                   ========================================================= */}
                <div>
                    {!selectedNoteId ? (
                        <div className="mindora-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📓</div>
                            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.5rem' }}>Your Digital Notebook Studio</h2>
                            <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem', lineHeight: '1.55' }}>
                                Write on realistic lined, grid, dotted, or plain paper. Customize fonts, ink colors, and export any note directly to PDF or TXT.
                            </p>
                            <button onClick={handleCreateNewNote} className="pink-pill-btn">
                                + Create Your First Notebook Page
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            {/* TOP STUDIO CONTROL BAR & FORMATTING TOOLBAR (Theme-Aware) */}
                            <div className="mindora-card" style={{
                                padding: '0.9rem 1.15rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem'
                            }}>
                                {/* Row 1: Folder Selector, Save Status & Export Buttons */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.65rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: '700' }}>FOLDER:</span>
                                        <select
                                            value={folder}
                                            onChange={(e) => { setFolder(e.target.value); scheduleAutosave({ folder: e.target.value }); }}
                                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.8rem', fontWeight: '700' }}
                                        >
                                            {FOLDERS.filter((f) => f !== 'All').map((f) => (
                                                <option key={f} value={f}>{f}</option>
                                            ))}
                                        </select>

                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {lastEdited ? `Last edited ${new Date(lastEdited).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: saveStatus.includes('Saved') ? '#10b981' : '#d97706', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                                            {saveStatus}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => saveCurrentNote(false)}
                                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.42rem 0.9rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}
                                        >
                                            💾 Save Now
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleExportPDF}
                                            style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0.42rem 0.9rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}
                                        >
                                            ⬇ Export PDF
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleExportTXT}
                                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', padding: '0.42rem 0.9rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
                                        >
                                            ⬇ Export TXT
                                        </button>
                                    </div>
                                </div>

                                {/* Row 2: Rich Text & Page Customization Controls */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        <select
                                            value={fontFamily}
                                            onChange={(e) => { setFontFamily(e.target.value); scheduleAutosave({ fontFamily: e.target.value }); }}
                                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '6px', padding: '0.35rem 0.55rem', fontSize: '0.78rem' }}
                                        >
                                            <option value="'Inter', sans-serif">Inter Sans</option>
                                            <option value="'Plus Jakarta Sans', sans-serif">Jakarta Display</option>
                                            <option value="Georgia, serif">Classic Serif</option>
                                            <option value="'Space Mono', monospace">Space Mono</option>
                                        </select>

                                        <select
                                            value={fontSize}
                                            onChange={(e) => { setFontSize(e.target.value); scheduleAutosave({ fontSize: e.target.value }); }}
                                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '6px', padding: '0.35rem 0.55rem', fontSize: '0.78rem' }}
                                        >
                                            <option value="14px">14px</option>
                                            <option value="16px">16px</option>
                                            <option value="18px">18px</option>
                                            <option value="20px">20px</option>
                                            <option value="24px">24px</option>
                                        </select>

                                        <button type="button" onClick={() => applyFormatting('bold')} title="Bold" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', padding: '0.32rem 0.6rem', borderRadius: '6px', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem' }}>B</button>
                                        <button type="button" onClick={() => applyFormatting('italic')} title="Italic" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', padding: '0.32rem 0.6rem', borderRadius: '6px', fontStyle: 'italic', cursor: 'pointer', fontSize: '0.8rem' }}>I</button>
                                        <button type="button" onClick={() => applyFormatting('underline')} title="Underline" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', padding: '0.32rem 0.6rem', borderRadius: '6px', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}>U</button>
                                        <button type="button" onClick={() => applyFormatting('insertUnorderedList')} title="Bullet List" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', padding: '0.32rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>• List</button>
                                        <button type="button" onClick={() => applyFormatting('justifyLeft')} title="Align Left" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', padding: '0.32rem 0.55rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}>⇤</button>
                                        <button type="button" onClick={() => applyFormatting('justifyCenter')} title="Align Center" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', padding: '0.32rem 0.55rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}>↔</button>

                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-primary)', background: 'var(--bg-elevated)', padding: '0.25rem 0.55rem', borderRadius: '6px', border: '1px solid var(--border-strong)', cursor: 'pointer' }}>
                                            <span>Ink</span>
                                            <input
                                                type="color"
                                                value={textColor}
                                                onChange={(e) => { setTextColor(e.target.value); scheduleAutosave({ textColor: e.target.value }); }}
                                                style={{ width: '18px', height: '18px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                            />
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <select
                                            value={paperStyle}
                                            onChange={(e) => { setPaperStyle(e.target.value); scheduleAutosave({ paperStyle: e.target.value }); }}
                                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '6px', padding: '0.35rem 0.6rem', fontSize: '0.78rem', fontWeight: '700' }}
                                        >
                                            <option value="lined">═ Lined Paper</option>
                                            <option value="grid"># Grid Paper</option>
                                            <option value="dotted">•• Dotted Paper</option>
                                            <option value="plain">▢ Plain Paper</option>
                                        </select>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = !showMarginLine;
                                                setShowMarginLine(next);
                                                scheduleAutosave({ showMarginLine: next });
                                            }}
                                            style={{
                                                background: showMarginLine ? 'rgba(244, 63, 94, 0.16)' : 'var(--bg-elevated)',
                                                color: showMarginLine ? '#e11d48' : 'var(--text-muted)',
                                                border: '1px solid var(--border-strong)',
                                                padding: '0.34rem 0.65rem',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            | Margin
                                        </button>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--bg-elevated)', padding: '0.3rem 0.5rem', borderRadius: '999px', border: '1px solid var(--border-strong)' }}>
                                            {PAPER_PALETTE.map((swatch) => (
                                                <button
                                                    key={swatch.hex}
                                                    type="button"
                                                    onClick={() => { setPageColor(swatch.hex); scheduleAutosave({ pageColor: swatch.hex }); }}
                                                    title={`Paper: ${swatch.name}`}
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '50%',
                                                        background: swatch.hex,
                                                        border: pageColor === swatch.hex ? '2.5px solid #f59e0b' : '1px solid #64748b',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* THE PHYSICAL NOTEBOOK PAPER SHEET */}
                            <div
                                className="notebook-paper-sheet"
                                style={{
                                    backgroundColor: pageColor,
                                    color: textColor,
                                    fontFamily,
                                    minHeight: '650px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ position: 'absolute', left: '14px', top: '36px', bottom: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 3 }}>
                                    {[...Array(11)].map((_, idx) => (
                                        <span key={idx} style={{ width: '13px', height: '13px', borderRadius: '50%', background: 'var(--bg-main)', border: '1px solid rgba(100,116,139,0.35)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.25)' }} />
                                    ))}
                                </div>

                                {showMarginLine && (
                                    <div style={{ position: 'absolute', left: '64px', top: 0, bottom: 0, width: '1.5px', background: 'rgba(244, 63, 94, 0.42)', pointerEvents: 'none', zIndex: 2 }} />
                                )}

                                <div style={{
                                    padding: `1.75rem 2.5rem 0.85rem ${showMarginLine ? '5.25rem' : '3.25rem'}`,
                                    borderBottom: '2px double rgba(100, 116, 139, 0.28)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    gap: '1rem',
                                    flexWrap: 'wrap'
                                }}>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => { setTitle(e.target.value); scheduleAutosave({ title: e.target.value }); }}
                                        placeholder="Page Title..."
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            color: textColor,
                                            fontFamily: 'inherit',
                                            fontSize: '1.65rem',
                                            fontWeight: '800',
                                            flex: 1,
                                            minWidth: '220px'
                                        }}
                                    />
                                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: "'Space Mono', monospace" }}>
                                        {new Date(lastEdited || Date.now()).toLocaleDateString([], { dateStyle: 'medium' })}
                                    </span>
                                </div>

                                <div
                                    ref={editorRef}
                                    contentEditable
                                    suppressContentEditableWarning
                                    data-placeholder="Start writing your lecture notes, formulas, or project ideas here..."
                                    onInput={() => scheduleAutosave()}
                                    className={`notebook-editable-area paper-style-${paperStyle}`}
                                    style={{
                                        padding: `1rem 2.5rem 3rem ${showMarginLine ? '5.25rem' : '3.25rem'}`,
                                        fontSize,
                                        color: textColor,
                                        fontFamily
                                    }}
                                />
                            </div>

                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}