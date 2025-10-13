// =============================================
// src/pages/Profile.js
// =============================================

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your personal information</p>
        </div>
        {!editing ? (
          <button
            onClick={handleEdit}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
          >
            <Edit2 className="h-5 w-5 mr-2" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="border border-gray-300 px-4 py-2 rounded-lg flex items-center hover:bg-gray-50 transition-colors"
            >
              <X className="h-5 w-5 mr-2" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 p-4 rounded-full">
              <User className="h-12 w-12" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile?.FullName}</h2>
              <p className="text-blue-100 capitalize">{profile?.UserRole}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email - Not Editable */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-600">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </label>
              <input
                type="email"
                value={profile?.Email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-600">
                <Phone className="h-4 w-4 mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={editing ? editForm.phone : profile?.Phone || 'Not provided'}
                onChange={handleChange}
                disabled={!editing}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                  editing ? 'bg-white' : 'bg-gray-50'
                } text-gray-700`}
              />
            </div>

            {/* For Doctors - Specialty and License */}
            {profile?.UserRole === 'Doctor' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">
                    Specialty
                  </label>
                  <input
                    type="text"
                    value={profile?.Specialty || 'Not specified'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={profile?.LicenseNumber || 'Not provided'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>
              </>
            )}

            {/* For Patients - Personal Info */}
            {profile?.UserRole === 'Patient' && (
              <>
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={editing ? editForm.dateOfBirth : profile?.DateOfBirth?.split('T')[0] || ''}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                      editing ? 'bg-white' : 'bg-gray-50'
                    } text-gray-700`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">
                    Gender
                  </label>
                  {editing ? (
                    <select
                      name="gender"
                      value={editForm.gender}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-600">
                    <Droplet className="h-4 w-4 mr-2" />
                    Blood Group
                  </label>
                  {editing ? (
                    <select
                      name="bloodGroup"
                      value={editForm.bloodGroup}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={editing ? editForm.emergencyContact : profile?.EmergencyContact || 'Not provided'}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                      editing ? 'bg-white' : 'bg-gray-50'
                    } text-gray-700`}
                  />
                </div>
              </>
            )}

            {/* Address - Full Width */}
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center text-sm font-medium text-gray-600">
                <MapPin className="h-4 w-4 mr-2" />
                Address
              </label>
              <textarea
                name="address"
                value={editing ? editForm.address : profile?.Address || 'Not provided'}
                onChange={handleChange}
                disabled={!editing}
                rows="3"
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                  editing ? 'bg-white' : 'bg-gray-50'
                } text-gray-700`}
              />
            </div>
          </div>

          {/* Account Info */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Account Created:</span>
                <p className="text-gray-900 font-medium">
                  {profile?.CreatedAt ? new Date(profile.CreatedAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">User ID:</span>
                <p className="text-gray-900 font-medium font-mono text-sm">
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