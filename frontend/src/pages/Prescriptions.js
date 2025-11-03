import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Clipboard, Plus, Download, X, User, Calendar, Filter } from 'lucide-react';

const Prescriptions = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [prescriptionForm, setPrescriptionForm] = useState({
    patientId: '',
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    file: null
  });

  useEffect(() => {
    fetchPrescriptions();
    if (user?.role === 'Doctor') {
      fetchPatients();
    }
  }, [user]);

  const fetchPrescriptions = async () => {
    try {
      const params = selectedPatient ? { patientId: selectedPatient } : {};
      const response = await api.get('/prescriptions', { params });
      setPrescriptions(response.data);
    } catch (error) {
      console.error('Failed to fetch prescriptions:', error);
      alert('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get('/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 10 * 1024 * 1024) {
      alert('File size should not exceed 10MB');
      return;
    }
    setPrescriptionForm({ ...prescriptionForm, file });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!prescriptionForm.patientId || !prescriptionForm.medication) {
      alert('Patient and Medication are required');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('patientId', prescriptionForm.patientId);
      formData.append('medication', prescriptionForm.medication);
      formData.append('dosage', prescriptionForm.dosage);
      formData.append('frequency', prescriptionForm.frequency);
      formData.append('duration', prescriptionForm.duration);
      formData.append('instructions', prescriptionForm.instructions);
      if (prescriptionForm.file) {
        formData.append('file', prescriptionForm.file);
      }

      await api.post('/prescriptions/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      alert('Prescription added successfully!');
      setShowAddModal(false);
      setPrescriptionForm({
        patientId: '',
        medication: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        file: null
      });
      fetchPrescriptions();
    } catch (error) {
      console.error('Failed to add prescription:', error);
      alert(error.response?.data?.error || 'Failed to add prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (prescriptionId, fileName) => {
    try {
      const response = await api.get(`/prescriptions/download/${prescriptionId}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'prescription.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert(error.response?.data?.error || 'Failed to download prescription');
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Prescriptions</h1>
          <p className="text-slate-400 mt-1">
            {user?.role === 'Patient' 
              ? 'View your prescriptions from doctors' 
              : 'Manage patient prescriptions'}
          </p>
        </div>
        {user?.role === 'Doctor' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl flex items-center hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/20"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Prescription
          </button>
        )}
      </div>

      {/* Doctor Filter */}
      {user?.role === 'Doctor' && patients.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-slate-400" />
            <select
              value={selectedPatient}
              onChange={(e) => {
                setSelectedPatient(e.target.value);
                setLoading(true);
              }}
              className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-200"
            >
              <option value="">All Patients</option>
              {patients.map(patient => (
                <option key={patient.UserId} value={patient.UserId}>
                  {patient.FullName}
                </option>
              ))}
            </select>
            {selectedPatient && (
              <button
                onClick={() => {
                  setSelectedPatient('');
                  setLoading(true);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Prescriptions List */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700/50">
        <div className="p-6">
          {prescriptions.length === 0 ? (
            <div className="text-center py-12">
              <Clipboard className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No prescriptions found</p>
              {user?.role === 'Doctor' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 text-purple-400 hover:text-purple-300 font-medium"
                >
                  Add your first prescription
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {prescriptions.map((prescription) => (
                <div
                  key={prescription.PrescriptionId}
                  className="border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition-all bg-slate-800/30"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-xl">
                          <Clipboard className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">
                            {prescription.Medication}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                            {user?.role === 'Patient' && prescription.DoctorName && (
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-1" />
                                Dr. {prescription.DoctorName}
                                {prescription.Specialty && ` - ${prescription.Specialty}`}
                              </div>
                            )}
                            {user?.role === 'Doctor' && prescription.PatientName && (
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-1" />
                                {prescription.PatientName}
                              </div>
                            )}
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(prescription.PrescribedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-700/30 rounded-xl p-4">
                        {prescription.Dosage && (
                          <div>
                            <span className="text-sm font-medium text-slate-400">Dosage:</span>
                            <p className="text-white font-medium">{prescription.Dosage}</p>
                          </div>
                        )}
                        {prescription.Frequency && (
                          <div>
                            <span className="text-sm font-medium text-slate-400">Frequency:</span>
                            <p className="text-white font-medium">{prescription.Frequency}</p>
                          </div>
                        )}
                        {prescription.Duration && (
                          <div>
                            <span className="text-sm font-medium text-slate-400">Duration:</span>
                            <p className="text-white font-medium">{prescription.Duration}</p>
                          </div>
                        )}
                        {prescription.ExpiryDate && (
                          <div>
                            <span className="text-sm font-medium text-slate-400">Expires:</span>
                            <p className="text-white font-medium">
                              {new Date(prescription.ExpiryDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {prescription.Instructions && (
                        <div className="mt-4 bg-slate-700/20 p-4 rounded-lg">
                          <span className="text-sm font-medium text-slate-400">Instructions:</span>
                          <p className="text-slate-200 mt-1">{prescription.Instructions}</p>
                        </div>
                      )}

                      {user?.role === 'Patient' && prescription.DoctorPhone && (
                        <div className="mt-4 text-sm text-slate-300">
                          <strong>Contact:</strong> {prescription.DoctorPhone}
                        </div>
                      )}
                    </div>

                    {prescription.FileName && (
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => handleDownload(prescription.PrescriptionId, prescription.FileName)}
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all flex items-center shadow-lg shadow-cyan-500/20"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Prescription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-2xl w-full my-8 border border-slate-700/50 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Add New Prescription</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Patient *
                </label>
                <select
                  value={prescriptionForm.patientId}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientId: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-200"
                >
                  <option value="">Select Patient</option>
                  {patients.map(patient => (
                    <option key={patient.UserId} value={patient.UserId}>
                      {patient.FullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Medication *
                </label>
                <input
                  type="text"
                  value={prescriptionForm.medication}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medication: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-200 placeholder-slate-500"
                  placeholder="e.g., Amoxicillin"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Dosage
                  </label>
                  <input
                    type="text"
                    value={prescriptionForm.dosage}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-200 placeholder-slate-500"
                    placeholder="e.g., 500mg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Frequency
                  </label>
                  <input
                    type="text"
                    value={prescriptionForm.frequency}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-200 placeholder-slate-500"
                    placeholder="e.g., 3 times daily"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Duration
                </label>
                <input
                  type="text"
                  value={prescriptionForm.duration}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-200 placeholder-slate-500"
                  placeholder="e.g., 7 days"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Instructions
                </label>
                <textarea
                  value={prescriptionForm.instructions}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-200 placeholder-slate-500"
                  placeholder="Special instructions for the patient..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Prescription File (Optional - PDF, JPEG, PNG)
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20"
                />
                {prescriptionForm.file && (
                  <p className="text-sm text-slate-400 mt-2">
                    Selected: {prescriptionForm.file.name}
                  </p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-slate-700 px-4 py-3 rounded-xl hover:bg-slate-800/50 transition-colors text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
                >
                  {submitting ? 'Adding...' : 'Add Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prescriptions;
