import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { User, Mail, Phone, MapPin, Calendar, Droplet, Edit2, Save, X } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    phone: '',
    address: '',
    emergencyContact: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      setProfile(response.data);
      setEditForm({
        phone: response.data.Phone || '',
        address: response.data.Address || '',
        emergencyContact: response.data.EmergencyContact || '',
        dateOfBirth: response.data.DateOfBirth ? response.data.DateOfBirth.split('T')[0] : '',
        gender: response.data.Gender || '',
        bloodGroup: response.data.BloodGroup || ''
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      alert('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditForm({
      phone: profile.Phone || '',
      address: profile.Address || '',
      emergencyContact: profile.EmergencyContact || '',
      dateOfBirth: profile.DateOfBirth ? profile.DateOfBirth.split('T')[0] : '',
      gender: profile.Gender || '',
      bloodGroup: profile.BloodGroup || ''
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile', editForm);
      alert('Profile updated successfully!');
      setEditing(false);
      fetchProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-500"></div>
          <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-t-4 border-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">My Profile</h1>
          <p className="text-slate-400 mt-1">Manage your personal information</p>
        </div>
        {!editing ? (
          <button
            onClick={handleEdit}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl flex items-center hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Edit2 className="h-5 w-5 mr-2" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="border border-slate-700 px-4 py-2 rounded-xl flex items-center hover:bg-slate-800/50 transition-colors text-slate-300"
            >
              <X className="h-5 w-5 mr-2" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl flex items-center hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 shadow-lg shadow-green-500/20"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 px-8 py-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex items-center space-x-6">
            <div className="bg-white/20 backdrop-blur-lg p-6 rounded-full border-4 border-white/30">
              <User className="h-16 w-16 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">{profile?.FullName}</h2>
              <p className="text-blue-100 text-lg capitalize mt-1">{profile?.UserRole}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email - Not Editable */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-slate-400">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </label>
              <input
                type="email"
                value={profile?.Email || ''}
                disabled
                className="w-full px-4 py-3 border border-slate-700/50 rounded-xl bg-slate-800/30 text-slate-300"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-slate-400">
                <Phone className="h-4 w-4 mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={editing ? editForm.phone : profile?.Phone || 'Not provided'}
                onChange={handleChange}
                disabled={!editing}
                className={`w-full px-4 py-3 border border-slate-700/50 rounded-xl ${
                  editing ? 'bg-slate-800/50 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent' : 'bg-slate-800/30 text-slate-300'
                } transition-all`}
              />
            </div>

            {/* For Doctors - Specialty and License */}
            {profile?.UserRole === 'Doctor' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">
                    Specialty
                  </label>
                  <input
                    type="text"
                    value={profile?.Specialty || 'Not specified'}
                    disabled
                    className="w-full px-4 py-3 border border-slate-700/50 rounded-xl bg-slate-800/30 text-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={profile?.LicenseNumber || 'Not provided'}
                    disabled
                    className="w-full px-4 py-3 border border-slate-700/50 rounded-xl bg-slate-800/30 text-slate-300"
                  />
                </div>
              </>
            )}

            {/* For Patients - Personal Info */}
            {profile?.UserRole === 'Patient' && (
              <>
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-slate-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={editing ? editForm.dateOfBirth : profile?.DateOfBirth?.split('T')[0] || ''}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`w-full px-4 py-3 border border-slate-700/50 rounded-xl ${
                      editing ? 'bg-slate-800/50 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent' : 'bg-slate-800/30 text-slate-300'
                    } transition-all`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">
                    Gender
                  </label>
                  {editing ? (
                    <select
                      name="gender"
                      value={editForm.gender}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-700/50 rounded-xl bg-slate-800/50 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={profile?.Gender || 'Not provided'}
                      disabled
                      className="w-full px-4 py-3 border border-slate-700/50 rounded-xl bg-slate-800/30 text-slate-300"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-slate-400">
                    <Droplet className="h-4 w-4 mr-2" />
                    Blood Group
                  </label>
                  {editing ? (
                    <select
                      name="bloodGroup"
                      value={editForm.bloodGroup}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-700/50 rounded-xl bg-slate-800/50 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={profile?.BloodGroup || 'Not provided'}
                      disabled
                      className="w-full px-4 py-3 border border-slate-700/50 rounded-xl bg-slate-800/30 text-slate-300"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={editing ? editForm.emergencyContact : profile?.EmergencyContact || 'Not provided'}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`w-full px-4 py-3 border border-slate-700/50 rounded-xl ${
                      editing ? 'bg-slate-800/50 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent' : 'bg-slate-800/30 text-slate-300'
                    } transition-all`}
                  />
                </div>
              </>
            )}

            {/* Address - Full Width */}
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center text-sm font-medium text-slate-400">
                <MapPin className="h-4 w-4 mr-2" />
                Address
              </label>
              <textarea
                name="address"
                value={editing ? editForm.address : profile?.Address || 'Not provided'}
                onChange={handleChange}
                disabled={!editing}
                rows="3"
                className={`w-full px-4 py-3 border border-slate-700/50 rounded-xl ${
                  editing ? 'bg-slate-800/50 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent' : 'bg-slate-800/30 text-slate-300'
                } transition-all`}
              />
            </div>
          </div>

          {/* Account Info */}
          <div className="mt-8 pt-6 border-t border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/30 p-4 rounded-xl">
              <div>
                <span className="text-sm text-slate-400">Account Created:</span>
                <p className="text-white font-medium">
                  {profile?.CreatedAt ? new Date(profile.CreatedAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-sm text-slate-400">User ID:</span>
                <p className="text-white font-medium font-mono text-sm">
                  {profile?.UserId}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
