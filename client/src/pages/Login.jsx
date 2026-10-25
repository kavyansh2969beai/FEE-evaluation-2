import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { API_BASE_URL } from '../api';

export default function Login() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [verified, setVerified] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
                identifier,
                password
            });
            login(response.data.user, response.data.token);
            toast.success('Welcome back to Mindora!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-dotted-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
                
                <div style={{ marginBottom: '1.75rem' }}>
                    <Link to="/" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-block', marginBottom: '0.75rem' }}>
                        ← Back to Mindora
                    </Link>
                    <h1 style={{ fontSize: '2.4rem', fontWeight: '800', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>Log in</h1>
                    <p style={{ color: '#d4d4d8', fontSize: '1.05rem', margin: 0 }}>You belong here</p>
                </div>

                {/* Quick OAuth Style Pill Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
                    <button
                        type="button"
                        onClick={() => toast('Use your roll number or university email below to sign in!', { icon: '🎓' })}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '999px', background: 'white', color: '#0f172a', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
                    >
                        <span style={{ color: '#ea4335', fontWeight: '900' }}>G</span> Continue with Google
                    </button>
                    <button
                        type="button"
                        onClick={() => toast('Use your roll number or university email below to sign in!', { icon: '🎓' })}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '999px', background: 'white', color: '#0f172a', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
                    >
                        <span>🪟</span> Continue with Microsoft
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: '#e4e4e7' }}>
                            Roll number or email
                        </label>
                        <input
                            type="text"
                            autoComplete="username"
                            className="auth-dark-input"
                            placeholder="University roll number or email"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <input
                            type="password"
                            className="auth-dark-input"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {/* Verification Check Card */}
                    <div
                        onClick={() => setVerified(!verified)}
                        style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '6px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    >
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
                            style={{ background: identifier && password ? '#ff2e7e' : '#27272a', color: identifier && password ? 'white' : '#71717a', border: 'none', padding: '0.75rem 1.75rem', borderRadius: '999px', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
                        >
                            {isLoading ? 'Signing in...' : 'Continue'}
                        </button>
                    </div>
                </form>

                <p style={{ marginTop: '1.75rem', fontSize: '0.85rem', color: '#a1a1aa' }}>
                    Don&apos;t have an account? <Link to="/signup" style={{ color: '#f59e0b', textDecoration: 'underline', fontWeight: '600' }}>Sign up</Link>
                </p>

                <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#a1a1aa', lineHeight: '1.6' }}>
                    By logging in, you agree to our <span style={{ textDecoration: 'underline' }}>Terms of Service</span> and <span style={{ textDecoration: 'underline' }}>Privacy Policy</span>. You also admit that you are beautiful.
                </p>
            </div>
        </div>
    );
}