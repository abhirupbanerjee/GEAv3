/**
 * Citizen Profile Page
 *
 * Allows citizens to view and edit their profile information:
 * - Phone number (read-only, verified badge)
 * - Name (editable)
 * - Email (editable)
 * - Account info (member since, last login)
 */

'use client';

import { useEffect, useState } from 'react';
import {
  FiUser,
  FiPhone,
  FiMail,
  FiCalendar,
  FiClock,
  FiSave,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
  FiShield,
} from 'react-icons/fi';

interface Profile {
  citizenId: string;
  phone: string;
  phoneVerified: boolean;
  name: string | null;
  email: string | null;
  registrationComplete: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export default function CitizenProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Track if form has changes
  const hasChanges =
    profile && (name !== (profile.name || '') || email !== (profile.email || ''));

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/citizen/profile');
      const data = await response.json();

      if (data.success && data.profile) {
        setProfile(data.profile);
        setName(data.profile.name || '');
        setEmail(data.profile.email || '');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/citizen/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || null, email: email.trim() || null }),
      });

      const data = await response.json();

      if (data.success) {
        setProfile(data.profile);
        setMessage({ type: 'success', text: 'Profile updated successfully' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FiLoader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-600 mt-1">View and update your account information</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <FiCheckCircle className="w-5 h-5" />
          ) : (
            <FiAlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <FiUser className="w-10 h-10 text-white" />
            </div>
            <div className="text-white">
              <h2 className="text-xl font-semibold">{name || 'Citizen'}</h2>
              <p className="text-white/80 text-sm">{profile?.phone}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Phone (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-2">
                <FiPhone className="w-4 h-4" />
                Phone Number
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={profile?.phone || ''}
                readOnly
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed"
              />
              {profile?.phoneVerified && (
                <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <FiShield className="w-4 h-4" />
                  Verified
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Phone number cannot be changed. Contact support if you need to update it.
            </p>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-2">
                <FiUser className="w-4 h-4" />
                Full Name
              </span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-2">
                <FiMail className="w-4 h-4" />
                Email Address
              </span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">
              We&apos;ll use this to send you important notifications.
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium transition-colors ${
                hasChanges && !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <FiLoader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FiCalendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Member Since</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(profile?.createdAt || null)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <FiClock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Last Login</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDateTime(profile?.lastLogin || null)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
