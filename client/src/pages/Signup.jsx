import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../api';

export default function Register() {
    const [name, setName] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/auth/signup`, {
                name,
                rollNumber,
                email,
                password
            });
            toast.success('Account created! Please log in.');
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    const isReady = name && rollNumber && email && password;

    return (
        <div className="auth-dotted-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
                
                <div style={{ marginBottom: '1.5rem' }}>
                    <Link to="/" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-block', marginBottom: '0.75rem' }}>
                        ← Back to Mindora
                    </Link>
                    <h1 style={{ fontSize: '2.4rem', fontWeight: '800', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>Sign up</h1>
                    <p style={{ color: '#d4d4d8', fontSize: '1.05rem', margin: 0 }}>You belong here</p>
                </div>

                {/* OAuth Style Pill Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    <button
                        type="button"
                        onClick={() => toast('Complete the quick student form below!', { icon: '✨' })}
                        style={{ width: '100%', padding: '0.7rem', borderRadius: '999px', background: 'white', color: '#0f172a', border: 'none', fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
                    >
                        <span style={{ color: '#ea4335', fontWeight: '900' }}>G</span> Sign up with Google
                    </button>
                    <button
                        type="button"
                        onClick={() => toast('Complete the quick student form below!', { icon: '✨' })}
                        style={{ width: '100%', padding: '0.7rem', borderRadius: '999px', background: 'white', color: '#0f172a', border: 'none', fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
                    >
                        <span>🪟</span> Sign up with Microsoft
                    </button>
                    <button
                        type="button"
                        onClick={() => toast('Complete the quick student form below!', { icon: '✨' })}
                        style={{ width: '100%', padding: '0.7rem', borderRadius: '999px', background: 'white', color: '#0f172a', border: 'none', fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
                    >
                        <span></span> Sign up with Apple
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#e4e4e7' }}>
                        Or, sign up with email
                    </label>

                    <input
                        type="text"
                        className="auth-dark-input"
                        placeholder="Full Name (e.g. Preetmanraj)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />

                    <input
                        type="text"
                        className="auth-dark-input"
                        placeholder="University Roll Number"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        required
                    />

                    <input
                        type="email"
                        className="auth-dark-input"
                        placeholder="harrypotter@hogwarts.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <input
                        type="password"
                        className="auth-dark-input"
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {/* Verification Badge */}
                    <div style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '6px', padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#16a34a', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                ✓
                            </span>
                            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#e4e4e7' }}>Success!</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '0.04em', fontWeight: '700' }}>MINDORA GUARD</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{ background: isReady ? '#ff2e7e' : '#27272a', color: isReady ? 'white' : '#71717a', border: 'none', padding: '0.75rem 1.75rem', borderRadius: '999px', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
                        >
                            {isLoading ? 'Creating...' : 'Continue'}
                        </button>
                    </div>
                </form>

                <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#a1a1aa' }}>
                    Already have an account? <Link to="/login" style={{ color: '#f59e0b', textDecoration: 'underline', fontWeight: '600' }}>Log in</Link>
                </p>

                <p style={{ marginTop: '1.75rem', fontSize: '0.75rem', color: '#a1a1aa', lineHeight: '1.6' }}>
                    By signing up, you agree to our <span style={{ textDecoration: 'underline' }}>Terms of Service</span> and <span style={{ textDecoration: 'underline' }}>Privacy Policy</span>. You also admit that you are beautiful.
                </p>
            </div>
        </div>
    );
}