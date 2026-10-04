import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  Server,
  Layers,
  ChevronRight
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error, clearError, lockoutUntil } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutUntil) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const diff = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (diff <= 0) {
        setTimeLeft(null);
        clearError();
      } else {
        setTimeLeft(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    await login(username, password);
  };

  const isLocked = timeLeft !== null && timeLeft > 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        backgroundColor: '#070d19',
        color: '#f8fafc',
        fontFamily: "'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: 'hidden'
      }}
    >
      {/* Background Geological Contour & Seismic Grid FX */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 50% 20%, rgba(14, 116, 144, 0.15), transparent 45%),
            radial-gradient(circle at 80% 80%, rgba(15, 59, 96, 0.25), transparent 50%),
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 48px 48px, 48px 48px',
          pointerEvents: 'none'
        }}
      />

      {/* Subtle Depth Seismic Wave Lines in Background */}
      <svg
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          opacity: 0.12,
          pointerEvents: 'none'
        }}
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 350 C 300 280, 500 420, 800 340 C 1100 260, 1300 390, 1440 330"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
        <path
          d="M0 450 C 250 510, 600 380, 900 460 C 1200 540, 1350 430, 1440 470"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <path
          d="M0 600 C 400 550, 700 680, 1050 590 C 1250 530, 1380 620, 1440 580"
          stroke="#10b981"
          strokeWidth="1.5"
        />
      </svg>

      {/* Main Authentication Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '460px',
          margin: '20px',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: '1px solid rgba(56, 189, 248, 0.22)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(14, 116, 144, 0.15)',
          padding: '36px 32px'
        }}
      >
        {/* Header: Official Emblem & Department Banner */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          {/* Logo Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0284c7, #0f3b60)',
              boxShadow: '0 8px 20px rgba(2, 132, 199, 0.35)',
              marginBottom: '16px',
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <Shield size={34} color="#ffffff" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(56, 189, 248, 0.25)'
              }}
            >
              OIL INDIA LIMITED
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#94a3b8',
                fontWeight: 500
              }}
            >
              • ऑइल इंडिया
            </span>
          </div>

          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#ffffff',
              margin: '8px 0 4px',
              letterSpacing: '-0.02em'
            }}
          >
            Drilling Intelligence Portal
          </h1>

          <p
            style={{
              fontSize: '13px',
              color: '#94a3b8',
              margin: 0,
              lineHeight: 1.4
            }}
          >
            Subsurface Decision Support &amp; Well Telemetry System
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '12px',
              fontSize: '11px',
              color: '#e2e8f0',
              backgroundColor: 'rgba(30, 41, 59, 0.7)',
              padding: '4px 12px',
              borderRadius: '20px',
              border: '1px solid rgba(148, 163, 184, 0.15)'
            }}
          >
            <Lock size={12} color="#10b981" />
            <span>Restricted Level-4 Access &bull; Production Security Active</span>
          </div>

          {/* Live Operational Timestamp */}
          <div
            id="login-live-timestamp"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '10px',
              fontSize: '11px',
              color: '#94a3b8'
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 6px #10b981'
              }}
            />
            <span style={{ color: '#cbd5e1' }}>Telemetry Sync:</span>
            <span style={{ color: '#38bdf8', fontWeight: 600, fontFamily: 'monospace' }}>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}{' '}
              •{' '}
              {new Date().toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })}
            </span>
          </div>
        </div>

        {/* Lockout or Error Alert */}
        {isLocked && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '12px 14px',
              borderRadius: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12px',
              lineHeight: 1.4
            }}
          >
            <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontWeight: 600, color: '#f87171', marginBottom: '2px' }}>
                Account Temporarily Locked
              </div>
              <div>
                Maximum authentication attempts exceeded. High-security cooldown in effect. Please retry in{' '}
                <strong style={{ color: '#ffffff' }}>{timeLeft} seconds</strong>.
              </div>
            </div>
          </div>
        )}

        {!isLocked && error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              padding: '12px 14px',
              borderRadius: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px'
            }}
          >
            <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Username Input */}
          <div>
            <label
              htmlFor="auth-username"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#cbd5e1',
                marginBottom: '6px'
              }}
            >
              Officer ID / Username
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#64748b',
                  pointerEvents: 'none'
                }}
              >
                <User size={16} />
              </div>
              <input
                id="auth-username"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                disabled={isLocked || isLoading}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) clearError();
                }}
                placeholder="Enter authorized username"
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  backgroundColor: 'rgba(30, 41, 59, 0.65)',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label
                htmlFor="auth-password"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#cbd5e1'
                }}
              >
                Security Passphrase
              </label>
              <span style={{ fontSize: '11px', color: '#64748b' }}>SHA-256 Verified</span>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#64748b',
                  pointerEvents: 'none'
                }}
              >
                <KeyRound size={16} />
              </div>
              <input
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isLocked || isLoading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) clearError();
                }}
                placeholder="Enter secure password"
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 38px',
                  backgroundColor: 'rgba(30, 41, 59, 0.65)',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Authenticate Button */}
          <button
            type="submit"
            id="login-submit-btn"
            disabled={isLocked || isLoading || !username.trim() || !password}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px',
              backgroundColor: isLocked || !username.trim() || !password ? 'rgba(56, 189, 248, 0.2)' : '#0284c7',
              color: isLocked || !username.trim() || !password ? '#94a3b8' : '#ffffff',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              cursor: isLocked || isLoading || !username.trim() || !password ? 'not-allowed' : 'pointer',
              marginTop: '6px',
              boxShadow: isLocked || !username.trim() || !password ? 'none' : '0 4px 14px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {isLoading ? (
              <>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <Lock size={16} />
                <span>Authenticate &amp; Enter Workspace</span>
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security Features & Compliance Guarantee */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(148, 163, 184, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#94a3b8' }}>
            <CheckCircle2 size={13} color="#10b981" />
            <span>Strict Zero-Demo Protocol &bull; High Assurance Vault</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#94a3b8' }}>
            <Server size={13} color="#38bdf8" />
            <span>Cryptographic Session Tokens &bull; 8-Hour Idle Timeout</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#94a3b8' }}>
            <Layers size={13} color="#f59e0b" />
            <span>Volve Field &amp; National Drilling Registry Isolation</span>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div
          style={{
            marginTop: '16px',
            fontSize: '10px',
            color: '#64748b',
            textAlign: 'center',
            lineHeight: 1.4
          }}
        >
          Unauthorized access or penetration attempts are logged under IP telemetry and actionable under Section 43 &amp; 66 of the Information Technology Act.
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
