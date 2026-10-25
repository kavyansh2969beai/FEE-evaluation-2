import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { API_BASE_URL } from '../api';

export default function FriendManager({ onStartChat }) {
    const { token, user: currentUser } = useAuthStore();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchFriendsData = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/users/friends`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFriends(response.data.friends || []);
            setFriendRequests(response.data.friendRequests || []);
        } catch (error) {
            toast.error("Failed to load friends network.");
        }
    };

    useEffect(() => {
        if (token) fetchFriendsData();
    }, [token]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setIsLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/users/search?search=${encodeURIComponent(searchQuery)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearchResults(response.data);
        } catch (error) {
            toast.error("Search failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const sendRequest = async (targetId) => {
        try {
            await axios.post(`${API_BASE_URL}/api/users/friend-request/${targetId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Friend request sent!");
            // Update local search result state to show 'Cancel Request'
            setSearchResults(prev => prev.map(u => 
                u._id === targetId 
                    ? { ...u, friendRequests: [...(u.friendRequests || []), currentUser._id] } 
                    : u
            ));
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send request.");
        }
    };

    const acceptRequest = async (senderId) => {
        try {
            await axios.post(`${API_BASE_URL}/api/users/accept-request/${senderId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Friend request accepted!");
            fetchFriendsData();
        } catch (error) {
            toast.error("Failed to accept request.");
        }
    };

    const rejectOrCancelRequest = async (otherUserId, isCancel = false) => {
        try {
            await axios.post(`${API_BASE_URL}/api/users/reject-request/${otherUserId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(isCancel ? "Friend request canceled." : "Friend request rejected.");
            if (isCancel) {
                setSearchResults(prev => prev.map(u => 
                    u._id === otherUserId 
                        ? { ...u, friendRequests: (u.friendRequests || []).filter(id => id !== currentUser._id) } 
                        : u
                ));
            } else {
                fetchFriendsData();
            }
        } catch (error) {
            toast.error("Failed to update friend request.");
        }
    };

    const isAlreadyFriend = (userId) => friends.some(f => f._id === userId);
    const hasPendingOutgoing = (userObj) => (userObj.friendRequests || []).includes(currentUser?._id);

    return (
        <div style={{ background: '#f8fafc', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', overflowY: 'auto' }}>
            
            {/* 1. SEARCH BY NAME OR ROLL NUMBER */}
            <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#0f172a' }}>Find Students</h3>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                        type="text" 
                        placeholder="Name or Roll Number..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                    <button type="submit" disabled={isLoading} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '0.5rem 0.9rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                        {isLoading ? '...' : 'Search'}
                    </button>
                </form>

                {searchResults.length > 0 && (
                    <div style={{ marginTop: '0.75rem', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '0.5rem' }}>
                        {searchResults.map(u => (
                            <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>{u.name}</p>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                                        Roll No: <strong>{u.rollNumber || 'N/A'}</strong>
                                    </p>
                                </div>
                                {isAlreadyFriend(u._id) ? (
                                    <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>Friends ✓</span>
                                ) : hasPendingOutgoing(u) ? (
                                    <button onClick={() => rejectOrCancelRequest(u._id, true)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>
                                        Cancel
                                    </button>
                                ) : (
                                    <button onClick={() => sendRequest(u._id)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.3rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
                                        Add Friend
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. PENDING INCOMING REQUESTS */}
            {friendRequests.length > 0 && (
                <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#d97706' }}>Pending Requests ({friendRequests.length})</h3>
                    <div style={{ background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '0.5rem' }}>
                        {friendRequests.map(req => (
                            <div key={req._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem' }}>{req.name}</p>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Roll No: {req.rollNumber || 'N/A'}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button onClick={() => acceptRequest(req._id)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.25rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
                                        Accept
                                    </button>
                                    <button onClick={() => rejectOrCancelRequest(req._id, false)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.25rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. ACCEPTED FRIENDS LIST */}
            <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#0f172a' }}>My Friends ({friends.length})</h3>
                {friends.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>No friends added yet. Search by name or roll number above!</p>
                ) : (
                    <div style={{ background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '0.5rem' }}>
                        {friends.map(friend => (
                            <div key={friend._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>{friend.name}</p>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Roll No: {friend.rollNumber || 'N/A'}</p>
                                </div>
                                <button 
                                    onClick={() => onStartChat(friend._id)} 
                                    style={{ background: '#2563eb', color: 'white', border: 'none', padding: '0.3rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
                                    Message
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}