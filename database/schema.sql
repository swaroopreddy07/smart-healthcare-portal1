-- =============================================
-- Smart Healthcare Portal - Database Schema
-- Azure SQL Database
-- =============================================

-- Create Users Table
CREATE TABLE Users (
    UserId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(255) NOT NULL,
    UserRole VARCHAR(20) NOT NULL CHECK (UserRole IN ('Patient', 'Doctor')),
    Phone VARCHAR(20),
    Address NVARCHAR(500),
    Specialty NVARCHAR(100), -- For doctors
    LicenseNumber VARCHAR(50), -- For doctors
    EmergencyContact VARCHAR(20),
    DateOfBirth DATE,
    Gender VARCHAR(10),
    BloodGroup VARCHAR(5),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- Create index on email for faster lookups
CREATE INDEX IX_Users_Email ON Users(Email);
CREATE INDEX IX_Users_UserRole ON Users(UserRole);

-- Create AppointmentSlots Table
CREATE TABLE AppointmentSlots (
    SlotId INT PRIMARY KEY IDENTITY(1,1),
    DoctorId UNIQUEIDENTIFIER NOT NULL,
    SlotDate DATE NOT NULL,
    SlotTime TIME NOT NULL,
    IsBooked BIT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (DoctorId) REFERENCES Users(UserId) ON DELETE CASCADE,
    CONSTRAINT UQ_DoctorSlot UNIQUE (DoctorId, SlotDate, SlotTime)
);

-- Create indexes for slot queries
CREATE INDEX IX_AppointmentSlots_DoctorDate ON AppointmentSlots(DoctorId, SlotDate);
CREATE INDEX IX_AppointmentSlots_Available ON AppointmentSlots(IsBooked, SlotDate) WHERE IsBooked = 0;

-- Create Appointments Table
CREATE TABLE Appointments (
    AppointmentId INT PRIMARY KEY IDENTITY(1,1),
    PatientId UNIQUEIDENTIFIER NOT NULL,
    SlotId INT NOT NULL,
    Status VARCHAR(20) DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
    Notes NVARCHAR(1000),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (PatientId) REFERENCES Users(UserId),
    FOREIGN KEY (SlotId) REFERENCES AppointmentSlots(SlotId) ON DELETE CASCADE
);

-- Create indexes for appointment queries
CREATE INDEX IX_Appointments_Patient ON Appointments(PatientId);
CREATE INDEX IX_Appointments_Status ON Appointments(Status);

-- Create MedicalReports Table
CREATE TABLE MedicalReports (
    ReportId INT PRIMARY KEY IDENTITY(1,1),
    UserId UNIQUEIDENTIFIER NOT NULL,
    FileName NVARCHAR(255) NOT NULL,
    BlobPath NVARCHAR(500) NOT NULL,
    FileType VARCHAR(50),
    FileSize BIGINT,
    ReportType VARCHAR(50), -- 'BloodTest', 'XRay', 'MRI', 'Prescription', etc.
    Description NVARCHAR(1000),
    UploadedBy VARCHAR(20) CHECK (UploadedBy IN ('Patient', 'Doctor')),
    UploadedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

-- Create index for report queries
CREATE INDEX IX_MedicalReports_User ON MedicalReports(UserId);
CREATE INDEX IX_MedicalReports_Type ON MedicalReports(ReportType);
CREATE INDEX IX_MedicalReports_Date ON MedicalReports(UploadedAt);

-- Create Prescriptions Table
CREATE TABLE Prescriptions (
    PrescriptionId INT PRIMARY KEY IDENTITY(1,1),
    DoctorId UNIQUEIDENTIFIER NOT NULL,
    PatientId UNIQUEIDENTIFIER NOT NULL,
    AppointmentId INT,
    Medication NVARCHAR(500) NOT NULL,
    Dosage NVARCHAR(200),
    Frequency NVARCHAR(100),
    Duration NVARCHAR(100),
    Instructions NVARCHAR(1000),
    FileName NVARCHAR(255),
    BlobPath NVARCHAR(500),
    PrescribedAt DATETIME2 DEFAULT GETDATE(),
    ExpiryDate DATE,
    FOREIGN KEY (DoctorId) REFERENCES Users(UserId),
    FOREIGN KEY (PatientId) REFERENCES Users(UserId),
    FOREIGN KEY (AppointmentId) REFERENCES Appointments(AppointmentId)
);

-- Create indexes for prescription queries
CREATE INDEX IX_Prescriptions_Patient ON Prescriptions(PatientId);
CREATE INDEX IX_Prescriptions_Doctor ON Prescriptions(DoctorId);
CREATE INDEX IX_Prescriptions_Appointment ON Prescriptions(AppointmentId);

-- Create MedicalHistory Table
CREATE TABLE MedicalHistory (
    HistoryId INT PRIMARY KEY IDENTITY(1,1),
    PatientId UNIQUEIDENTIFIER NOT NULL,
    DoctorId UNIQUEIDENTIFIER,
    AppointmentId INT,
    Diagnosis NVARCHAR(1000),
    Symptoms NVARCHAR(1000),
    Treatment NVARCHAR(1000),
    FollowUpRequired BIT DEFAULT 0,
    FollowUpDate DATE,
    RecordedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (PatientId) REFERENCES Users(UserId),
    FOREIGN KEY (DoctorId) REFERENCES Users(UserId),
    FOREIGN KEY (AppointmentId) REFERENCES Appointments(AppointmentId)
);

-- Create index for medical history
CREATE INDEX IX_MedicalHistory_Patient ON MedicalHistory(PatientId);

-- Create Notifications Table
CREATE TABLE Notifications (
    NotificationId INT PRIMARY KEY IDENTITY(1,1),
    UserId UNIQUEIDENTIFIER NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    Message NVARCHAR(1000) NOT NULL,
    Type VARCHAR(50), -- 'Appointment', 'Prescription', 'Report', 'General'
    IsRead BIT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

-- Create index for notifications
CREATE INDEX IX_Notifications_User ON Notifications(UserId, IsRead);

-- Create AuditLog Table
CREATE TABLE AuditLog (
    LogId INT PRIMARY KEY IDENTITY(1,1),
    UserId UNIQUEIDENTIFIER,
    Action VARCHAR(100) NOT NULL,
    EntityType VARCHAR(50),
    EntityId INT,
    Details NVARCHAR(1000),
    IpAddress VARCHAR(50),
    UserAgent NVARCHAR(500),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId)
);

-- Create index for audit log
CREATE INDEX IX_AuditLog_User ON AuditLog(UserId);
CREATE INDEX IX_AuditLog_Date ON AuditLog(CreatedAt);

-- =============================================
-- Insert Sample Data
-- =============================================

-- Sample Doctors
INSERT INTO Users (Email, PasswordHash, FullName, UserRole, Phone, Specialty, LicenseNumber, IsActive)
VALUES 
    ('dr.sarah@healthcare.com', '$2a$10$placeholder.hash.replace.this.with.actual', 'Dr. Sarah Johnson', 'Doctor', '+1-555-0101', 'Cardiology', 'MD12345', 1),
    ('dr.michael@healthcare.com', '$2a$10$placeholder.hash.replace.this.with.actual', 'Dr. Michael Chen', 'Doctor', '+1-555-0102', 'Dermatology', 'MD12346', 1),
    ('dr.emily@healthcare.com', '$2a$10$placeholder.hash.replace.this.with.actual', 'Dr. Emily Brown', 'Doctor', '+1-555-0103', 'General Medicine', 'MD12347', 1);

-- Sample Patients (Note: These are placeholder hashes, register through the app to create real accounts)
INSERT INTO Users (Email, PasswordHash, FullName, UserRole, Phone, DateOfBirth, Gender, BloodGroup, EmergencyContact, IsActive)
VALUES 
    ('john.doe@email.com', '$2a$10$placeholder.hash.replace.this.with.actual', 'John Doe', 'Patient', '+1-555-0201', '1985-03-15', 'Male', 'A+', '+1-555-0299', 1),
    ('jane.smith@email.com', '$2a$10$placeholder.hash.replace.this.with.actual', 'Jane Smith', 'Patient', '+1-555-0202', '1990-07-22', 'Female', 'O+', '+1-555-0298', 1);

-- =============================================
-- Stored Procedures
-- =============================================

-- Procedure to get available appointment slots
GO
CREATE PROCEDURE sp_GetAvailableSlots
    @StartDate DATE,
    @EndDate DATE,
    @DoctorId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SELECT 
        s.SlotId,
        s.DoctorId,
        s.SlotDate,
        s.SlotTime,
        u.FullName AS DoctorName,
        u.Specialty,
        u.Phone AS DoctorPhone
    FROM AppointmentSlots s
    INNER JOIN Users u ON s.DoctorId = u.UserId
    WHERE s.IsBooked = 0
        AND s.SlotDate BETWEEN @StartDate AND @EndDate
        AND (@DoctorId IS NULL OR s.DoctorId = @DoctorId)
        AND u.IsActive = 1
    ORDER BY s.SlotDate, s.SlotTime;
END;
GO

-- Procedure to book appointment
CREATE PROCEDURE sp_BookAppointment
    @PatientId UNIQUEIDENTIFIER,
    @SlotId INT,
    @Notes NVARCHAR(1000) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Check if slot is available
        IF NOT EXISTS (SELECT 1 FROM AppointmentSlots WHERE SlotId = @SlotId AND IsBooked = 0)
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50001, 'Slot is not available', 1;
        END
        
        -- Create appointment
        INSERT INTO Appointments (PatientId, SlotId, Status, Notes)
        VALUES (@PatientId, @SlotId, 'Confirmed', @Notes);
        
        DECLARE @AppointmentId INT = SCOPE_IDENTITY();
        
        -- Mark slot as booked
        UPDATE AppointmentSlots SET IsBooked = 1 WHERE SlotId = @SlotId;
        
        -- Create notification for patient
        INSERT INTO Notifications (UserId, Title, Message, Type)
        SELECT @PatientId, 'Appointment Confirmed', 
               'Your appointment has been confirmed for ' + CONVERT(VARCHAR, SlotDate) + ' at ' + CONVERT(VARCHAR, SlotTime, 8),
               'Appointment'
        FROM AppointmentSlots WHERE SlotId = @SlotId;
        
        -- Create notification for doctor
        INSERT INTO Notifications (UserId, Title, Message, Type)
        SELECT DoctorId, 'New Appointment Booked',
               'A patient has booked an appointment for ' + CONVERT(VARCHAR, SlotDate) + ' at ' + CONVERT(VARCHAR, SlotTime, 8),
               'Appointment'
        FROM AppointmentSlots WHERE SlotId = @SlotId;
        
        COMMIT TRANSACTION;
        
        SELECT @AppointmentId AS AppointmentId;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- Procedure to get patient medical history
CREATE PROCEDURE sp_GetPatientMedicalHistory
    @PatientId UNIQUEIDENTIFIER
AS
BEGIN
    SELECT 
        h.HistoryId,
        h.Diagnosis,
        h.Symptoms,
        h.Treatment,
        h.RecordedAt,
        u.FullName AS DoctorName,
        u.Specialty
    FROM MedicalHistory h
    LEFT JOIN Users u ON h.DoctorId = u.UserId
    WHERE h.PatientId = @PatientId
    ORDER BY h.RecordedAt DESC;
END;
GO

-- Procedure to get dashboard statistics
CREATE PROCEDURE sp_GetDashboardStats
    @UserId UNIQUEIDENTIFIER,
    @UserRole VARCHAR(20)
AS
BEGIN
    IF @UserRole = 'Patient'
    BEGIN
        SELECT 
            (SELECT COUNT(*) FROM Appointments WHERE PatientId = @UserId AND Status = 'Confirmed') AS UpcomingAppointments,
            (SELECT COUNT(*) FROM MedicalReports WHERE UserId = @UserId) AS TotalReports,
            (SELECT COUNT(*) FROM Prescriptions WHERE PatientId = @UserId) AS TotalPrescriptions,
            (SELECT COUNT(*) FROM Notifications WHERE UserId = @UserId AND IsRead = 0) AS UnreadNotifications;
    END
    ELSE IF @UserRole = 'Doctor'
    BEGIN
        SELECT 
            (SELECT COUNT(*) FROM Appointments a 
             INNER JOIN AppointmentSlots s ON a.SlotId = s.SlotId 
             WHERE s.DoctorId = @UserId AND a.Status = 'Confirmed') AS UpcomingAppointments,
            (SELECT COUNT(*) FROM Prescriptions WHERE DoctorId = @UserId) AS TotalPrescriptions,
            (SELECT COUNT(DISTINCT PatientId) FROM Appointments a
             INNER JOIN AppointmentSlots s ON a.SlotId = s.SlotId
             WHERE s.DoctorId = @UserId) AS TotalPatients,
            (SELECT COUNT(*) FROM Notifications WHERE UserId = @UserId AND IsRead = 0) AS UnreadNotifications;
    END
END;
GO

-- =============================================
-- Views
-- =============================================

-- View for upcoming appointments
CREATE VIEW vw_UpcomingAppointments AS
SELECT 
    a.AppointmentId,
    a.Status,
    s.SlotDate,
    s.SlotTime,
    p.UserId AS PatientId,
    p.FullName AS PatientName,
    p.Phone AS PatientPhone,
    d.UserId AS DoctorId,
    d.FullName AS DoctorName,
    d.Specialty,
    d.Phone AS DoctorPhone
FROM Appointments a
INNER JOIN AppointmentSlots s ON a.SlotId = s.SlotId
INNER JOIN Users p ON a.PatientId = p.UserId
INNER JOIN Users d ON s.DoctorId = d.UserId
WHERE s.SlotDate >= CAST(GETDATE() AS DATE)
    AND a.Status IN ('Confirmed', 'Pending');
GO

-- View for patient complete profile
CREATE VIEW vw_PatientProfile AS
SELECT 
    u.UserId,
    u.Email,
    u.FullName,
    u.Phone,
    u.DateOfBirth,
    u.Gender,
    u.BloodGroup,
    u.Address,
    u.EmergencyContact,
    COUNT(DISTINCT a.AppointmentId) AS TotalAppointments,
    COUNT(DISTINCT mr.ReportId) AS TotalReports,
    COUNT(DISTINCT p.PrescriptionId) AS TotalPrescriptions
FROM Users u
LEFT JOIN Appointments a ON u.UserId = a.PatientId
LEFT JOIN MedicalReports mr ON u.UserId = mr.UserId
LEFT JOIN Prescriptions p ON u.UserId = p.PatientId
WHERE u.UserRole = 'Patient'
GROUP BY u.UserId, u.Email, u.FullName, u.Phone, u.DateOfBirth, 
         u.Gender, u.BloodGroup, u.Address, u.EmergencyContact;
GO