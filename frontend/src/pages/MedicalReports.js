import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { FileText, Upload, Download, Trash2, X, Filter } from 'lucide-react';

const MedicalReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [uploadForm, setUploadForm] = useState({
    file: null,
    reportType: 'General',
    description: ''
  });

  useEffect(() => {
    fetchReports();
    if (user?.role === 'Doctor') {
      fetchPatients();
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      const params = selectedPatient ? { patientId: selectedPatient } : {};
      const response = await api.get('/reports', { params });
      setReports(response.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      alert('Failed to load reports');
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
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size should not exceed 10MB');
        return;
      }
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!uploadForm.file) {
      alert('Please select a file');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('reportType', uploadForm.reportType);
      formData.append('description', uploadForm.description);

      await api.post('/reports/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      alert('Report uploaded successfully!');
      setShowUploadModal(false);
      setUploadForm({ file: null, reportType: 'General', description: '' });
      fetchReports();
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.error || 'Failed to upload report');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (reportId, fileName) => {
    try {
      const response = await api.get(`/reports/download/${reportId}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download report');
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;

    try {
      await api.delete(`/reports/${reportId}`);
      alert('Report deleted successfully');
      fetchReports();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete report');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('image')) return '🖼️';
    return '📎';
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
          <h1 className="text-3xl font-bold text-white">Medical Reports</h1>
          <p className="text-slate-400 mt-1">
            {user?.role === 'Patient' 
              ? 'Upload and manage your medical reports' 
              : 'View patient medical reports'}
          </p>
        </div>
        {user?.role === 'Patient' && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl flex items-center hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload Report
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

      {/* Reports List */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700/50">
        <div className="p-6">
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No reports found</p>
              {user?.role === 'Patient' && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-4 text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Upload your first report
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => (
                <div
                  key={report.ReportId}
                  className="border border-slate-700/50 rounded-xl p-4 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all bg-slate-800/30"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getFileIcon(report.FileType)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {report.FileName}
                        </p>
                        {report.PatientName && (
                          <p className="text-sm text-slate-400">{report.PatientName}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 bg-slate-700/30 p-3 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Type:</span>
                      <span className="font-medium text-white">{report.ReportType}</span>
                    </div>
                    {report.FileSize && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Size:</span>
                        <span className="font-medium text-white">
                          {formatFileSize(report.FileSize)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Uploaded:</span>
                      <span className="font-medium text-white">
                        {new Date(report.UploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">By:</span>
                      <span className="font-medium text-white">{report.UploadedBy}</span>
                    </div>
                  </div>

                  {report.Description && (
                    <p className="text-sm text-slate-300 mb-4 line-clamp-2 bg-slate-700/20 p-2 rounded">
                      {report.Description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(report.ReportId, report.FileName)}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-3 py-2 rounded-xl text-sm hover:from-cyan-600 hover:to-blue-600 transition-all flex items-center justify-center shadow-lg shadow-cyan-500/20"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </button>
                    {user?.role === 'Patient' && (
                      <button
                        onClick={() => handleDelete(report.ReportId)}
                        className="bg-red-500/10 text-red-400 px-3 py-2 rounded-xl text-sm hover:bg-red-500/20 transition-all border border-red-500/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-700/50 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Upload Medical Report</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Report Type *
                </label>
                <select
                  value={uploadForm.reportType}
                  onChange={(e) => setUploadForm({ ...uploadForm, reportType: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-200"
                >
                  <option value="General">General</option>
                  <option value="Blood Test">Blood Test</option>
                  <option value="X-Ray">X-Ray</option>
                  <option value="MRI">MRI</option>
                  <option value="CT Scan">CT Scan</option>
                  <option value="Ultrasound">Ultrasound</option>
                  <option value="ECG">ECG</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-200 placeholder-slate-500"
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  File * (PDF, JPEG, PNG - Max 10MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20"
                />
                {uploadForm.file && (
                  <p className="text-sm text-slate-400 mt-2">
                    Selected: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                  </p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 border border-slate-700 px-4 py-3 rounded-xl hover:bg-slate-800/50 transition-colors text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadForm.file}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalReports;
