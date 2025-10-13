// =============================================
// src/pages/Dashboard.js
// =============================================

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Calendar, FileText, Clipboard, Users, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const patientStats = [
    {
      title: 'Upcoming Appointments',
      value: stats?.upcomingAppointments || 0,
      icon: Calendar,
      color: 'bg-blue-500',
      link: '/appointments'
    },
    {
      title: 'Medical Reports',
      value: stats?.totalReports || 0,
      icon: FileText,
      color: 'bg-green-500',
      link: '/reports'
    },
    {
      title: 'Prescriptions',
      value: stats?.totalPrescriptions || 0,
      icon: Clipboard,
      color: 'bg-purple-500',
      link: '/prescriptions'
    }
  ];

  const doctorStats = [
    {
      title: 'Upcoming Appointments',
      value: stats?.upcomingAppointments || 0,
      icon: Calendar,
      color: 'bg-blue-500',
      link: '/appointments'
    },
    {
      title: 'Total Patients',
      value: stats?.totalPatients || 0,
      icon: Users,
      color: 'bg-green-500',
      link: '/appointments'
    },
    {
      title: 'Prescriptions Written',
      value: stats?.totalPrescriptions || 0,
      icon: Clipboard,
      color: 'bg-purple-500',
      link: '/prescriptions'
    },
    {
      title: 'Available Slots',
      value: stats?.availableSlots || 0,
      icon: Activity,
      color: 'bg-orange-500',
      link: '/appointments'
    }
  ];

  const displayStats = user?.role === 'Patient' ? patientStats : doctorStats;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-600">
          {user?.role === 'Patient' 
            ? 'Here\'s an overview of your health records and appointments.'
            : 'Here\'s an overview of your practice and upcoming appointments.'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link
              key={index}
              to={stat.link}
              className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </h3>
              <p className="text-gray-600 text-sm">{stat.title}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {user?.role === 'Patient' ? (
            <>
              <Link
                to="/appointments"
                className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Calendar className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">Book Appointment</p>
                  <p className="text-sm text-gray-600">Schedule with a doctor</p>
                </div>
              </Link>
              <Link
                to="/reports"
                className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <FileText className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">Upload Report</p>
                  <p className="text-sm text-gray-600">Add medical documents</p>
                </div>
              </Link>
              <Link
                to="/prescriptions"
                className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Clipboard className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">View Prescriptions</p>
                  <p className="text-sm text-gray-600">Check medications</p>
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/appointments"
                className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Calendar className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">Create Slot</p>
                  <p className="text-sm text-gray-600">Add appointment slots</p>
                </div>
              </Link>
              <Link
                to="/prescriptions"
                className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Clipboard className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">Add Prescription</p>
                  <p className="text-sm text-gray-600">Write prescriptions</p>
                </div>
              </Link>
              <Link
                to="/reports"
                className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <FileText className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">View Reports</p>
                  <p className="text-sm text-gray-600">Patient medical records</p>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
        <h2 className="text-xl font-bold mb-2">
          {user?.role === 'Patient' ? 'Your Health, Our Priority' : 'Empowering Healthcare'}
        </h2>
        <p className="text-blue-100">
          {user?.role === 'Patient' 
            ? 'Access your complete medical history, book appointments, and stay connected with your healthcare providers.'
            : 'Manage your practice efficiently, view patient records, and provide better care through our integrated platform.'}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;