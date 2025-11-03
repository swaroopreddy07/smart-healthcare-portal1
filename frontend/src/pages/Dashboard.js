import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Calendar, FileText, Clipboard, Users, Activity, TrendingUp, Heart, Zap, ChevronRight } from 'lucide-react';
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
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-500"></div>
          <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-t-4 border-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
      </div>
    );
  }

  const patientStats = [
    {
      title: 'Upcoming Appointments',
      value: stats?.upcomingAppointments || 0,
      icon: Calendar,
      color: 'from-cyan-500 to-blue-500',
      bgGlow: 'bg-cyan-500/10',
      link: '/appointments'
    },
    {
      title: 'Medical Reports',
      value: stats?.totalReports || 0,
      icon: FileText,
      color: 'from-green-500 to-emerald-500',
      bgGlow: 'bg-green-500/10',
      link: '/reports'
    },
    {
      title: 'Prescriptions',
      value: stats?.totalPrescriptions || 0,
      icon: Clipboard,
      color: 'from-purple-500 to-pink-500',
      bgGlow: 'bg-purple-500/10',
      link: '/prescriptions'
    }
  ];

  const doctorStats = [
    {
      title: 'Upcoming Appointments',
      value: stats?.upcomingAppointments || 0,
      icon: Calendar,
      color: 'from-cyan-500 to-blue-500',
      bgGlow: 'bg-cyan-500/10',
      link: '/appointments'
    },
    {
      title: 'Total Patients',
      value: stats?.totalPatients || 0,
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      bgGlow: 'bg-purple-500/10',
      link: '/appointments'
    },
    {
      title: 'Prescriptions Written',
      value: stats?.totalPrescriptions || 0,
      icon: Clipboard,
      color: 'from-orange-500 to-red-500',
      bgGlow: 'bg-orange-500/10',
      link: '/prescriptions'
    },
    {
      title: 'Available Slots',
      value: stats?.availableSlots || 0,
      icon: Activity,
      color: 'from-green-500 to-emerald-500',
      bgGlow: 'bg-green-500/10',
      link: '/appointments'
    }
  ];

  const displayStats = user?.role === 'Patient' ? patientStats : doctorStats;

  const quickActions = user?.role === 'Patient' ? [
    { icon: Calendar, label: 'Book Appointment', color: 'from-cyan-500 to-blue-500', link: '/appointments' },
    { icon: FileText, label: 'Upload Report', color: 'from-green-500 to-emerald-500', link: '/reports' },
    { icon: Clipboard, label: 'View Prescriptions', color: 'from-purple-500 to-pink-500', link: '/prescriptions' }
  ] : [
    { icon: Calendar, label: 'Create Slot', color: 'from-cyan-500 to-blue-500', link: '/appointments' },
    { icon: Clipboard, label: 'Add Prescription', color: 'from-purple-500 to-pink-500', link: '/prescriptions' },
    { icon: FileText, label: 'View Reports', color: 'from-green-500 to-emerald-500', link: '/reports' }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-8 border border-slate-700/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl glow-animation"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-400">
            {user?.role === 'Patient' 
              ? 'Here\'s an overview of your health records and appointments.'
              : 'Here\'s an overview of your practice and upcoming appointments.'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link
              key={index}
              to={stat.link}
              className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 card-hover"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bgGlow} rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity`}></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-white mb-1">
                  {stat.value}
                </h3>
                <p className="text-slate-400 text-sm">{stat.title}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 border border-slate-700/50">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-cyan-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                to={action.link}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-slate-200 font-medium">{action.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* System Info */}
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 p-8 border border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
              <Heart className="h-6 w-6 mr-2 text-pink-400" />
              {user?.role === 'Patient' ? 'Your Health, Our Priority' : 'Empowering Healthcare Excellence'}
            </h2>
            <p className="text-slate-300">
              {user?.role === 'Patient' 
                ? 'Access your complete medical history, book appointments, and stay connected with your healthcare providers.'
                : 'Manage your practice efficiently, view patient records, and provide better care through our integrated platform.'}
            </p>
          </div>
          <div className="hidden lg:block">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <Activity className="h-12 w-12 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
