import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

// The "children" prop represents whatever page we are trying to protect (like the Dashboard)
export default function ProtectedRoute({ children }) {
    // Look inside our Zustand memory vault to see if the user has a token
    const token = useAuthStore((state) => state.token);

    // If there is no token, kick them back to the login page immediately
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // If they have a token, render the requested page
    return children;
}