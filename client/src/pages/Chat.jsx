import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import io from 'socket.io-client';
import useAuthStore from '../store/authStore';
import { getAvatarUrl } from '../components/Navbar';
import { API_BASE_URL } from '../api';

export default function Chat() {
    const { user, token } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();

    const currentUserId = String(user?._id || user?.id || '');

    // Conversations, Friends & Filter State
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [chatFilter, setChatFilter] = useState('all'); // 'all', 'unread', 'groups'
    const [chatSearch, setChatSearch] = useState('');
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [unreadMap, setUnreadMap] = useState({});

    // Active Conversation Messages State
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [renameInput, setRenameInput] = useState('');

    // Action Menu & Modals State
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isExploreGroupsOpen, setIsExploreGroupsOpen] = useState(false);

    // Add Friend Modal State
    const [rollSearchQuery, setRollSearchQuery] = useState('');
    const [rollSearchResults, setRollSearchResults] = useState([]);
    const [isSearchingStudents, setIsSearchingStudents] = useState(false);

    // Create Group Modal State
    const [groupName, setGroupName] = useState('');
    const [groupDesc, setGroupDesc] = useState('');
    const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);

    // Explore Groups Modal State
    const [campusGroups, setCampusGroups] = useState([]);

    const socketRef = useRef(null);
    const selectedChatRef = useRef(null);
    const messagesEndRef = useRef(null);
    const actionMenuRef = useRef(null);
    const [socketConnected, setSocketConnected] = useState(false);

    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        selectedChatRef.current = selectedChat;
        window.__MINDORA_ACTIVE_CHAT_ID__ = selectedChat?._id || null;
        return () => {
            window.__MINDORA_ACTIVE_CHAT_ID__ = null;
        };
    }, [selectedChat]);

    useEffect(() => {
        const handleOutside = (e) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
                setIsActionMenuOpen(false);
            }
        };
        const handleEsc = (e) => {
            if (e.key === 'Escape') setIsActionMenuOpen(false);
        };
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, []);

    // 1. Initialize Socket.io
    useEffect(() => {
        if (!currentUserId) return;

        const newSocket = io(API_BASE_URL, { auth: { token } });
        socketRef.current = newSocket;

        newSocket.on('connected', () => setSocketConnected(true));
        newSocket.on('connect_error', (error) => {
            setSocketConnected(false);
            console.error('Chat socket connection failed:', error.message);
        });

        newSocket.on('message_received', (newMsg) => {
            const incomingChatId = String(newMsg.conversation?._id || newMsg.conversation);
            const activeChat = selectedChatRef.current;

            if (!activeChat || String(activeChat._id) !== incomingChatId) {
                setUnreadMap((prev) => ({
                    ...prev,
                    [incomingChatId]: (prev[incomingChatId] || 0) + 1
                }));
            } else {
                setMessages((prev) => {
                    if (prev.some((m) => m._id === newMsg._id)) return prev;
                    return [...prev, newMsg];
                });
                axios.put(`${API_BASE_URL}/api/chats/read/${incomingChatId}`, {}, { headers }).catch((error) => {
                    console.error('markChatRead error:', error);
                });
            }
            fetchChats();
        });

        return () => newSocket.disconnect();
    }, [currentUserId, token]);

    // 2. Fetch Conversations & Unread Counts
    async function fetchChats() {
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/chats`, { headers });
            const list = Array.isArray(res.data) ? res.data : [];
            setChats(list);

            const persistedUnreads = {};
            list.forEach((c) => {
                const rawMap = c.unreadCounts || {};
                const count = Number(rawMap[currentUserId] || 0);
                if (selectedChatRef.current && String(selectedChatRef.current._id) === String(c._id)) {
                    persistedUnreads[c._id] = 0;
                } else {
                    persistedUnreads[c._id] = count;
                }
            });
            setUnreadMap(persistedUnreads);
        } catch (error) {
            console.error('fetchChats error:', error);
            toast.error(error.response?.data?.message || 'Could not load conversations.');
        }
    }

    const fetchFriendsData = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/users/friends`, { headers });
            setFriends(res.data.friends || []);
            setFriendRequests(res.data.friendRequests || []);
        } catch (error) {
            console.error('fetchFriendsData error:', error);
        }
    };

    useEffect(() => {
        if (token) {
            fetchChats();
            fetchFriendsData();
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;
        if (location.state?.friendId) {
            accessChat(location.state.friendId);
            window.history.replaceState({}, document.title);
        } else if (location.state?.chatId && chats.length > 0) {
            const target = chats.find((c) => String(c._id) === String(location.state.chatId));
            if (target) setSelectedChat(target);
            window.history.replaceState({}, document.title);
        }
    }, [location.state, token, chats.length]);

    // 3. Fetch Messages when a Conversation is Selected
    const fetchMessages = async (chat) => {
        if (!chat || !chat._id) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/chats/message/${chat._id}`, { headers });
            setMessages(Array.isArray(res.data) ? res.data : []);
            if (socketRef.current) {
                socketRef.current.emit('join_chat', chat._id);
            }
            setUnreadMap((prev) => ({ ...prev, [chat._id]: 0 }));
        } catch (error) {
            console.error('fetchMessages error:', error);
            setMessages([]);
            toast.error(error.response?.data?.message || 'Could not load messages.');
        }
    };

    useEffect(() => {
        if (selectedChat && selectedChat._id) {
            setMessages([]);
            fetchMessages(selectedChat);
            setIsInfoOpen(false);
            if (selectedChat.isGroupChat) setRenameInput(selectedChat.chatName || '');
        }
    }, [selectedChat?._id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 4. Open or Start 1-on-1 Personal Chat
    async function accessChat(friendId, friendObj = null) {
        const targetId = String(friendId?._id || friendId || '').trim();
        if (!targetId) return;

        // A. If a 1-on-1 conversation with this friend is already in state, select it immediately
        const existingLocal = chats.find(
            (c) =>
                !c.isGroupChat &&
                (c.participants || []).some((p) => String(p?._id || p) === targetId)
        );
        if (existingLocal) {
            setSelectedChat(existingLocal);
            return;
        }

        // B. Otherwise request or create the conversation on the server
        try {
            const res = await axios.post(
                `${API_BASE_URL}/api/chats`,
                { userId: targetId },
                { headers }
            );
            let chatData = res.data;

            if (chatData && chatData._id) {
                // Ensure participant objects are hydrated for header name & avatar display
                const knownFriend = friendObj || friends.find((f) => String(f._id) === targetId);
                if (
                    knownFriend &&
                    (!Array.isArray(chatData.participants) ||
                        !chatData.participants.some((p) => typeof p === 'object' && String(p._id) === targetId))
                ) {
                    chatData = {
                        ...chatData,
                        participants: [
                            { _id: currentUserId, name: user?.name || 'You', rollNumber: user?.rollNumber },
                            knownFriend
                        ]
                    }
                }

                setChats((prev) => {
                    const exists = prev.some((c) => String(c._id) === String(chatData._id));
                    return exists
                        ? prev.map((c) => (String(c._id) === String(chatData._id) ? chatData : c))
                        : [chatData, ...prev];
                });
                setSelectedChat(chatData);
            }
        } catch (error) {
            console.error('accessChat error:', error);
            toast.error(error.response?.data?.message || 'Could not open conversation.');
        }
    };

    // 5. Send Message
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;

        try {
            const res = await axios.post(
                `${API_BASE_URL}/api/chats/message`,
                { content: newMessage, chatId: selectedChat._id },
                { headers }
            );
            setNewMessage('');
            setMessages((prev) => [...prev, res.data]);
            fetchChats();
        } catch {
            toast.error('Failed to send message.');
        }
    };

    // 6. Add Friend Modal Search & Request Actions
    const handleStudentSearch = async (e) => {
        if (e) e.preventDefault();
        setIsSearchingStudents(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}/api/users/search?search=${encodeURIComponent(rollSearchQuery)}`,
                { headers }
            );
            setRollSearchResults(res.data || []);
        } catch {
            toast.error('Search failed.');
        } finally {
            setIsSearchingStudents(false);
        }
    };

    const handleSendFriendRequest = async (targetId) => {
        try {
            await axios.post(`${API_BASE_URL}/api/users/friend-request/${targetId}`, {}, { headers });
            toast.success('Friend request sent!');
            setRollSearchResults((prev) =>
                prev.map((u) =>
                    u._id === targetId
                        ? { ...u, friendRequests: [...(u.friendRequests || []), currentUserId] }
                        : u
                )
            );
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send request.');
        }
    };

    const handleAcceptFriendRequest = async (senderId) => {
        try {
            await axios.post(`${API_BASE_URL}/api/users/accept-request/${senderId}`, {}, { headers });
            toast.success('Friend request accepted!');
            await fetchFriendsData();
            accessChat(senderId);
        } catch {
            toast.error('Failed to accept request.');
        }
    };

    const handleRejectOrCancelRequest = async (otherId, isCancel = false) => {
        try {
            await axios.post(`${API_BASE_URL}/api/users/reject-request/${otherId}`, {}, { headers });
            toast.success(isCancel ? 'Request cancelled.' : 'Request declined.');
            if (isCancel) {
                setRollSearchResults((prev) =>
                    prev.map((u) =>
                        u._id === otherId
                            ? { ...u, friendRequests: (u.friendRequests || []).filter((id) => String(id) !== currentUserId) }
                            : u
                    )
                );
            } else {
                fetchFriendsData();
            }
        } catch {
            toast.error('Action failed.');
        }
    };

    // 7. Create Group Handler
    const toggleMemberSelection = (friendObj) => {
        if (selectedGroupMembers.some((m) => m._id === friendObj._id)) {
            setSelectedGroupMembers(selectedGroupMembers.filter((m) => m._id !== friendObj._id));
        } else {
            setSelectedGroupMembers([...selectedGroupMembers, friendObj]);
        }
    };

    const handleCreateGroupSubmit = async (e) => {
        e.preventDefault();
        if (!groupName.trim()) return toast.error('Please enter a group name.');
        if (selectedGroupMembers.length === 0) return toast.error('Select at least 1 friend.');

        setIsCreatingGroup(true);
        try {
            const res = await axios.post(
                `${API_BASE_URL}/api/chats/group`,
                {
                    name: groupName.trim(),
                    description: groupDesc.trim(),
                    users: JSON.stringify(selectedGroupMembers.map((m) => m._id))
                },
                { headers }
            );
            setChats((prev) => [res.data, ...prev]);
            setSelectedChat(res.data);
            setIsCreateGroupOpen(false);
            setGroupName('');
            setGroupDesc('');
            setSelectedGroupMembers([]);
            toast.success(`Study group "${res.data.chatName}" created!`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create group.');
        } finally {
            setIsCreatingGroup(false);
        }
    };

    // 8. Explore & Join Campus Groups
    const openExploreGroupsModal = async () => {
        setIsActionMenuOpen(false);
        setIsExploreGroupsOpen(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/chats/groups/explore`, { headers });
            setCampusGroups(res.data || []);
        } catch {
            toast.error('Failed to load study groups.');
        }
    };

    const handleJoinCampusGroup = async (groupId) => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/chats/group/join/${groupId}`, {}, { headers });
            toast.success(`Joined "${res.data.chatName}"!`);
            setIsExploreGroupsOpen(false);
            await fetchChats();
            setSelectedChat(res.data);
        } catch {
            toast.error('Failed to join group.');
        }
    };

    // 9. Group Admin & Message Actions
    const handleRenameGroup = async (e) => {
        e.preventDefault();
        if (!renameInput.trim()) return;
        try {
            const res = await axios.put(
                `${API_BASE_URL}/api/chats/group/rename`,
                { chatId: selectedChat._id, chatName: renameInput },
                { headers }
            );
            setSelectedChat(res.data);
            fetchChats();
            toast.success('Group renamed!');
        } catch {
            toast.error('Failed to rename group.');
        }
    };

    const handleAddGroupMember = async (userIdToAdd) => {
        try {
            const res = await axios.put(
                `${API_BASE_URL}/api/chats/group/add`,
                { chatId: selectedChat._id, userId: userIdToAdd },
                { headers }
            );
            setSelectedChat(res.data);
            fetchChats();
            toast.success('Member added!');
        } catch {
            toast.error('Failed to add member.');
        }
    };

    const handleRemoveOrLeaveGroup = async (targetId, isLeaving = false) => {
        if (isLeaving && !window.confirm('Leave this study group?')) return;
        try {
            const res = await axios.put(
                `${API_BASE_URL}/api/chats/group/remove`,
                { chatId: selectedChat._id, userId: targetId },
                { headers }
            );
            if (isLeaving) {
                setSelectedChat(null);
                toast.success('Left group.');
            } else {
                setSelectedChat(res.data);
                toast.success('Member removed.');
            }
            fetchChats();
        } catch {
            toast.error('Action failed.');
        }
    };

    const handleDeleteMessage = async (messageId) => {
        try {
            await axios.delete(`${API_BASE_URL}/api/chats/message/${messageId}`, { headers });
            setMessages((prev) => prev.filter((m) => m._id !== messageId));
            fetchChats();
            toast.success('Message deleted.');
        } catch {
            toast.error('Failed to delete message.');
        }
    };

    const getOtherParticipant = (chat) => {
        if (!chat || chat.isGroupChat) return null;
        return (chat.participants || []).find((p) => String(p?._id || p) !== currentUserId) || chat.participants?.[0];
    };

    const getChatTitle = (chat) => {
        if (!chat) return '';
        if (chat.isGroupChat) return chat.chatName || 'Study Group';
        const friend = getOtherParticipant(chat);
        return friend?.name || 'Student';
    };

    const getChatRollOrSubtitle = (chat) => {
        if (!chat) return '';
        if (chat.isGroupChat) return `${(chat.participants || []).length} members`;
        const friend = getOtherParticipant(chat);
        return friend?.rollNumber ? `Roll #${friend.rollNumber}` : 'Personal Chat';
    };

    const getChatAvatar = (chat) => {
        if (!chat || chat.isGroupChat) return null;
        const friend = getOtherParticipant(chat);
        return getAvatarUrl(friend?.profilePicture);
    };

    const personalChatsCount = chats.filter((c) => !c.isGroupChat).length + friends.length;

    const filteredChats = chats.filter((c) => {
        const unreadCount = unreadMap[c._id] || 0;
        if (chatFilter === 'unread' && unreadCount === 0) return false;
        if (chatFilter === 'groups' && !c.isGroupChat) return false;

        if (!chatSearch.trim()) return true;
        const q = chatSearch.toLowerCase();
        const titleMatch = getChatTitle(c).toLowerCase().includes(q);
        const friendObj = getOtherParticipant(c);
        const rollMatch = friendObj?.rollNumber?.toLowerCase().includes(q);
        return titleMatch || rollMatch;
    });

    const unstartedFriends = friends.filter((f) => {
        if (chatFilter === 'unread' || chatFilter === 'groups') return false;
        const alreadyHasChat = chats.some(
            (c) => !c.isGroupChat && (c.participants || []).some((p) => String(p?._id || p) === String(f._id))
        );
        if (alreadyHasChat) return false;
        if (!chatSearch.trim()) return true;
        const q = chatSearch.toLowerCase();
        return f.name?.toLowerCase().includes(q) || f.rollNumber?.toLowerCase().includes(q);
    });

    const isGroupAdmin = selectedChat?.isGroupChat && String(selectedChat?.groupAdmin?._id || selectedChat?.groupAdmin) === currentUserId;

    return (
        <div
            style={{
                height: 'calc(100vh - 61px)',
                minHeight: 0,
                display: 'flex',
                overflow: 'hidden',
                backgroundColor: 'var(--chat-canvas-bg)',
                color: 'var(--text-primary)'
            }}
        >
            {/* =========================================================
                1. FAR-LEFT VERTICAL ACTION RAIL
               ========================================================= */}
            <aside
                style={{
                    width: '66px',
                    background: 'var(--chat-rail-bg)',
                    borderRight: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '1rem 0',
                    gap: '1rem',
                    zIndex: 20,
                    flexShrink: 0
                }}
            >
                <button
                    type="button"
                    onClick={() => setChatFilter('all')}
                    title="All Conversations"
                    style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: '#f59e0b',
                        color: '#0f172a',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
                    }}
                >
                    💬
                </button>

                <div style={{ width: '28px', height: '1px', background: 'rgba(255,255,255,0.15)' }} />

                {/* Button 1: Add Friend */}
                <button
                    type="button"
                    onClick={() => {
                        setIsAddFriendOpen(true);
                        handleStudentSearch();
                    }}
                    title="Add Friend (Search by Roll Number)"
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: isAddFriendOpen ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        position: 'relative'
                    }}
                >
                    <span style={{ fontSize: '1.15rem' }}>👤+</span>
                    {friendRequests.length > 0 && (
                        <span
                            style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                background: '#fde047',
                                color: '#0f172a',
                                borderRadius: '999px',
                                fontSize: '0.65rem',
                                fontWeight: '900',
                                padding: '0.05rem 0.35rem',
                                border: '1.5px solid #0f172a'
                            }}
                        >
                            {friendRequests.length}
                        </span>
                    )}
                </button>

                {/* Button 2: Make Group */}
                <button
                    type="button"
                    onClick={() => setIsCreateGroupOpen(true)}
                    title="Make Study Group"
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: isCreateGroupOpen ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        cursor: 'pointer'
                    }}
                >
                    👥
                </button>

                {/* Button 3: Resources / Projects */}
                <button
                    type="button"
                    onClick={() => navigate('/resources')}
                    title="Shared Resources & Projects"
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        cursor: 'pointer'
                    }}
                >
                    🚀
                </button>
            </aside>

            {/* =========================================================
                2. MIDDLE CONVERSATION LIST SIDEBAR (Theme-Aware)
               ========================================================= */}
            <section
                style={{
                    width: '360px',
                    background: 'var(--chat-sidebar-bg)',
                    borderRight: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                    height: '100%'
                }}
            >
                {/* Sidebar Header: "Chats" + Action Menu Trigger Icons */}
                <div
                    style={{
                        padding: '1rem 1.15rem 0.75rem 1.15rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'relative',
                        flexShrink: 0
                    }}
                >
                    <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        Chats
                    </h1>

                    <div ref={actionMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                            type="button"
                            onClick={() => setIsActionMenuOpen((prev) => !prev)}
                            title="Chat Actions"
                            style={{
                                background: isActionMenuOpen ? 'var(--bg-subtle)' : 'var(--bg-elevated)',
                                border: '1px solid var(--border-strong)',
                                color: 'var(--text-primary)',
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="4" />
                                <line x1="12" y1="8" x2="12" y2="16" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsActionMenuOpen((prev) => !prev)}
                            title="More Options"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                width: '28px',
                                height: '34px',
                                cursor: 'pointer',
                                fontSize: '1.15rem',
                                fontWeight: '800'
                            }}
                        >
                            ⋮
                        </button>

                        {isActionMenuOpen && (
                            <div
                                className="account-dropdown-anim"
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 'calc(100% + 8px)',
                                    width: '210px',
                                    background: 'var(--bg-surface)',
                                    border: '1.5px solid var(--border-strong)',
                                    borderRadius: '12px',
                                    padding: '0.45rem',
                                    boxShadow: 'var(--shadow-lg)',
                                    zIndex: 100
                                }}
                            >
                                {[
                                    { icon: '👥', label: 'Create Group', action: () => { setIsActionMenuOpen(false); setIsCreateGroupOpen(true); } },
                                    { icon: '👤+', label: 'Add Friend', action: () => { setIsActionMenuOpen(false); setIsAddFriendOpen(true); handleStudentSearch(); } },
                                    { icon: '🧭', label: 'Explore Groups', action: openExploreGroupsModal },
                                    { icon: '🚀', label: 'Resources & Projects', action: () => { setIsActionMenuOpen(false); navigate('/resources'); } }
                                ].map((item, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={item.action}
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
                                            gap: '0.65rem'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <span>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Search Bar & Filter Pills */}
                {(personalChatsCount > 0 || chats.length > 0) && (
                    <div style={{ padding: '0 1rem 0.75rem 1rem', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'var(--bg-elevated)',
                                border: '1.5px solid var(--border-strong)',
                                borderRadius: '999px',
                                padding: '0.45rem 0.85rem',
                                gap: '0.55rem',
                                marginBottom: '0.65rem'
                            }}
                        >
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Search conversations or roll no..."
                                value={chatSearch}
                                onChange={(e) => setChatSearch(e.target.value)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.86rem',
                                    width: '100%'
                                }}
                            />
                            {chatSearch && (
                                <button
                                    type="button"
                                    onClick={() => setChatSearch('')}
                                    title="Clear search"
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800' }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.45rem' }}>
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'unread', label: 'Unread' },
                                { id: 'groups', label: 'Groups' }
                            ].map((pill) => {
                                const active = chatFilter === pill.id;
                                return (
                                    <button
                                        key={pill.id}
                                        type="button"
                                        onClick={() => setChatFilter(pill.id)}
                                        style={{
                                            background: active ? '#f59e0b' : 'var(--bg-elevated)',
                                            color: active ? '#0f172a' : 'var(--text-secondary)',
                                            border: active ? '1px solid #f59e0b' : '1px solid var(--border-light)',
                                            padding: '0.28rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.76rem',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {pill.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Pending Friend Requests Banner */}
                {friendRequests.length > 0 && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.14)', borderBottom: '1px solid var(--border-light)', padding: '0.65rem 1rem', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#d97706', marginBottom: '0.4rem' }}>
                            👋 Incoming Friend Requests ({friendRequests.length})
                        </div>
                        {friendRequests.map((req) => (
                            <div key={req._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0' }}>
                                <div>
                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--text-primary)' }}>{req.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Roll #{req.rollNumber}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                    <button onClick={() => handleAcceptFriendRequest(req._id)} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}>Accept</button>
                                    <button onClick={() => handleRejectOrCancelRequest(req._id, false)} style={{ background: 'var(--bg-elevated)', color: '#ef4444', border: '1px solid var(--border-light)', padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}>✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Scrollable Conversation List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {chats.length === 0 && friends.length === 0 ? (
                        <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
                            <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                                Your Conversation List is Ready
                            </div>
                            <p style={{ fontSize: '0.8rem', lineHeight: '1.5', marginBottom: '1rem' }}>
                                Add classmates by their university roll number or join a campus study group to start messaging.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => { setIsAddFriendOpen(true); handleStudentSearch(); }}
                                    style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0.6rem', borderRadius: '999px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
                                >
                                    + Find Friends by Roll No
                                </button>
                                <button
                                    type="button"
                                    onClick={openExploreGroupsModal}
                                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', padding: '0.6rem', borderRadius: '999px', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer' }}
                                >
                                    Explore Campus Groups
                                </button>
                            </div>
                        </div>
                    ) : filteredChats.length === 0 && unstartedFriends.length === 0 ? (
                        <div style={{ padding: '2.5rem 1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                            No matching conversations found.
                        </div>
                    ) : (
                        <>
                            {filteredChats.map((chat) => {
                                const isSelected = selectedChat?._id === chat._id;
                                const unreadCount = unreadMap[chat._id] || 0;
                                const avatar = getChatAvatar(chat);
                                const title = getChatTitle(chat);
                                const timeStr = chat.latestMessage?.createdAt
                                    ? new Date(chat.latestMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : '';

                                return (
                                    <div
                                        key={chat._id}
                                        onClick={() => setSelectedChat(chat)}
                                        style={{
                                            padding: '0.8rem 1rem',
                                            borderBottom: '1px solid var(--border-light)',
                                            background: isSelected ? 'var(--chat-item-active)' : 'transparent',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.85rem',
                                            transition: 'background 0.15s ease'
                                        }}
                                    >
                                        {avatar ? (
                                            <img
                                                src={avatar}
                                                alt={title}
                                                style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border-strong)', flexShrink: 0 }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    width: '46px',
                                                    height: '46px',
                                                    borderRadius: '50%',
                                                    background: chat.isGroupChat ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : 'var(--bg-elevated)',
                                                    color: chat.isGroupChat ? '#0f172a' : 'var(--text-primary)',
                                                    border: '1.5px solid var(--border-strong)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: '800',
                                                    fontSize: '1.05rem',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {chat.isGroupChat ? '👥' : title.charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                                                    <span style={{ fontWeight: unreadCount > 0 ? '800' : '700', fontSize: '0.93rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {title}
                                                    </span>
                                                    {chat.isGroupChat && (
                                                        <span style={{ fontSize: '0.62rem', background: 'rgba(245, 158, 11, 0.16)', color: '#d97706', padding: '0.08rem 0.45rem', borderRadius: '999px', fontWeight: '800', flexShrink: 0 }}>
                                                            Group
                                                        </span>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: unreadCount > 0 ? '#d97706' : 'var(--text-muted)', fontWeight: unreadCount > 0 ? '800' : '500', flexShrink: 0 }}>
                                                    {timeStr}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                                <span
                                                    style={{
                                                        fontSize: '0.8rem',
                                                        color: unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                                                        fontWeight: unreadCount > 0 ? '600' : '400',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}
                                                >
                                                    {chat.latestMessage
                                                        ? `${String(chat.latestMessage.sender?._id || chat.latestMessage.sender) === currentUserId ? '✓✓ ' : ''}${chat.latestMessage.content}`
                                                        : getChatRollOrSubtitle(chat)}
                                                </span>

                                                {unreadCount > 0 && (
                                                    <span
                                                        style={{
                                                            background: '#fde047',
                                                            color: '#0f172a',
                                                            border: '1px solid #f59e0b',
                                                            borderRadius: '999px',
                                                            minWidth: '20px',
                                                            height: '20px',
                                                            padding: '0 6px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: '900',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        {unreadCount > 99 ? '99+' : unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Friends Ready to Message */}
                            {unstartedFriends.map((friend) => {
                                const fAvatar = getAvatarUrl(friend.profilePicture);
                                return (
                                    <div
                                        key={friend._id}
                                        onClick={() => accessChat(friend._id)}
                                        style={{
                                            padding: '0.8rem 1rem',
                                            borderBottom: '1px solid var(--border-light)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.85rem'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--chat-item-hover)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        {fAvatar ? (
                                            <img src={fAvatar} alt={friend.name} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1.5px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                                                {friend.name?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-primary)' }}>{friend.name}</div>
                                            <div style={{ fontSize: '0.76rem', color: '#d97706', fontWeight: '600' }}>Roll #{friend.rollNumber} • Click to start chat</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </section>

            {/* =========================================================
                3. RIGHT MAIN CONVERSATION AREA (Theme-Aware Canvas & Cards)
               ========================================================= */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', height: '100%' }}>
                {!selectedChat ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', overflowY: 'auto' }}>
                        <div style={{ maxWidth: '580px', width: '100%', textAlign: 'center' }}>
                            <div
                                style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '18px',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    border: '1.5px solid #f59e0b',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem',
                                    marginBottom: '1rem'
                                }}
                            >
                                💬
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                                Mindora Campus Messaging
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem' }}>
                                Select a conversation on the left or start a new connection with your classmates.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.15rem', textAlign: 'left' }}>
                                {/* Card 1: Start a Conversation */}
                                <div className="mindora-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👤+</div>
                                        <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                            Start a Conversation
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                            Add friends by their unique university roll number to connect with classmates and start chatting.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setIsAddFriendOpen(true); handleStudentSearch(); }}
                                        style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0.6rem 1.15rem', borderRadius: '999px', fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer', alignSelf: 'flex-start' }}
                                    >
                                        Find Friends →
                                    </button>
                                </div>

                                {/* Card 2: Create Your Circle */}
                                <div className="mindora-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👥</div>
                                        <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                            Create Your Circle
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                            Create or join a study group to discuss ideas, share resources, and study collaboratively.
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateGroupOpen(true)}
                                            style={{ background: 'var(--nav-active-bg)', color: 'var(--nav-active-text)', border: 'none', padding: '0.6rem 1.05rem', borderRadius: '999px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
                                        >
                                            Make Group
                                        </button>
                                        <button
                                            type="button"
                                            onClick={openExploreGroupsModal}
                                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', padding: '0.6rem 1rem', borderRadius: '999px', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer' }}
                                        >
                                            Explore Groups
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Active Chat Top Header */}
                        <div
                            style={{
                                padding: '0.8rem 1.5rem',
                                background: 'var(--chat-header-bg)',
                                borderBottom: '1px solid var(--border-light)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexShrink: 0
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                {getChatAvatar(selectedChat) ? (
                                    <img
                                        src={getChatAvatar(selectedChat)}
                                        alt={getChatTitle(selectedChat)}
                                        style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #f59e0b' }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '50%',
                                            background: '#f59e0b',
                                            color: '#0f172a',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '900',
                                            fontSize: '1.05rem'
                                        }}
                                    >
                                        {selectedChat.isGroupChat ? '👥' : getChatTitle(selectedChat).charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                            {getChatTitle(selectedChat)}
                                        </h2>
                                        <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '700' }}>●</span>
                                    </div>
                                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                        {getChatRollOrSubtitle(selectedChat)} {socketConnected ? '• Live' : ''}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsInfoOpen(!isInfoOpen)}
                                style={{
                                    background: isInfoOpen ? '#f59e0b' : 'var(--bg-elevated)',
                                    color: isInfoOpen ? '#0f172a' : 'var(--text-primary)',
                                    border: '1px solid var(--border-strong)',
                                    padding: '0.45rem 0.95rem',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                {isInfoOpen ? 'Close Info' : 'Chat Info'}
                            </button>
                        </div>

                        {/* Campus Verification Banner */}
                        <div style={{ textAlign: 'center', padding: '0.65rem 1rem 0 1rem', flexShrink: 0 }}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-light)',
                                    color: 'var(--text-secondary)',
                                    padding: '0.35rem 0.95rem',
                                    borderRadius: '8px',
                                    fontSize: '0.73rem',
                                    fontWeight: '600'
                                }}
                            >
                                🔒 Messages in Mindora are protected and verified with your university roll number.
                            </span>
                        </div>

                        {/* Messages Scroll Container */}
                        <div
                            style={{
                                flex: 1,
                                padding: '1.25rem 1.75rem',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.65rem'
                            }}
                        >
                            {messages.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '3rem', fontSize: '0.9rem' }}>
                                    No messages yet. Send the first message below!
                                </p>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = String(msg.sender?._id || msg.sender) === currentUserId;
                                    const time = msg.createdAt
                                        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        : '';

                                    return (
                                        <div
                                            key={msg._id || idx}
                                            style={{
                                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                                maxWidth: '68%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: isMe ? 'flex-end' : 'flex-start'
                                            }}
                                        >
                                            {/* MESSAGE BUBBLE: Incoming = Mindora Yellow | Outgoing = Neutral Gray */}
                                            <div
                                                style={{
                                                    background: isMe ? 'var(--chat-outgoing-bg)' : 'var(--chat-incoming-bg)',
                                                    color: isMe ? 'var(--chat-outgoing-text)' : 'var(--chat-incoming-text)',
                                                    border: isMe ? '1px solid var(--border-strong)' : '1px solid #f59e0b',
                                                    padding: '0.65rem 0.95rem',
                                                    borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                                    boxShadow: 'var(--shadow-sm)',
                                                    position: 'relative'
                                                }}
                                            >
                                                {selectedChat.isGroupChat && !isMe && (
                                                    <div style={{ fontSize: '0.72rem', fontWeight: '900', color: '#b45309', marginBottom: '0.2rem' }}>
                                                        {msg.sender?.name || 'Classmate'}
                                                    </div>
                                                )}

                                                <div style={{ fontSize: '0.9rem', lineHeight: '1.45', wordBreak: 'break-word', fontWeight: isMe ? '500' : '600' }}>
                                                    {msg.content}
                                                </div>

                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'flex-end',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        marginTop: '0.25rem',
                                                        fontSize: '0.66rem',
                                                        color: isMe ? '#cbd5e1' : '#334155',
                                                        fontWeight: '700'
                                                    }}
                                                >
                                                    <span>{time}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(msg.content);
                                                            toast.success('Copied!');
                                                        }}
                                                        title="Copy message"
                                                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.68rem', padding: 0 }}
                                                    >
                                                        📋
                                                    </button>
                                                    {isMe && msg._id && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteMessage(msg._id)}
                                                            title="Delete message"
                                                            style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.68rem', padding: 0 }}
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Slide-Over Chat Info Drawer */}
                        {isInfoOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '59px',
                                    right: 0,
                                    bottom: '64px',
                                    width: '310px',
                                    background: 'var(--bg-surface)',
                                    borderLeft: '1px solid var(--border-light)',
                                    padding: '1.25rem',
                                    overflowY: 'auto',
                                    zIndex: 30,
                                    boxShadow: 'var(--shadow-lg)'
                                }}
                            >
                                <h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Conversation Info</h3>
                                {selectedChat.description && (
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{selectedChat.description}</p>
                                )}

                                {selectedChat.isGroupChat && isGroupAdmin && (
                                    <form onSubmit={handleRenameGroup} style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                                        <input
                                            type="text"
                                            value={renameInput}
                                            onChange={(e) => setRenameInput(e.target.value)}
                                            className="mindora-input"
                                            style={{ padding: '0.45rem 0.7rem', fontSize: '0.82rem' }}
                                        />
                                        <button type="submit" style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0.45rem 0.75rem', borderRadius: '8px', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer' }}>
                                            Save
                                        </button>
                                    </form>
                                )}

                                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    MEMBERS ({(selectedChat.participants || []).length})
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
                                    {(selectedChat.participants || []).map((member) => (
                                        <div key={member._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border-light)' }}>
                                            <div>
                                                <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    {member.name}{' '}
                                                    {String(selectedChat.groupAdmin?._id || selectedChat.groupAdmin) === String(member._id) && (
                                                        <span style={{ color: '#d97706', fontSize: '0.68rem' }}>(Admin)</span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Roll #{member.rollNumber}</div>
                                            </div>
                                            {isGroupAdmin && String(member._id) !== currentUserId && (
                                                <button onClick={() => handleRemoveOrLeaveGroup(member._id, false)} style={{ background: 'rgba(239,68,68,0.14)', color: '#ef4444', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer' }}>
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {selectedChat.isGroupChat && isGroupAdmin && (
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ADD FRIENDS</div>
                                        {friends
                                            .filter((f) => !(selectedChat.participants || []).some((p) => String(p._id) === String(f._id)))
                                            .map((f) => (
                                                <div key={f._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', fontSize: '0.84rem' }}>
                                                    <span>{f.name}</span>
                                                    <button onClick={() => handleAddGroupMember(f._id)} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer' }}>
                                                        + Add
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                )}

                                {selectedChat.isGroupChat && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveOrLeaveGroup(currentUserId, true)}
                                        style={{ width: '100%', background: 'rgba(239,68,68,0.14)', color: '#ef4444', border: '1px solid #ef4444', padding: '0.55rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem' }}
                                    >
                                        Leave Group
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Bottom Message Input Bar */}
                        <form
                            onSubmit={sendMessage}
                            style={{
                                padding: '0.75rem 1.25rem',
                                background: 'var(--chat-header-bg)',
                                borderTop: '1px solid var(--border-light)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.65rem',
                                flexShrink: 0
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setNewMessage((prev) => `${prev} 😊`)}
                                title="Insert Emoji"
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
                            >
                                ☺
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/resources')}
                                title="Share Study Resource"
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.35rem', cursor: 'pointer', fontWeight: '700' }}
                            >
                                +
                            </button>
                            <input
                                type="text"
                                placeholder="Type a message"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="mindora-input"
                                style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '999px', fontSize: '0.9rem' }}
                            />
                            <button
                                type="submit"
                                style={{
                                    background: newMessage.trim() ? '#f59e0b' : 'var(--bg-elevated)',
                                    color: newMessage.trim() ? '#0f172a' : 'var(--text-muted)',
                                    border: '1px solid var(--border-strong)',
                                    padding: '0.65rem 1.35rem',
                                    borderRadius: '999px',
                                    fontWeight: '800',
                                    fontSize: '0.86rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Send
                            </button>
                        </form>
                    </>
                )}
            </main>

            {/* MODAL A: FIND FRIENDS BY ROLL NUMBER */}
            {isAddFriendOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '1rem' }}>
                    <div className="mindora-card" style={{ width: '100%', maxWidth: '460px', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Find Friends</h3>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Connect with classmates using their unique university roll number</span>
                            </div>
                            <button onClick={() => setIsAddFriendOpen(false)} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontWeight: '800' }}>✕</button>
                        </div>

                        <form onSubmit={handleStudentSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)' }}>🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search friends by roll number"
                                    value={rollSearchQuery}
                                    onChange={(e) => setRollSearchQuery(e.target.value)}
                                    className="mindora-input"
                                    style={{ paddingLeft: '2.35rem' }}
                                />
                            </div>
                            <button type="submit" disabled={isSearchingStudents} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0 1.2rem', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                                {isSearchingStudents ? '...' : 'Search'}
                            </button>
                        </form>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                            {rollSearchResults.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem 0', fontSize: '0.86rem' }}>
                                    No matching students found. Try searching by roll number or name.
                                </p>
                            ) : (
                                rollSearchResults.map((stu) => {
                                    const isFriend = friends.some((f) => String(f._id) === String(stu._id));
                                    const isPendingSent = (stu.friendRequests || []).map(String).includes(currentUserId);
                                    const sAvatar = getAvatarUrl(stu.profilePicture);

                                    return (
                                        <div key={stu._id} style={{ padding: '0.75rem', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                                {sAvatar ? (
                                                    <img src={sAvatar} alt={stu.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                                                        {stu.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div style={{ overflow: 'hidden' }}>
                                                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{stu.name}</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: '600' }}>Roll No: {stu.rollNumber || 'N/A'}</div>
                                                </div>
                                            </div>

                                            {isFriend ? (
                                                <button
                                                    onClick={() => { setIsAddFriendOpen(false); accessChat(stu._id); }}
                                                    style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer' }}
                                                >
                                                    Message →
                                                </button>
                                            ) : isPendingSent ? (
                                                <button
                                                    onClick={() => handleRejectOrCancelRequest(stu._id, true)}
                                                    style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
                                                >
                                                    Pending (Cancel)
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleSendFriendRequest(stu._id)}
                                                    style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}
                                                >
                                                    + Add Friend
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL B: CREATE STUDY GROUP */}
            {isCreateGroupOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '1rem' }}>
                    <div className="mindora-card" style={{ width: '100%', maxWidth: '460px', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Create Study Group</h3>
                            <button onClick={() => setIsCreateGroupOpen(false)} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontWeight: '800' }}>✕</button>
                        </div>

                        <form onSubmit={handleCreateGroupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Group Name *</label>
                                <input type="text" required placeholder="e.g., DBMS & OS Exam Squad" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="mindora-input" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Description (Optional)</label>
                                <input type="text" placeholder="Share notes, past papers, and study schedules..." value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} className="mindora-input" />
                            </div>

                            {selectedGroupMembers.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {selectedGroupMembers.map((m) => (
                                        <span key={m._id} style={{ background: 'rgba(245,158,11,0.18)', color: '#d97706', border: '1px solid #f59e0b', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                            {m.name}
                                            <button type="button" onClick={() => toggleMemberSelection(m)} style={{ background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', fontWeight: '900' }}>✕</button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                                    Select Friends ({selectedGroupMembers.length} selected)
                                </label>
                                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '0.5rem' }}>
                                    {friends.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', margin: '1rem 0' }}>Add friends first to invite them to a group.</p>
                                    ) : (
                                        friends.map((f) => {
                                            const isChosen = selectedGroupMembers.some((m) => m._id === f._id);
                                            return (
                                                <div
                                                    key={f._id}
                                                    onClick={() => toggleMemberSelection(f)}
                                                    style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: isChosen ? 'var(--bg-elevated)' : 'transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                >
                                                    <div>
                                                        <div style={{ fontSize: '0.86rem', fontWeight: '700', color: 'var(--text-primary)' }}>{f.name}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Roll #{f.rollNumber}</div>
                                                    </div>
                                                    <span style={{ color: isChosen ? '#d97706' : 'var(--text-muted)', fontWeight: '800', fontSize: '0.82rem' }}>
                                                        {isChosen ? '✓ Selected' : '+ Select'}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.35rem' }}>
                                <button type="button" onClick={() => setIsCreateGroupOpen(false)} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: '0.6rem 1.15rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={isCreatingGroup} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0.6rem 1.35rem', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                                    {isCreatingGroup ? 'Creating...' : 'Create Group'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL C: EXPLORE CAMPUS STUDY GROUPS */}
            {isExploreGroupsOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '1rem' }}>
                    <div className="mindora-card" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Explore Study Groups</h3>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Discover and join active student circles on Mindora</span>
                            </div>
                            <button onClick={() => setIsExploreGroupsOpen(false)} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontWeight: '800' }}>✕</button>
                        </div>

                        <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {campusGroups.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                                    <p style={{ margin: '0 0 0.75rem 0' }}>No study groups created yet. Be the first to start one!</p>
                                    <button onClick={() => { setIsExploreGroupsOpen(false); setIsCreateGroupOpen(true); }} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0.55rem 1.15rem', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}>
                                        + Create Group
                                    </button>
                                </div>
                            ) : (
                                campusGroups.map((grp) => (
                                    <div key={grp._id} style={{ padding: '0.9rem 1rem', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                                        <div>
                                            <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{grp.chatName}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0' }}>{grp.description}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: '700' }}>👥 {grp.memberCount} member(s)</div>
                                        </div>
                                        {grp.isMember ? (
                                            <button
                                                onClick={() => {
                                                    setIsExploreGroupsOpen(false);
                                                    const existing = chats.find((c) => c._id === grp._id);
                                                    if (existing) setSelectedChat(existing);
                                                }}
                                                style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', flexShrink: 0 }}
                                            >
                                                Open ✓
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleJoinCampusGroup(grp._id)}
                                                style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0.45rem 0.95rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', flexShrink: 0 }}
                                            >
                                                Join Group
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}