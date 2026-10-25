import { useState, useEffect } from 'react';
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

const EVENT_CATEGORIES = {
    'Study Session': { color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.14)', icon: '📖' },
    'Group Meeting': { color: '#10b981', bg: 'rgba(16, 185, 129, 0.14)', icon: '👥' },
    'Deadline': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.16)', icon: '⏰' },
    'Exam': { color: '#e11d48', bg: 'rgba(225, 29, 72, 0.14)', icon: '🎯' }
};

export default function Calendar() {
    const { token } = useAuthStore();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [isLoading, setIsLoading] = useState(true);

    // Add / Edit Reminder Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Exam');
    const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('11:00');
    const [locationStr, setLocationStr] = useState('');
    const [description, setDescription] = useState('');

    const headers = { Authorization: `Bearer ${token}` };

    const fetchEvents = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/events`, { headers });
            setEvents(res.data || []);
        } catch (error) {
            toast.error('Failed to load calendar events.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [token]);

    const calendarDays = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth)),
        end: endOfWeek(endOfMonth(currentMonth))
    });

    const filteredEvents = events.filter(
        (ev) => categoryFilter === 'All' || ev.category === categoryFilter
    );

    const selectedDateEvents = filteredEvents.filter((ev) =>
        isSameDay(parseISO(ev.startDate), selectedDate)
    );

    const upcomingEvents = filteredEvents
        .filter((ev) => isAfter(parseISO(ev.endDate), new Date()))
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(0, 6);

    const openAddModal = (dayObj = selectedDate) => {
        setEditingEvent(null);
        setSelectedDate(dayObj);
        setTitle('');
        setCategory('Exam');
        setDateStr(format(dayObj, 'yyyy-MM-dd'));
        setStartTime('10:00');
        setEndTime('11:00');
        setLocationStr('');
        setDescription('');
        setIsModalOpen(true);
    };

    const openEditModal = (ev) => {
        setEditingEvent(ev);
        const startDt = parseISO(ev.startDate);
        const endDt = parseISO(ev.endDate);
        setTitle(ev.title || '');
        setCategory(ev.category || 'Exam');
        setDateStr(format(startDt, 'yyyy-MM-dd'));
        setStartTime(format(startDt, 'HH:mm'));
        setEndTime(format(endDt, 'HH:mm'));
        setLocationStr(ev.location || '');
        setDescription(ev.description || '');
        setIsModalOpen(true);
    };

    const handleSaveEvent = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        const startISO = new Date(`${dateStr}T${startTime}:00`).toISOString();
        const endISO = new Date(`${dateStr}T${endTime || startTime}:00`).toISOString();

        const payload = {
            title: title.trim(),
            category,
            startDate: startISO,
            endDate: endISO,
            location: locationStr.trim(),
            description: description.trim()
        };

        try {
            if (editingEvent) {
                await axios.put(`${API_BASE_URL}/api/events/${editingEvent._id}`, payload, { headers });
                toast.success('Reminder updated!');
            } else {
                await axios.post(`${API_BASE_URL}/api/events`, payload, { headers });
                toast.success('Reminder added to your calendar!');
            }
            setIsModalOpen(false);
            fetchEvents();
        } catch (error) {
            toast.error('Failed to save calendar reminder.');
        }
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm('Delete this reminder permanently?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/events/${id}`, { headers });
            toast.success('Reminder removed.');
            setIsModalOpen(false);
            fetchEvents();
        } catch (error) {
            toast.error('Failed to delete reminder.');
        }
    };

    return (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.75rem 1.5rem 4rem 1.5rem' }}>

            {/* =========================================================
                TOP HERO BANNER (Matches Desktop Theme & Dark Theme)
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
                        <span>📅</span> Academic Planner & Reminder Engine
                    </div>
                    <h1 className="mindora-hero-title" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.35rem)', margin: '0 0 0.4rem 0' }}>
                        Smart Exam & Study Calendar
                    </h1>
                    <p style={{ color: 'var(--hero-sub-color)', fontSize: '0.96rem', fontWeight: '500', maxWidth: '620px', margin: 0 }}>
                        Keep track of upcoming exams, assignment submissions, group meetings, and personal study sessions in one unified schedule.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={() => {
                            const now = new Date();
                            setCurrentMonth(now);
                            setSelectedDate(now);
                        }}
                        style={{
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            border: '2px solid var(--border-ink)',
                            padding: '0.72rem 1.3rem',
                            borderRadius: '999px',
                            fontWeight: '800',
                            fontSize: '0.88rem',
                            cursor: 'pointer'
                        }}
                    >
                        Jump to Today
                    </button>
                    <button type="button" onClick={() => openAddModal(selectedDate)} className="pink-pill-btn">
                        + Add Reminder
                    </button>
                </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['All', ...Object.keys(EVENT_CATEGORIES)].map((cat) => {
                        const active = categoryFilter === cat;
                        const styleMeta = EVENT_CATEGORIES[cat];
                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setCategoryFilter(cat)}
                                style={{
                                    background: active ? 'var(--nav-active-bg)' : 'var(--bg-surface)',
                                    color: active ? 'var(--nav-active-text)' : 'var(--text-secondary)',
                                    border: active ? '1.5px solid var(--nav-active-bg)' : '1.5px solid var(--border-light)',
                                    padding: '0.45rem 1rem',
                                    borderRadius: '999px',
                                    fontSize: '0.82rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                }}
                            >
                                {styleMeta && <span>{styleMeta.icon}</span>}
                                <span>{cat}</span>
                            </button>
                        );
                    })}
                </div>

                <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                    Showing {filteredEvents.length} scheduled event(s)
                </span>
            </div>

            {/* =========================================================
                MAIN CALENDAR WORKSPACE: MONTH GRID + REMINDER SIDEBAR
               ========================================================= */}
            <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1.65fr 1fr', gap: '1.75rem', alignItems: 'start' }}>

                {/* LEFT: INTERACTIVE MONTH CALENDAR GRID */}
                <div className="mindora-card" style={{ padding: '1.5rem' }}>
                    {/* Month Navigation Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>
                                {format(currentMonth, 'MMMM yyyy')}
                            </h2>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Click a date to inspect or double-click to schedule a new reminder
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.45rem' }}>
                            <button
                                type="button"
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1.5px solid var(--border-light)', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '1.05rem' }}
                            >
                                ‹
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1.5px solid var(--border-light)', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '1.05rem' }}
                            >
                                ›
                            </button>
                        </div>
                    </div>

                    {/* Weekday Headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '0.5rem' }}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                            <div key={d} style={{ fontSize: '0.76rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0.35rem 0' }}>
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Date Cells */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                        {calendarDays.map((day) => {
                            const isToday = isSameDay(day, new Date());
                            const isSelected = isSameDay(day, selectedDate);
                            const inCurrentMonth = isSameMonth(day, currentMonth);
                            const dayEvents = filteredEvents.filter((ev) => isSameDay(parseISO(ev.startDate), day));

                            return (
                                <div
                                    key={day.toString()}
                                    onClick={() => setSelectedDate(day)}
                                    onDoubleClick={() => openAddModal(day)}
                                    style={{
                                        minHeight: '96px',
                                        padding: '0.5rem',
                                        borderRadius: '12px',
                                        background: isSelected
                                            ? 'var(--bg-subtle)'
                                            : inCurrentMonth
                                            ? 'var(--bg-elevated)'
                                            : 'transparent',
                                        border: isSelected
                                            ? '2px solid #4f46e5'
                                            : isToday
                                            ? '2px solid #f59e0b'
                                            : '1px solid var(--border-light)',
                                        opacity: inCurrentMonth ? 1 : 0.42,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span
                                            style={{
                                                width: '26px',
                                                height: '26px',
                                                borderRadius: '50%',
                                                background: isToday ? '#f59e0b' : isSelected ? '#4f46e5' : 'transparent',
                                                color: isToday ? '#0f172a' : isSelected ? '#ffffff' : 'var(--text-primary)',
                                                fontWeight: isToday || isSelected ? '800' : '600',
                                                fontSize: '0.8rem',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {format(day, 'd')}
                                        </span>
                                        {isToday && (
                                            <span style={{ fontSize: '0.62rem', fontWeight: '800', color: '#f59e0b' }}>TODAY</span>
                                        )}
                                    </div>

                                    {/* Event Indicators Inside Cell */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.22rem', marginTop: '0.35rem' }}>
                                        {dayEvents.slice(0, 2).map((ev) => {
                                            const meta = EVENT_CATEGORIES[ev.category] || EVENT_CATEGORIES['Study Session'];
                                            return (
                                                <div
                                                    key={ev._id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(ev);
                                                    }}
                                                    style={{
                                                        background: meta.bg,
                                                        color: meta.color,
                                                        borderLeft: `3px solid ${meta.color}`,
                                                        padding: '0.15rem 0.35rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.66rem',
                                                        fontWeight: '700',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}
                                                >
                                                    {ev.title}
                                                </div>
                                            );
                                        })}
                                        {dayEvents.length > 2 && (
                                            <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                                                +{dayEvents.length - 2} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: SELECTED DATE SCHEDULE & UPCOMING REMINDERS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Card 1: Selected Date Details */}
                    <div className="mindora-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase' }}>
                                    Selected Date
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800' }}>
                                    {format(selectedDate, 'EEEE, MMM d, yyyy')}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => openAddModal(selectedDate)}
                                style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
                            >
                                + Add on Date
                            </button>
                        </div>

                        {selectedDateEvents.length === 0 ? (
                            <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px dashed var(--border-strong)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                                No reminders scheduled for {format(selectedDate, 'MMM d')}.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                {selectedDateEvents.map((ev) => {
                                    const meta = EVENT_CATEGORIES[ev.category] || EVENT_CATEGORIES['Study Session'];
                                    return (
                                        <div
                                            key={ev._id}
                                            onClick={() => openEditModal(ev)}
                                            style={{
                                                padding: '0.85rem 1rem',
                                                borderRadius: '12px',
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-light)',
                                                borderLeft: `4px solid ${meta.color}`,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <strong style={{ fontSize: '0.92rem' }}>{ev.title}</strong>
                                                <span style={{ background: meta.bg, color: meta.color, padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.68rem', fontWeight: '800' }}>
                                                    {ev.category}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                🕒 {format(parseISO(ev.startDate), 'h:mm a')} – {format(parseISO(ev.endDate), 'h:mm a')}
                                                {ev.location ? ` • 📍 ${ev.location}` : ''}
                                            </div>
                                            {ev.description && (
                                                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    {ev.description}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Card 2: Upcoming Academic Reminders */}
                    <div className="mindora-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '800' }}>
                            ⏰ Upcoming Reminders & Deadlines
                        </h3>

                        {upcomingEvents.length === 0 ? (
                            <div style={{ padding: '1.4rem', borderRadius: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                                <div style={{ fontWeight: '800', fontSize: '0.95rem', marginBottom: '0.3rem' }}>
                                    Your next important date deserves a reminder.
                                </div>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 0.9rem 0', lineHeight: '1.5' }}>
                                    Add an exam date, assignment deadline, or study session so nothing important slips through.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => openAddModal(new Date())}
                                    className="indigo-pill-btn"
                                    style={{ padding: '0.5rem 1.15rem', fontSize: '0.82rem' }}
                                >
                                    + Add First Reminder
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                {upcomingEvents.map((ev) => {
                                    const meta = EVENT_CATEGORIES[ev.category] || EVENT_CATEGORIES['Study Session'];
                                    return (
                                        <div
                                            key={ev._id}
                                            onClick={() => openEditModal(ev)}
                                            style={{
                                                padding: '0.75rem 0.95rem',
                                                borderRadius: '10px',
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-light)',
                                                borderLeft: `4px solid ${meta.color}`,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '0.75rem'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '0.88rem' }}>{ev.title}</div>
                                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                                    {format(parseISO(ev.startDate), 'MMM d, yyyy • h:mm a')}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '0.74rem', fontWeight: '700', color: meta.color, flexShrink: 0 }}>
                                                Edit →
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* =========================================================
                MODAL: CREATE / EDIT REMINDER
               ========================================================= */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '1rem' }}>
                    <div className="mindora-card" style={{ width: '100%', maxWidth: '460px', padding: '1.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>
                                {editingEvent ? 'Edit Academic Reminder' : 'Schedule Academic Reminder'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem' }}>Title *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Operating Systems Midterm Exam"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="mindora-input"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem' }}>Category</label>
                                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="mindora-input">
                                        {Object.keys(EVENT_CATEGORIES).map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem' }}>Date *</label>
                                    <input type="date" required value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="mindora-input" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem' }}>Start Time *</label>
                                    <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mindora-input" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem' }}>End Time</label>
                                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mindora-input" />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem' }}>Room / Location (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Turing Block Room 302 or Online Link"
                                    value={locationStr}
                                    onChange={(e) => setLocationStr(e.target.value)}
                                    className="mindora-input"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem' }}>Notes / Syllabus Topics</label>
                                <textarea
                                    rows="2"
                                    placeholder="Add key details or preparation checklist..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="mindora-input"
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                                {editingEvent ? (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteEvent(editingEvent._id)}
                                        style={{ background: 'rgba(239,68,68,0.14)', color: '#ef4444', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Delete
                                    </button>
                                ) : <div />}

                                <div style={{ display: 'flex', gap: '0.55rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: '0.6rem 1.15rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="indigo-pill-btn" style={{ borderRadius: '8px', padding: '0.6rem 1.35rem' }}>
                                        Save Reminder
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}