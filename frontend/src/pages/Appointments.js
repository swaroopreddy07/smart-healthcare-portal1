import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Calendar, Clock, Plus, User, X, Trash2, CheckCircle } from 'lucide-react';

const formatTimeForSQL = (time) => {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length === 2) return `${time}:00`;
  if (parts.length === 3) return time;
  return time;
};

// Helper function to check if appointment time has passed
const isAppointmentPassed = (slotDate, slotTime) => {
  const now = new Date();
  const appointmentDateTime = new Date(`${slotDate.split('T')[0]}T${slotTime}`);
  return appointmentDateTime < now;
};

// Helper function to get appointment status
const getAppointmentStatus = (appointment) => {
  if (appointment.Status === 'Cancelled') {
    return 'Cancelled';
  }
  
  if (isAppointmentPassed(appointment.SlotDate, appointment.SlotTime)) {
    return 'Completed';
  }
  
  return appointment.Status;
};

// Helper function to check if appointment can be cancelled
const canCancelAppointment = (appointment) => {
  // Can only cancel if status is Confirmed and time hasn't passed
  return appointment.Status === 'Confirmed' && 
         !isAppointmentPassed(appointment.SlotDate, appointment.SlotTime);
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
      let formattedTime = slotForm.slotTime;
      
      if (formattedTime.split(':').length === 2) {
        formattedTime = `${formattedTime}:00`;
      }
      
      await api.post('/appointments/slots', {
        slotDate: slotForm.slotDate,
        slotTime: formattedTime
      });
      
      alert('Slot created successfully!');
      setShowCreateSlot(false);
      setSlotForm({ slotDate: '', slotTime: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to create slot:', error);
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
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-500"></div>
          <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-t-4 border-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Appointments</h1>
          <p className="text-slate-400 mt-1">
            {user?.role === 'Patient' 
              ? 'View and book appointments with doctors' 
              : 'Manage your appointment slots and patient visits'}
          </p>
        </div>
        {user?.role === 'Doctor' && (
          <button
            onClick={() => setShowCreateSlot(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl flex items-center hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Slot
          </button>
        )}
      </div>

      {/* Available Slots for Patients */}
      {user?.role === 'Patient' && availableSlots.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700/50">
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">Available Slots</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableSlots.map((slot) => (
                <div key={slot.SlotId} className="border border-slate-700/50 rounded-xl p-4 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all bg-slate-800/50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-white">{slot.DoctorName}</p>
                      <p className="text-sm text-slate-400">{slot.Specialty}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-slate-300">
                      <Calendar className="h-4 w-4 mr-2 text-cyan-400" />
                      {new Date(slot.SlotDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-slate-300">
                      <Clock className="h-4 w-4 mr-2 text-cyan-400" />
                      {slot.SlotTime}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSlot(slot);
                      setShowBookModal(true);
                    }}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/20"
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
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700/50">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            {user?.role === 'Patient' ? 'My Appointments' : 'Patient Appointments'}
          </h2>
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No appointments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((apt) => {
                const displayStatus = getAppointmentStatus(apt);
                const isCancellable = canCancelAppointment(apt);
                
                return (
                  <div key={apt.AppointmentId} className="border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/50 transition-all bg-slate-800/30">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-gradient-to-br from-cyan-500 to-purple-500 p-2 rounded-xl">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">
                              {user?.role === 'Patient' ? apt.DoctorName : apt.PatientName}
                            </h3>
                            {user?.role === 'Patient' ? (
                              <p className="text-sm text-slate-400">{apt.Specialty}</p>
                            ) : (
                              <p className="text-sm text-slate-400">
                                {apt.Gender && `${apt.Gender}, `}
                                {apt.BloodGroup && `Blood Group: ${apt.BloodGroup}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center text-slate-300">
                            <Calendar className="h-4 w-4 mr-2 text-cyan-400" />
                            {new Date(apt.SlotDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center text-slate-300">
                            <Clock className="h-4 w-4 mr-2 text-cyan-400" />
                            {apt.SlotTime}
                          </div>
                          <div className="flex items-center col-span-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              displayStatus === 'Completed'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : displayStatus === 'Confirmed' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : displayStatus === 'Cancelled'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}>
                              {displayStatus}
                            </span>
                          </div>
                        </div>
                        {apt.Notes && (
                          <p className="text-sm text-slate-300 mt-3 bg-slate-700/30 p-3 rounded-lg">
                            <strong>Notes:</strong> {apt.Notes}
                          </p>
                        )}
                        {user?.role === 'Patient' && apt.DoctorPhone && (
                          <p className="text-sm text-slate-300 mt-2">
                            <strong>Contact:</strong> {apt.DoctorPhone}
                          </p>
                        )}
                        {user?.role === 'Doctor' && apt.PatientPhone && (
                          <p className="text-sm text-slate-300 mt-2">
                            <strong>Contact:</strong> {apt.PatientPhone}
                          </p>
                        )}
                      </div>
                      {isCancellable && (
                        <button
                          onClick={() => handleCancelAppointment(apt.AppointmentId)}
                          className="flex items-center px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-red-500/30 hover:border-red-500/50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Slot Modal (Doctor) */}
      {showCreateSlot && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-700/50 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Create Appointment Slot</h3>
              <button onClick={() => setShowCreateSlot(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={slotForm.slotDate}
                  onChange={(e) => setSlotForm({ ...slotForm, slotDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  required
                  value={slotForm.slotTime}
                  onChange={(e) => setSlotForm({ ...slotForm, slotTime: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-200"
                />
                <p className="text-xs text-slate-500 mt-1">Format: HH:MM (e.g., 14:30)</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateSlot(false)}
                  disabled={submitting}
                  className="flex-1 border border-slate-700 px-4 py-3 rounded-xl hover:bg-slate-800/50 transition-colors disabled:opacity-50 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-700/50 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Book Appointment</h3>
              <button onClick={() => setShowBookModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4 mb-6">
              <p className="font-semibold text-white mb-2">{selectedSlot.DoctorName}</p>
              <p className="text-sm text-slate-300 mb-2">{selectedSlot.Specialty}</p>
              <div className="flex items-center text-sm text-slate-300">
                <Calendar className="h-4 w-4 mr-2 text-cyan-400" />
                {new Date(selectedSlot.SlotDate).toLocaleDateString()}
                <Clock className="h-4 w-4 ml-4 mr-2 text-cyan-400" />
                {selectedSlot.SlotTime}
              </div>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-200 placeholder-slate-500"
                  placeholder="Any specific concerns or symptoms..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  disabled={submitting}
                  className="flex-1 border border-slate-700 px-4 py-3 rounded-xl hover:bg-slate-800/50 transition-colors disabled:opacity-50 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-cyan-500/20"
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
