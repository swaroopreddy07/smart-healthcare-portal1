// =============================================
// src/pages/Appointments.js
// =============================================

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Calendar, Clock, Plus, User, X, Trash2, CheckCircle } from 'lucide-react';

// Helper function to format time for SQL Server
const formatTimeForSQL = (time) => {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length === 2) return `${time}:00`;
  if (parts.length === 3) return time;
  return time;
};

const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateSlot, setShowCreateSlot] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotForm, setSlotForm] = useState({
    slotDate: '',
    slotTime: ''
  });
  const [bookingNotes, setBookingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [appointmentsRes, slotsRes] = await Promise.all([
        api.get('/appointments'),
        user?.role === 'Patient' ? api.get('/appointments/available-slots') : Promise.resolve({ data: [] })
      ]);
      setAppointments(appointmentsRes.data);
      if (user?.role === 'Patient') {
        setAvailableSlots(slotsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlot = async (e) => {
  e.preventDefault();
  
  if (!slotForm.slotDate || !slotForm.slotTime) {
    alert('Please fill in both date and time');
    return;
  }

  setSubmitting(true);

  try {
    // Format time to HH:MM:SS for SQL Server
    let formattedTime = slotForm.slotTime;
    
    // Add seconds if not present
    if (formattedTime.split(':').length === 2) {
      formattedTime = `${formattedTime}:00`;
    }
    
    console.log('Original time:', slotForm.slotTime);
    console.log('Formatted time:', formattedTime);
    console.log('Sending data:', { slotDate: slotForm.slotDate, slotTime: formattedTime });
    
    const response = await api.post('/appointments/slots', {
      slotDate: slotForm.slotDate,
      slotTime: formattedTime
    });
    
    console.log('Response:', response.data);
    
    alert('Slot created successfully!');
    setShowCreateSlot(false);
    setSlotForm({ slotDate: '', slotTime: '' });
    fetchData();
  } catch (error) {
    console.error('Failed to create slot:', error);
    console.error('Error response:', error.response?.data);
    alert(error.response?.data?.error || 'Failed to create slot');
  } finally {
    setSubmitting(false);
  }
};

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/appointments/book', {
        slotId: selectedSlot.SlotId,
        notes: bookingNotes
      });
      alert('Appointment booked successfully!');
      setShowBookModal(false);
      setSelectedSlot(null);
      setBookingNotes('');
      fetchData();
    } catch (error) {
      console.error('Failed to book appointment:', error);
      alert(error.response?.data?.error || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      await api.delete(`/appointments/${appointmentId}`);
      alert('Appointment cancelled successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      alert('Failed to cancel appointment');
    }
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600 mt-1">
            {user?.role === 'Patient' 
              ? 'View and book appointments with doctors' 
              : 'Manage your appointment slots and patient visits'}
          </p>
        </div>
        {user?.role === 'Doctor' && (
          <button
            onClick={() => setShowCreateSlot(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Slot
          </button>
        )}
      </div>

      {/* Available Slots for Patients */}
      {user?.role === 'Patient' && availableSlots.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Available Slots</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableSlots.map((slot) => (
                <div key={slot.SlotId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{slot.DoctorName}</p>
                      <p className="text-sm text-gray-600">{slot.Specialty}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(slot.SlotDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      {slot.SlotTime}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSlot(slot);
                      setShowBookModal(true);
                    }}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Book Appointment
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* My Appointments */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {user?.role === 'Patient' ? 'My Appointments' : 'Patient Appointments'}
          </h2>
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No appointments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((apt) => (
                <div key={apt.AppointmentId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {user?.role === 'Patient' ? apt.DoctorName : apt.PatientName}
                          </h3>
                          {user?.role === 'Patient' ? (
                            <p className="text-sm text-gray-600">{apt.Specialty}</p>
                          ) : (
                            <p className="text-sm text-gray-600">
                              {apt.Gender && `${apt.Gender}, `}
                              {apt.BloodGroup && `Blood Group: ${apt.BloodGroup}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(apt.SlotDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          {apt.SlotTime}
                        </div>
                        <div className="flex items-center col-span-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            apt.Status === 'Confirmed' 
                              ? 'bg-green-100 text-green-700'
                              : apt.Status === 'Cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {apt.Status}
                          </span>
                        </div>
                      </div>
                      {apt.Notes && (
                        <p className="text-sm text-gray-600 mt-3">
                          <strong>Notes:</strong> {apt.Notes}
                        </p>
                      )}
                      {user?.role === 'Patient' && apt.DoctorPhone && (
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Contact:</strong> {apt.DoctorPhone}
                        </p>
                      )}
                      {user?.role === 'Doctor' && apt.PatientPhone && (
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Contact:</strong> {apt.PatientPhone}
                        </p>
                      )}
                    </div>
                    {apt.Status === 'Confirmed' && (
                      <button
                        onClick={() => handleCancelAppointment(apt.AppointmentId)}
                        className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Slot Modal (Doctor) */}
      {showCreateSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Create Appointment Slot</h3>
              <button onClick={() => setShowCreateSlot(false)}>
                <X className="h-6 w-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={slotForm.slotDate}
                  onChange={(e) => setSlotForm({ ...slotForm, slotDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  required
                  value={slotForm.slotTime}
                  onChange={(e) => setSlotForm({ ...slotForm, slotTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Format: HH:MM (e.g., 14:30)</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateSlot(false)}
                  disabled={submitting}
                  className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Appointment Modal (Patient) */}
      {showBookModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Book Appointment</h3>
              <button onClick={() => setShowBookModal(false)}>
                <X className="h-6 w-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="font-semibold text-gray-900 mb-2">{selectedSlot.DoctorName}</p>
              <p className="text-sm text-gray-600 mb-2">{selectedSlot.Specialty}</p>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                {new Date(selectedSlot.SlotDate).toLocaleDateString()}
                <Clock className="h-4 w-4 ml-4 mr-2" />
                {selectedSlot.SlotTime}
              </div>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any specific concerns or symptoms..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  disabled={submitting}
                  className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;