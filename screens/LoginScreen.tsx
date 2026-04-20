
import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from '../components/icons';
import { useBranding } from '../context/BrandingContext';
import { DEFAULT_USERS } from '../services/users';
import { User, UserSettings } from '../types';

interface LoginScreenProps {
  onLogin: (user: User & UserSettings) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { appName, appLogo, loginSettings } = useBranding();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');

    if (!username.trim() || !password.trim()) {
        setError('Username and password cannot be empty.');
        setIsLoggingIn(false);
        return;
    }

    // Attempt to login using DEFAULT_USERS verification
    setTimeout(() => {
        const trimmedUsername = username.trim().toLowerCase();
        const user = DEFAULT_USERS.find(u => 
            u.username.toLowerCase() === trimmedUsername || 
            u.email.toLowerCase() === trimmedUsername
        );

        if (user && user.password === password) {
            // Success! Password matches.
            const userWithSettings: User & UserSettings = {
                ...user,
                id: user.username,
                isActive: true,
                layout: 'default',
                disabledMenus: [],
                companyId: 'spie'
            } as any;
            onLogin(userWithSettings);
        } else {
            setError('Invalid username or password.');
        }
        setIsLoggingIn(false);
    }, 1200); // Slightly longer for "active" feel
  };

  // Dynamic Styles based on settings
  const containerStyle: React.CSSProperties = {
      backgroundColor: loginSettings.backgroundColor,
  };

  const cardStyle: React.CSSProperties = {
      backgroundColor: loginSettings.cardBackgroundColor,
      borderColor: `${loginSettings.textSecondaryColor}20` // Low opacity border
  };

  const inputStyle: React.CSSProperties = {
      backgroundColor: loginSettings.inputBackgroundColor,
      color: loginSettings.inputTextColor,
      borderColor: `${loginSettings.textSecondaryColor}40`
  };

  const buttonStyle: React.CSSProperties = {
      backgroundColor: loginSettings.buttonColor,
      color: loginSettings.buttonTextColor,
  };

  const textStyle: React.CSSProperties = { color: loginSettings.textColor };
  const textSecStyle: React.CSSProperties = { color: loginSettings.textSecondaryColor };


  return (
    <div className="flex items-center justify-center min-h-screen w-full p-4 relative overflow-hidden" style={containerStyle}>
      {/* Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] animate-pulse" style={{ backgroundColor: `${loginSettings.accentColor}20` }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] animate-pulse [animation-delay:2s]" style={{ backgroundColor: `${loginSettings.accentColor}20` }}></div>

      <div className="w-full max-w-md p-8 sm:p-10 space-y-8 backdrop-blur-xl rounded-3xl shadow-2xl border relative z-10 animate-slide-up" style={cardStyle}>
        <div className="text-center space-y-2">
            <div className="shadow-md rounded-2xl p-3 inline-block mb-2" style={{ backgroundColor: loginSettings.inputBackgroundColor }}>
                {appLogo ? (
                    <img src={appLogo} alt="App Logo" className="h-16 w-16 object-contain" />
                ) : (
                    <span className="text-4xl">🎫</span>
                )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight" style={textStyle}>{appName}</h1>
            <p className="text-sm font-medium" style={textSecStyle}>Welcome back! Please enter your details.</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          <div className="space-y-1">
            <label className="block text-sm font-semibold ml-1" style={textSecStyle}>Username</label>
            <input
              style={inputStyle}
              className="w-full text-base px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 placeholder:opacity-50 backdrop-blur-sm"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          
          <div className="space-y-1 relative">
            <label className="block text-sm font-semibold ml-1" style={textSecStyle}>Password</label>
            <div className="relative">
                <input
                    style={inputStyle}
                    className="w-full text-base px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 placeholder:opacity-50 backdrop-blur-sm"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                />
                <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center transition-colors"
                    style={{ color: loginSettings.textSecondaryColor }}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                >
                    {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
            </div>
          </div>

           {error && (
                <div className="bg-red-500/10 text-red-500 text-sm p-3 rounded-lg text-center font-medium animate-pulse border border-red-500/20">
                    {error}
                </div>
            )}

          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={isLoggingIn}
              style={buttonStyle}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-lg transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none hover:opacity-90"
            >
              {isLoggingIn ? (
                  <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing In...
                  </span>
              ) : 'Sign In'}
            </button>
          </div>
        </form>
        
        <div className="text-center">
             <p className="text-xs opacity-70" style={textSecStyle}>
                &copy; {new Date().getFullYear()} {appName}. All rights reserved.
             </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
