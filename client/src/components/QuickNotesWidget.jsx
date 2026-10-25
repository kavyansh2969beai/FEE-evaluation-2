import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { API_BASE_URL } from '../api';

const PAGE_COLORS = [
    { name: 'Warm Cream', hex: '#fdfbf7' },
    { name: 'Soft Canary', hex: '#fef9c3' },
    { name: 'Crisp White', hex: '#ffffff' },
    { name: 'Sage Mint', hex: '#f0fdf4' },
    { name: 'Sky Mist', hex: '#f0f9ff' }
];

export default function QuickNotesWidget({ isOpen, onClose, onSaved }) {
    const { token } = useAuthStore();
    const navigate = useNavigate();
    const editorRef = useRef(null);

    const [noteId, setNoteId] = useState(null);
    const [title, setTitle] = useState('Quick Scratchpad');
    const [paperStyle, setPaperStyle] = useState('lined');
    const [pageColor, setPageColor] = useState('#fdfbf7');
    const [fontFamily, setFontFamily] = useState("'Inter', sans-serif");
    const [fontSize, setFontSize] = useState('15px');
    const [textColor, setTextColor] = useState('#1e293b');
    const [saveStatus, setSaveStatus] = useState('Saved');
    const [isMinimized, setIsMinimized] = useState(false);

    // Load the user's latest Quick Note or local draft on mount
    useEffect(() => {
        if (!token || !isOpen) return;

        const loadQuickNote = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/notes`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const existingQuick = (res.data || []).find((n) => n.isQuickNote) || res.data?.[0];
                if (existingQuick) {
                    setNoteId(existingQuick._id);
                    setTitle(existingQuick.title || 'Quick Scratchpad');
                    setPaperStyle(existingQuick.paperStyle || 'lined');
                    setPageColor(existingQuick.pageColor || '#fdfbf7');
                    setFontFamily(existingQuick.fontFamily || "'Inter', sans-serif");
                    setFontSize(existingQuick.fontSize || '15px');
                    setTextColor(existingQuick.textColor || '#1e293b');
                    if (editorRef.current) {
                        editorRef.current.innerHTML = existingQuick.htmlContent || existingQuick.content || '';
                    }
                } else {
                    const cached = localStorage.getItem('mindora_quicknote_draft');
                    if (cached && editorRef.current) {
                        editorRef.current.innerHTML = cached;
                    }
                }
            } catch (err) {
                console.error('Could not load quick note');
            }
        };

        loadQuickNote();
    }, [token, isOpen]);

    // Save note to MongoDB
    const saveQuickNote = async (silent = false) => {
        if (!editorRef.current) return null;
        const htmlContent = editorRef.current.innerHTML;
        const plainText = editorRef.current.innerText || '';

        localStorage.setItem('mindora_quicknote_draft', htmlContent);

        if (!plainText.trim() && !noteId) return null;

        setSaveStatus('Saving...');
        const payload = {
            title: title.trim() || 'Quick Scratchpad',
            content: plainText || ' ',
            htmlContent,
            paperStyle,
            pageColor,
            fontFamily,
            fontSize,
            textColor,
            isQuickNote: true
        };

        try {
            let res;
            if (noteId) {
                res = await axios.put(`${API_BASE_URL}/api/notes/${noteId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                res = await axios.post(`${API_BASE_URL}/api/notes`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setNoteId(res.data._id);
            }
            setSaveStatus('Saved ✓');
            if (onSaved) onSaved();
            if (!silent) toast.success('Quick note saved!');
            return res.data._id;
        } catch (err) {
            setSaveStatus('Offline draft saved');
            if (!silent) toast.error('Saved locally (server unreachable)');
            return null;
        }
    };

    const execFormat = (command) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        document.execCommand(command, false, null);
    };

    const handleOpenInFullNotes = async () => {
        const savedId = await saveQuickNote(true);
        navigate('/notes', { state: { openNoteId: savedId || noteId } });
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            right: '1.5rem',
            bottom: '1.5rem',
            width: isMinimized ? '280px' : 'min(420px, calc(100vw - 2rem))',
            zIndex: 999,
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(15, 23, 42, 0.28)',
            border: '2px solid #0f172a',
            background: '#0f172a',
            transition: 'all 0.2s ease'
        }}>
            {/* Top Notebook Binding Header */}
            <div style={{
                padding: '0.75rem 1rem',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <span>📓</span>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => { setTitle(e.target.value); setSaveStatus('Unsaved'); }}
                        onBlur={() => saveQuickNote(true)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontWeight: '800',
                            fontSize: '0.92rem',
                            width: '100%',
                            outline: 'none'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.68rem', color: '#a3e635', fontWeight: '700', marginRight: '0.25rem' }}>
                        {saveStatus}
                    </span>
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        style={{ background: 'rgba(255,255,255,0.14)', color: 'white', border: 'none', width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', fontWeight: '800' }}
                        title={isMinimized ? 'Expand' : 'Minimize'}
                    >
                        {isMinimized ? '▢' : '—'}
                    </button>
                    <button
                        onClick={() => { saveQuickNote(true); onClose(); }}
                        style={{ background: '#e11d48', color: 'white', border: 'none', width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', fontWeight: '800' }}
                        title="Save & Close"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Compact Formatting & Paper Style Toolbar */}
                    <div style={{
                        background: '#18181b',
                        padding: '0.55rem 0.75rem',
                        borderBottom: '1px solid #27272a',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.4rem',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        {/* Bold / Italic / Underline */}
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button type="button" onClick={() => execFormat('bold')} style={{ background: '#27272a', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '5px', fontWeight: '800', cursor: 'pointer', fontSize: '0.78rem' }}>B</button>
                            <button type="button" onClick={() => execFormat('italic')} style={{ background: '#27272a', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '5px', fontStyle: 'italic', cursor: 'pointer', fontSize: '0.78rem' }}>I</button>
                            <button type="button" onClick={() => execFormat('underline')} style={{ background: '#27272a', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '5px', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.78rem' }}>U</button>
                        </div>

                        {/* Font & Size */}
                        <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} style={{ background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '5px', padding: '0.2rem 0.35rem', fontSize: '0.72rem' }}>
                            <option value="'Inter', sans-serif">Sans</option>
                            <option value="Georgia, serif">Serif</option>
                            <option value="'Space Mono', monospace">Mono</option>
                        </select>

                        <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} style={{ background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '5px', padding: '0.2rem 0.35rem', fontSize: '0.72rem' }}>
                            <option value="14px">Small</option>
                            <option value="16px">Medium</option>
                            <option value="18px">Large</option>
                        </select>

                        {/* Paper Pattern Switcher */}
                        <select value={paperStyle} onChange={(e) => setPaperStyle(e.target.value)} style={{ background: '#27272a', color: '#fde047', border: '1px solid #3f3f46', borderRadius: '5px', padding: '0.2rem 0.35rem', fontSize: '0.72rem', fontWeight: '700' }}>
                            <option value="lined">═ Lined</option>
                            <option value="grid"># Grid</option>
                            <option value="dotted">•• Dotted</option>
                            <option value="plain">▢ Plain</option>
                        </select>

                        {/* Page & Ink Colors */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {PAGE_COLORS.map((c) => (
                                <button
                                    key={c.hex}
                                    type="button"
                                    onClick={() => setPageColor(c.hex)}
                                    title={c.name}
                                    style={{
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        background: c.hex,
                                        border: pageColor === c.hex ? '2px solid #f59e0b' : '1px solid #52525b',
                                        cursor: 'pointer'
                                    }}
                                />
                            ))}
                            <input
                                type="color"
                                value={textColor}
                                onChange={(e) => setTextColor(e.target.value)}
                                title="Text Ink Color"
                                style={{ width: '18px', height: '18px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                            />
                        </div>
                    </div>

                    {/* Notebook Writing Sheet */}
                    <div
                        className={`paper-style-${paperStyle}`}
                        style={{
                            backgroundColor: pageColor,
                            color: textColor,
                            fontFamily,
                            fontSize,
                            padding: '1rem 1rem 1rem 2.25rem',
                            height: '260px',
                            overflowY: 'auto',
                            position: 'relative'
                        }}
                    >
                        {/* Red Vertical Margin Line */}
                        <div style={{ position: 'absolute', left: '1.65rem', top: 0, bottom: 0, width: '1.5px', background: 'rgba(244, 63, 94, 0.35)', pointerEvents: 'none' }} />

                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            data-placeholder="Jot down quick lecture thoughts, formulas, or to-dos..."
                            onInput={() => {
                                setSaveStatus('Unsaved...');
                                if (editorRef.current) {
                                    localStorage.setItem('mindora_quicknote_draft', editorRef.current.innerHTML);
                                }
                            }}
                            onBlur={() => saveQuickNote(true)}
                            className="notebook-editable-area"
                            style={{ minHeight: '220px' }}
                        />
                    </div>

                    {/* Footer Actions */}
                    <div style={{
                        background: '#18181b',
                        padding: '0.55rem 0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid #27272a'
                    }}>
                        <button
                            type="button"
                            onClick={handleOpenInFullNotes}
                            style={{ background: 'none', border: 'none', color: '#a5b4fc', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                            Open in Full Notebook Studio ↗
                        </button>
                        <button
                            type="button"
                            onClick={() => saveQuickNote(false)}
                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                            Save Note
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}