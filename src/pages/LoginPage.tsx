import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, X } from 'lucide-react';

type ForgotStep = 'email' | 'sent';

export default function LoginPage() {
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please check your Email/Username and Password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail.trim()) {
      setForgotError('Email address or User ID is required.');
      return;
    }

    setForgotLoading(true);
    try {
      const existingReqs = JSON.parse(localStorage.getItem('healthgrid_password_reset_requests') || '[]');
      const newReq = {
        id: `req-${Date.now()}`,
        identifier: forgotEmail.trim(),
        requestedAt: new Date().toISOString(),
        status: 'PENDING_ADMIN_ACTION',
      };
      localStorage.setItem('healthgrid_password_reset_requests', JSON.stringify([...existingReqs, newReq]));
      setForgotStep('sent');
    } catch (err: unknown) {
      setForgotError('Unable to log request. Please contact your System Admin directly.');
    } finally {
      setForgotLoading(false);
    }
  };

  const openForgot = () => {
    setShowForgot(true);
    setForgotStep('email');
    setForgotEmail(identifier.includes('@') ? identifier : identifier);
    setForgotError('');
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotError('');
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#F4F5F7] flex flex-col justify-between items-center p-4 sm:p-6 font-sans text-[#111827]">

      {/* ── FORGOT PASSWORD MODAL ────────────────────────────────────────── */}
      {showForgot && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white border border-[#CBD5E1] rounded-[6px] p-6 space-y-4 shadow-none">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h2 className="text-[16px] font-semibold text-[#111827]">Password Reset Request</h2>
              <button type="button" onClick={closeForgot} className="text-[#64748B] hover:text-[#111827] cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {forgotStep === 'email' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] text-[13px] text-[#334155] space-y-1.5">
                  <p className="font-semibold text-[#0F172A]">System Security Policy Notice:</p>
                  <p className="leading-relaxed">To reset your account password, please submit your request below and contact a System Admin or Master Admin.</p>
                </div>

                {forgotError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-[13px] text-red-700 font-medium rounded-[4px]">
                    {forgotError}
                  </div>
                )}
                <div>
                  <label className="block text-[14px] font-medium text-[#1E293B] mb-1">Account Email or User ID</label>
                  <input
                    type="text"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-[14px] text-[#111827] focus:outline-none focus:border-[#0A5236]"
                    placeholder="Enter email or ID (e.g. rad-001)"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button type="button" onClick={closeForgot} className="w-1/2 py-2 border border-[#CBD5E1] rounded-[4px] text-[14px] font-medium text-[#1E293B] hover:bg-gray-50 cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={forgotLoading} className="w-1/2 py-2 bg-[#0A5236] hover:bg-[#073D28] text-white rounded-[4px] text-[14px] font-semibold cursor-pointer">
                    {forgotLoading ? 'Processing...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'sent' && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[4px] text-[13px] text-emerald-900 space-y-1.5">
                  <p className="font-bold text-emerald-800">Request Logged</p>
                  <p>Your password reset request for {forgotEmail} has been registered in the system.</p>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] text-[12px] space-y-2 text-[#334155]">
                  <p className="font-semibold text-[#0F172A]">Please contact system administration to issue your reset password:</p>
                  <ul className="list-disc pl-4 space-y-1 font-medium">
                    <li><strong>System Admin</strong>: Tan Wei Ming (<code>weiming.tan@healthgrid.my</code>)</li>
                    <li><strong>Master Admin</strong>: Danesh (<code>daneshlou05@gmail.com</code>)</li>
                  </ul>
                </div>

                <button onClick={closeForgot} className="w-full py-2 bg-[#0A5236] text-white rounded-[4px] text-[14px] font-semibold cursor-pointer">
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CENTERED DESKTOP LOGIN CARD (EXACT TWIN-BOX DUAL LOGOS AT TOP) ── */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0 py-6">
        <main className="w-full max-w-[580px] bg-white border border-[#CBD5E1] rounded-[6px] p-6 sm:p-8 md:p-8 space-y-5 shadow-xs">

          {/* HealthGrid IQ Logo Header */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center">
              <img
                src="/assets/healthgrid-iq-logo.png"
                alt="HealthGrid IQ"
                className="h-[64px] w-auto object-contain"
              />
            </div>
          </div>

          {/* Title Header */}
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold">Sign In</h1>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-[13px] text-red-700 font-medium rounded-[4px]">
              {error}
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Identifier Field (Email Address or Username) */}
            <div>
              <label className="block text-[14px] font-medium text-[#1E293B] mb-1.5">
                Email Address or Username
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3.5 py-3 bg-white border border-[#CBD5E1] rounded-[4px] text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0A5236] transition-colors"
                placeholder="Enter your email or username"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[14px] font-medium text-[#1E293B] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0A5236] transition-colors"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Row */}
            <div className="flex items-center justify-end text-[14px] pt-0.5">
              <button
                type="button"
                onClick={openForgot}
                className="text-[14px] font-medium text-[#64748B] hover:text-[#0A5236] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Dark Green Sign In Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-[#0A5236] hover:bg-[#073D28] text-white font-semibold text-[15px] rounded-[8px] transition-colors cursor-pointer mt-1 disabled:opacity-50"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

        </main>
      </div>



    </div>
  );
}
