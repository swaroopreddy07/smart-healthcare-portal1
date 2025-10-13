// =============================================
// server.js - Complete JWT-based Backend
// Smart Healthcare Portal
// =============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());

// Azure SQL Database Configuration
const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Azure Blob Storage Configuration
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerName = 'medical-documents';

// Multer Configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'));
    }
  }
});

// Database Connection Pool
let pool;
async function connectDB() {
  try {
    pool = await sql.connect(sqlConfig);
    console.log('Connected to Azure SQL Database');
    
    // Create blob container if not exists (no access = private by default)
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    console.log('Blob container ready');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}
connectDB();

// ==================== JWT MIDDLEWARE ====================

const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.UserId, 
      email: user.Email,
      role: user.UserRole,
      name: user.FullName
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.UserId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// ==================== AUTHENTICATION ROUTES ====================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, fullName, userRole, phone, specialty, licenseNumber, dateOfBirth, gender, bloodGroup } = req.body;

    // Validate required fields
    if (!email || !password || !fullName || !userRole) {
      return res.status(400).json({ error: 'Missing required fields: email, password, fullName, userRole' });
    }

    // Validate userRole
    if (!['Patient', 'Doctor'].includes(userRole)) {
      return res.status(400).json({ error: 'Invalid user role. Must be Patient or Doctor' });
    }

    // Check if user already exists
    const existingUser = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT UserId FROM Users WHERE Email = @email');

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Create user
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .input('password', sql.VarChar, hashedPassword)
      .input('fullName', sql.NVarChar, fullName)
      .input('userRole', sql.VarChar, userRole)
      .input('phone', sql.VarChar, phone || null)
      .input('specialty', sql.NVarChar, specialty || null)
      .input('licenseNumber', sql.VarChar, licenseNumber || null)
      .input('dateOfBirth', sql.Date, dateOfBirth || null)
      .input('gender', sql.VarChar, gender || null)
      .input('bloodGroup', sql.VarChar, bloodGroup || null)
      .query(`
        INSERT INTO Users (Email, PasswordHash, FullName, UserRole, Phone, Specialty, LicenseNumber, DateOfBirth, Gender, BloodGroup, IsActive, CreatedAt)
        OUTPUT INSERTED.*
        VALUES (@email, @password, @fullName, @userRole, @phone, @specialty, @licenseNumber, @dateOfBirth, @gender, @bloodGroup, 1, GETDATE())
      `);

    const user = result.recordset[0];
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      refreshToken,
      user: {
        userId: user.UserId,
        email: user.Email,
        fullName: user.FullName,
        role: user.UserRole,
        specialty: user.Specialty
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Users WHERE Email = @email AND IsActive = 1');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.recordset[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.PasswordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        userId: user.UserId,
        email: user.Email,
        fullName: user.FullName,
        role: user.UserRole,
        specialty: user.Specialty,
        phone: user.Phone
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Refresh token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      // Get user
      const result = await pool.request()
        .input('userId', sql.UniqueIdentifier, decoded.userId)
        .query('SELECT * FROM Users WHERE UserId = @userId AND IsActive = 1');

      if (result.recordset.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.recordset[0];
      const newToken = generateToken(user);
      const newRefreshToken = generateRefreshToken(user);

      res.json({
        success: true,
        token: newToken,
        refreshToken: newRefreshToken
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.request()
      .input('userId', sql.UniqueIdentifier, req.user.userId)
      .query('SELECT UserId, Email, FullName, UserRole, Phone, Specialty, DateOfBirth, Gender, BloodGroup, Address, EmergencyContact, CreatedAt FROM Users WHERE UserId = @userId');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== USER ROUTES ====================

app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.request()
      .input('userId', sql.UniqueIdentifier, req.user.userId)
      .query('SELECT UserId, Email, FullName, UserRole, Phone, Specialty, LicenseNumber, DateOfBirth, Gender, BloodGroup, Address, EmergencyContact, CreatedAt FROM Users WHERE UserId = @userId');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const { phone, address, emergencyContact, dateOfBirth, gender, bloodGroup } = req.body;
    
    await pool.request()
      .input('userId', sql.UniqueIdentifier, req.user.userId)
      .input('phone', sql.VarChar, phone || null)
      .input('address', sql.NVarChar, address || null)
      .input('emergencyContact', sql.VarChar, emergencyContact || null)
      .input('dateOfBirth', sql.Date, dateOfBirth || null)
      .input('gender', sql.VarChar, gender || null)
      .input('bloodGroup', sql.VarChar, bloodGroup || null)
      .query(`
        UPDATE Users 
        SET Phone = @phone, 
            Address = @address, 
            EmergencyContact = @emergencyContact,
            DateOfBirth = @dateOfBirth,
            Gender = @gender,
            BloodGroup = @bloodGroup,
            UpdatedAt = GETDATE()
        WHERE UserId = @userId
      `);
    
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all doctors (for patients to view)
app.get('/api/users/doctors', authenticateToken, async (req, res) => {
  try {
    const result = await pool.request()
      .query(`
        SELECT UserId, FullName, Specialty, Phone, Email
        FROM Users
        WHERE UserRole = 'Doctor' AND IsActive = 1
        ORDER BY FullName
      `);
    
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== APPOINTMENT ROUTES (UPDATED WITH TIME FIX) ====================

app.get('/api/appointments/available-slots', authenticateToken, async (req, res) => {
  try {
    const { doctorId } = req.query;
    
    let query = `
      SELECT 
        s.SlotId, s.DoctorId, s.SlotDate, 
        CONVERT(VARCHAR(5), s.SlotTime, 108) as SlotTime, 
        s.IsBooked,
        u.FullName as DoctorName, u.Specialty, u.Phone as DoctorPhone
      FROM AppointmentSlots s
      JOIN Users u ON s.DoctorId = u.UserId
      WHERE s.IsBooked = 0 AND s.SlotDate >= CAST(GETDATE() AS DATE)
    `;
    
    const request = pool.request();
    
    if (doctorId) {
      query += ' AND s.DoctorId = @doctorId';
      request.input('doctorId', sql.UniqueIdentifier, doctorId);
    }
    
    query += ' ORDER BY s.SlotDate, s.SlotTime';
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching slots:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments/slots', authenticateToken, authorizeRole('Doctor'), async (req, res) => {
  try {
    let { slotDate, slotTime } = req.body;
    
    if (!slotDate || !slotTime) {
      return res.status(400).json({ error: 'Slot date and time are required' });
    }

    // Ensure time has seconds (HH:MM:SS format) for SQL Server TIME type
    if (slotTime && slotTime.split(':').length === 2) {
      slotTime = `${slotTime}:00`;
    }

    // Check if slot already exists - use VarChar for comparison
    const existing = await pool.request()
      .input('doctorId', sql.UniqueIdentifier, req.user.userId)
      .input('slotDate', sql.Date, slotDate)
      .input('slotTime', sql.VarChar(8), slotTime)
      .query('SELECT SlotId FROM AppointmentSlots WHERE DoctorId = @doctorId AND SlotDate = @slotDate AND CAST(SlotTime AS VARCHAR(8)) = @slotTime');

    if (existing.recordset.length > 0) {
      return res.status(400).json({ error: 'This slot already exists' });
    }

    // Insert - use VarChar instead of Time type
    await pool.request()
      .input('doctorId', sql.UniqueIdentifier, req.user.userId)
      .input('slotDate', sql.Date, slotDate)
      .input('slotTime', sql.VarChar(8), slotTime)
      .query(`
        INSERT INTO AppointmentSlots (DoctorId, SlotDate, SlotTime, IsBooked, CreatedAt)
        VALUES (@doctorId, @slotDate, CAST(@slotTime AS TIME), 0, GETDATE())
      `);
    
    res.json({ success: true, message: 'Slot created successfully' });
  } catch (err) {
    console.error('Error creating slot:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments/book', authenticateToken, authorizeRole('Patient'), async (req, res) => {
  const transaction = new sql.Transaction(pool);
  
  try {
    const { slotId, notes } = req.body;
    
    if (!slotId) {
      return res.status(400).json({ error: 'Slot ID is required' });
    }

    await transaction.begin();
    
    const checkSlot = await transaction.request()
      .input('slotId', sql.Int, slotId)
      .query('SELECT IsBooked FROM AppointmentSlots WHERE SlotId = @slotId');
    
    if (checkSlot.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Slot not found' });
    }

    if (checkSlot.recordset[0].IsBooked) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Slot already booked' });
    }

    await transaction.request()
      .input('patientId', sql.UniqueIdentifier, req.user.userId)
      .input('slotId', sql.Int, slotId)
      .input('notes', sql.NVarChar, notes || null)
      .query(`
        INSERT INTO Appointments (PatientId, SlotId, Status, Notes, CreatedAt)
        VALUES (@patientId, @slotId, 'Confirmed', @notes, GETDATE())
      `);

    await transaction.request()
      .input('slotId', sql.Int, slotId)
      .query('UPDATE AppointmentSlots SET IsBooked = 1 WHERE SlotId = @slotId');

    await transaction.commit();
    res.json({ success: true, message: 'Appointment booked successfully' });
  } catch (err) {
    await transaction.rollback();
    console.error('Error booking appointment:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    let query;
    if (req.user.role === 'Patient') {
      query = `
        SELECT 
          a.AppointmentId, a.Status, a.Notes, a.CreatedAt,
          s.SlotDate, CONVERT(VARCHAR(5), s.SlotTime, 108) as SlotTime,
          u.FullName as DoctorName, u.Specialty, u.Phone as DoctorPhone, u.Email as DoctorEmail
        FROM Appointments a
        JOIN AppointmentSlots s ON a.SlotId = s.SlotId
        JOIN Users u ON s.DoctorId = u.UserId
        WHERE a.PatientId = @userId
        ORDER BY s.SlotDate DESC, s.SlotTime DESC
      `;
    } else {
      query = `
        SELECT 
          a.AppointmentId, a.Status, a.Notes, a.CreatedAt,
          s.SlotDate, CONVERT(VARCHAR(5), s.SlotTime, 108) as SlotTime,
          u.FullName as PatientName, u.Phone as PatientPhone, u.Email as PatientEmail,
          u.DateOfBirth, u.Gender, u.BloodGroup
        FROM Appointments a
        JOIN AppointmentSlots s ON a.SlotId = s.SlotId
        JOIN Users u ON a.PatientId = u.UserId
        WHERE s.DoctorId = @userId
        ORDER BY s.SlotDate DESC, s.SlotTime DESC
      `;
    }

    const result = await pool.request()
      .input('userId', sql.UniqueIdentifier, req.user.userId)
      .query(query);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/appointments/:appointmentId', authenticateToken, async (req, res) => {
  const transaction = new sql.Transaction(pool);
  
  try {
    const { appointmentId } = req.params;

    await transaction.begin();

    // Get appointment details
    const appointment = await transaction.request()
      .input('appointmentId', sql.Int, appointmentId)
      .query('SELECT a.*, s.DoctorId FROM Appointments a JOIN AppointmentSlots s ON a.SlotId = s.SlotId WHERE a.AppointmentId = @appointmentId');

    if (appointment.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const apt = appointment.recordset[0];

    // Check authorization
    if (req.user.role === 'Patient' && apt.PatientId !== req.user.userId) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (req.user.role === 'Doctor' && apt.DoctorId !== req.user.userId) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update appointment status
    await transaction.request()
      .input('appointmentId', sql.Int, appointmentId)
      .query('UPDATE Appointments SET Status = \'Cancelled\', UpdatedAt = GETDATE() WHERE AppointmentId = @appointmentId');

    // Free up the slot
    await transaction.request()
      .input('slotId', sql.Int, apt.SlotId)
      .query('UPDATE AppointmentSlots SET IsBooked = 0 WHERE SlotId = @slotId');

    await transaction.commit();
    res.json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (err) {
    await transaction.rollback();
    console.error('Error cancelling appointment:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== MEDICAL REPORT ROUTES ====================

app.post('/api/reports/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const { reportType, description } = req.body;
    
    // Upload to Azure Blob Storage
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = `reports/${req.user.userId}/${Date.now()}_${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype }
    });

    // Save to database
    await pool.request()
      .input('userId', sql.UniqueIdentifier, req.user.userId)
      .input('fileName', sql.NVarChar, file.originalname)
      .input('blobPath', sql.NVarChar, blobName)
      .input('fileType', sql.VarChar, file.mimetype)
      .input('fileSize', sql.BigInt, file.size)
      .input('reportType', sql.VarChar, reportType || 'General')
      .input('description', sql.NVarChar, description || null)
      .input('uploadedBy', sql.VarChar, req.user.role)
      .query(`
        INSERT INTO MedicalReports 
        (UserId, FileName, BlobPath, FileType, FileSize, ReportType, Description, UploadedBy, UploadedAt)
        VALUES 
        (@userId, @fileName, @blobPath, @fileType, @fileSize, @reportType, @description, @uploadedBy, GETDATE())
      `);
    
    res.json({ success: true, message: 'Report uploaded successfully' });
  } catch (err) {
    console.error('Error uploading report:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports', authenticateToken, async (req, res) => {
  try {
    let query;
    const request = pool.request();

    if (req.user.role === 'Patient') {
      query = `
        SELECT ReportId, FileName, FileType, FileSize, ReportType, Description, UploadedBy, UploadedAt
        FROM MedicalReports
        WHERE UserId = @userId
        ORDER BY UploadedAt DESC
      `;
      request.input('userId', sql.UniqueIdentifier, req.user.userId);
    } else {
      // Doctors can see reports from their patients
      const { patientId } = req.query;
      
      if (patientId) {
        query = `
          SELECT r.ReportId, r.FileName, r.FileType, r.FileSize, r.ReportType, r.Description, r.UploadedBy, r.UploadedAt,
                 u.FullName as PatientName
          FROM MedicalReports r
          JOIN Users u ON r.UserId = u.UserId
          WHERE r.UserId = @patientId
          ORDER BY r.UploadedAt DESC
        `;
        request.input('patientId', sql.UniqueIdentifier, patientId);
      } else {
        // Get reports from all patients who have appointments with this doctor
        query = `
          SELECT DISTINCT r.ReportId, r.FileName, r.FileType, r.FileSize, r.ReportType, r.Description, r.UploadedBy, r.UploadedAt,
                 u.FullName as PatientName, r.UserId as PatientId
          FROM MedicalReports r
          JOIN Users u ON r.UserId = u.UserId
          JOIN Appointments a ON a.PatientId = r.UserId
          JOIN AppointmentSlots s ON a.SlotId = s.SlotId
          WHERE s.DoctorId = @userId
          ORDER BY r.UploadedAt DESC
        `;
        request.input('userId', sql.UniqueIdentifier, req.user.userId);
      }
    }
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/download/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const result = await pool.request()
      .input('reportId', sql.Int, reportId)
      .query('SELECT * FROM MedicalReports WHERE ReportId = @reportId');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = result.recordset[0];
    
    // Check authorization
    if (req.user.role === 'Patient' && report.UserId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to access this report' });
    }

    // Download from Azure Blob Storage
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(report.BlobPath);
    
    const downloadResponse = await blobClient.download();
    
    res.setHeader('Content-Type', report.FileType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.FileName}"`);
    downloadResponse.readableStreamBody.pipe(res);
  } catch (err) {
    console.error('Error downloading report:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reports/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const result = await pool.request()
      .input('reportId', sql.Int, reportId)
      .query('SELECT * FROM MedicalReports WHERE ReportId = @reportId');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = result.recordset[0];
    
    // Only the uploader can delete
    if (report.UserId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this report' });
    }

    // Delete from blob storage
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(report.BlobPath);
    await blobClient.deleteIfExists();

    // Delete from database
    await pool.request()
      .input('reportId', sql.Int, reportId)
      .query('DELETE FROM MedicalReports WHERE ReportId = @reportId');
    
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== PRESCRIPTION ROUTES ====================

app.post('/api/prescriptions/upload', authenticateToken, authorizeRole('Doctor'), upload.single('file'), async (req, res) => {
  try {
    const { patientId, appointmentId, medication, dosage, frequency, duration, instructions } = req.body;
    
    if (!patientId || !medication) {
      return res.status(400).json({ error: 'Patient ID and medication are required' });
    }

    let blobPath = null;
    let fileName = null;

    // Upload file if provided
    if (req.file) {
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = `prescriptions/${patientId}/${Date.now()}_${req.file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype }
      });
      
      blobPath = blobName;
      fileName = req.file.originalname;
    }

    await pool.request()
      .input('doctorId', sql.UniqueIdentifier, req.user.userId)
      .input('patientId', sql.UniqueIdentifier, patientId)
      .input('appointmentId', sql.Int, appointmentId || null)
      .input('medication', sql.NVarChar, medication)
      .input('dosage', sql.NVarChar, dosage || null)
      .input('frequency', sql.NVarChar, frequency || null)
      .input('duration', sql.NVarChar, duration || null)
      .input('instructions', sql.NVarChar, instructions || null)
      .input('fileName', sql.NVarChar, fileName)
      .input('blobPath', sql.NVarChar, blobPath)
      .query(`
        INSERT INTO Prescriptions 
        (DoctorId, PatientId, AppointmentId, Medication, Dosage, Frequency, Duration, Instructions, FileName, BlobPath, PrescribedAt)
        VALUES 
        (@doctorId, @patientId, @appointmentId, @medication, @dosage, @frequency, @duration, @instructions, @fileName, @blobPath, GETDATE())
      `);
    
    res.json({ success: true, message: 'Prescription uploaded successfully' });
  } catch (err) {
    console.error('Error uploading prescription:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/prescriptions', authenticateToken, async (req, res) => {
  try {
    let query;
    const request = pool.request();

    if (req.user.role === 'Patient') {
      query = `
        SELECT 
          p.PrescriptionId, p.Medication, p.Dosage, p.Frequency, p.Duration, p.Instructions, p.PrescribedAt, p.FileName, p.ExpiryDate,
          u.FullName as DoctorName, u.Specialty, u.Phone as DoctorPhone
        FROM Prescriptions p
        JOIN Users u ON p.DoctorId = u.UserId
        WHERE p.PatientId = @userId
        ORDER BY p.PrescribedAt DESC
      `;
      request.input('userId', sql.UniqueIdentifier, req.user.userId);
    } else {
      const { patientId } = req.query;
      
      if (patientId) {
        query = `
          SELECT 
            p.PrescriptionId, p.Medication, p.Dosage, p.Frequency, p.Duration, p.Instructions, p.PrescribedAt, p.FileName, p.ExpiryDate,
            u.FullName as PatientName, u.Phone as PatientPhone
          FROM Prescriptions p
          JOIN Users u ON p.PatientId = u.UserId
          WHERE p.DoctorId = @userId AND p.PatientId = @patientId
          ORDER BY p.PrescribedAt DESC
        `;
        request.input('userId', sql.UniqueIdentifier, req.user.userId);
        request.input('patientId', sql.UniqueIdentifier, patientId);
      } else {
        query = `
          SELECT 
            p.PrescriptionId, p.Medication, p.Dosage, p.Frequency, p.Duration, p.Instructions, p.PrescribedAt, p.FileName, p.ExpiryDate,
            u.FullName as PatientName, u.Phone as PatientPhone
          FROM Prescriptions p
          JOIN Users u ON p.PatientId = u.UserId
          WHERE p.DoctorId = @userId
          ORDER BY p.PrescribedAt DESC
        `;
        request.input('userId', sql.UniqueIdentifier, req.user.userId);
      }
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching prescriptions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/prescriptions/download/:prescriptionId', authenticateToken, async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    
    const result = await pool.request()
      .input('prescriptionId', sql.Int, prescriptionId)
      .query('SELECT * FROM Prescriptions WHERE PrescriptionId = @prescriptionId');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const prescription = result.recordset[0];
    
    // Check authorization
    if (req.user.role === 'Patient' && prescription.PatientId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (req.user.role === 'Doctor' && prescription.DoctorId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!prescription.BlobPath) {
      return res.status(404).json({ error: 'No file attached to this prescription' });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(prescription.BlobPath);
    const downloadResponse = await blobClient.download();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${prescription.FileName}"`);
    downloadResponse.readableStreamBody.pipe(res);
  } catch (err) {
    console.error('Error downloading prescription:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get patients list for doctor
app.get('/api/patients', authenticateToken, authorizeRole('Doctor'), async (req, res) => {
  try {
    const result = await pool.request()
      .input('doctorId', sql.UniqueIdentifier, req.user.userId)
      .query(`
        SELECT DISTINCT 
          u.UserId, u.FullName, u.Email, u.Phone, u.DateOfBirth, u.Gender, u.BloodGroup
        FROM Users u
        JOIN Appointments a ON u.UserId = a.PatientId
        JOIN AppointmentSlots s ON a.SlotId = s.SlotId
        WHERE s.DoctorId = @doctorId AND u.UserRole = 'Patient'
        ORDER BY u.FullName
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({ error: err.message });
  }
});

// Dashboard statistics
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'Patient') {
      const result = await pool.request()
        .input('userId', sql.UniqueIdentifier, req.user.userId)
        .query(`
          SELECT 
            (SELECT COUNT(*) FROM Appointments WHERE PatientId = @userId AND Status = 'Confirmed') AS upcomingAppointments,
            (SELECT COUNT(*) FROM MedicalReports WHERE UserId = @userId) AS totalReports,
            (SELECT COUNT(*) FROM Prescriptions WHERE PatientId = @userId) AS totalPrescriptions
        `);
      
      res.json(result.recordset[0]);
    } else {
      const result = await pool.request()
        .input('userId', sql.UniqueIdentifier, req.user.userId)
        .query(`
          SELECT 
            (SELECT COUNT(*) FROM Appointments a 
             JOIN AppointmentSlots s ON a.SlotId = s.SlotId 
             WHERE s.DoctorId = @userId AND a.Status = 'Confirmed') AS upcomingAppointments,
            (SELECT COUNT(*) FROM Prescriptions WHERE DoctorId = @userId) AS totalPrescriptions,
            (SELECT COUNT(DISTINCT PatientId) FROM Appointments a
             JOIN AppointmentSlots s ON a.SlotId = s.SlotId
             WHERE s.DoctorId = @userId) AS totalPatients,
            (SELECT COUNT(*) FROM AppointmentSlots WHERE DoctorId = @userId AND IsBooked = 0 AND SlotDate >= CAST(GETDATE() AS DATE)) AS availableSlots
        `);
      
      res.json(result.recordset[0]);
    }
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  if (pool) {
    await pool.close();
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;