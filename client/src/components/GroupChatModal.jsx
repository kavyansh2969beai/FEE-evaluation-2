import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { API_BASE_URL } from '../api';

export default function GroupChatModal({ isOpen, onClose, onGroupCreated }) {
    const token = useAuthStore((state) => state.token);
    
    const [groupChatName, setGroupChatName] = useState('');
    const [friends, setFriends] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);

    // Fetch the user's friends as soon as the modal opens
    useEffect(() => {
        if (isOpen && token) {
            axios.get(`${API_BASE_URL}/api/users/friends`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => setFriends(res.data.friends))
            .catch(err => toast.error("Failed to load friends."));
        }
    }, [isOpen, token]);

    // Handle adding a friend to the selected list
    const handleAddUser = (userToAdd) => {
        if (selectedUsers.some(user => user._id === userToAdd._id)) {
            return toast.error("User already added to the group.");
        }
        setSelectedUsers([...selectedUsers, userToAdd]);
    };

    // Handle removing a friend from the selected list before creating the group
    const handleRemoveUser = (userToRemove) => {
        setSelectedUsers(selectedUsers.filter(user => user._id !== userToRemove._id));
    };

    // Send the group data to the backend
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!groupChatName || selectedUsers.length === 0) {
            return toast.error("Please provide a group name and add at least one friend.");
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/api/chats/group`, {
                name: groupChatName,
                // The backend expects an array of user IDs stringified
                users: JSON.stringify(selectedUsers.map(u => u._id))
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Group created successfully!");
            onGroupCreated(response.data); // Pass the new group back to the Chat page
            
            // Reset the form and close modal
            setGroupChatName('');
            setSelectedUsers([]);
            onClose();
        } catch (error) {
            toast.error("Failed to create group chat.");
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Create Study Group</h2>
                
                <form onSubmit={handleSubmit}>
                    <input 
                        type="text" 
                        placeholder="Group Name (e.g. AI Project Team)" 
                        value={groupChatName}
                        onChange={(e) => setGroupChatName(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '1rem' }}
                    />
                    
                    {/* Display selected friends as removable chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                        {selectedUsers.map(user => (
                            <span key={user._id} style={{ background: '#3b82f6', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '999px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {user.name}
                                <span onClick={() => handleRemoveUser(user)} style={{ cursor: 'pointer', fontWeight: 'bold' }}>×</span>
                            </span>
                        ))}
                    </div>

                    <h4 style={{ marginBottom: '0.5rem', marginTop: 0 }}>Select Friends</h4>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '1.5rem' }}>
                        {friends.length === 0 ? (
                            <p style={{ padding: '0.5rem', margin: 0, fontSize: '0.9rem', color: '#64748b' }}>No friends available. Add friends first!</p>
                        ) : (
                            friends.map(friend => (
                                <div key={friend._id} onClick={() => handleAddUser(friend)} style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{friend.name}</span>
                                    <span style={{ color: '#3b82f6', fontSize: '0.8rem' }}>+ Add</span>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Create Group</button>
                    </div>
                </form>
            </div>
        </div>
    );
}