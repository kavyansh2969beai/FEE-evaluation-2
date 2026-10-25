import { create } from 'zustand';

const getInitialTheme = () => {
    try {
        const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
        const savedTheme = storedUser?.themePreference || localStorage.getItem('mindora_theme') || 'light';
        const validTheme = savedTheme === 'dark' ? 'dark' : 'light';
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', validTheme);
        }
        return validTheme;
    } catch {
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', 'light');
        }
        return 'light';
    }
};

const useAuthStore = create((set) => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || null,
    theme: getInitialTheme(),

    login: (userData, token) => {
        const preferredTheme = userData?.themePreference === 'dark' ? 'dark' : (localStorage.getItem('mindora_theme') === 'dark' ? 'dark' : 'light');
        const mergedUser = { ...userData, themePreference: preferredTheme };
        localStorage.setItem('user', JSON.stringify(mergedUser));
        localStorage.setItem('token', token);
        localStorage.setItem('mindora_theme', preferredTheme);
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', preferredTheme);
        }
        set({ user: mergedUser, token, theme: preferredTheme });
    },

    setTheme: (newTheme) => {
        const validTheme = newTheme === 'dark' ? 'dark' : 'light';
        localStorage.setItem('mindora_theme', validTheme);
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', validTheme);
        }
        set((state) => {
            const updatedUser = state.user ? { ...state.user, themePreference: validTheme } : null;
            if (updatedUser) {
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
            return { theme: validTheme, user: updatedUser };
        });
    },

    logout: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        set({ user: null, token: null });
    }
}));

export default useAuthStore;