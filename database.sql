CREATE DATABASE IF NOT EXISTS attendance_db;
USE attendance_db;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    emp_code VARCHAR(50) UNIQUE,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    role ENUM('staff', 'line_manager', 'department_head', 'management_hr', 'employee', 'manager', 'admin'),
    department VARCHAR(100),
    manager_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS company_location (
    id INT PRIMARY KEY,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    radius_meters INT DEFAULT 100
);

CREATE TABLE IF NOT EXISTS attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    date DATE,
    check_in_time TIME,
    check_in_lat DECIMAL(10,8),
    check_in_lon DECIMAL(11,8),
    check_out_time TIME,
    check_out_lat DECIMAL(10,8),
    check_out_lon DECIMAL(11,8),
    is_late BOOLEAN,
    is_early_checkout BOOLEAN,
    worked_hours DECIMAL(5,2),
    remark VARCHAR(255),
    requires_manager_approval BOOLEAN DEFAULT FALSE,
    manager_approved BOOLEAN,
    manager_approved_at TIMESTAMP NULL,
    manager_approved_by INT,
    needs_approval_reason VARCHAR(255),
    swapped_out BOOLEAN DEFAULT FALSE,
    UNIQUE KEY uq_attendance_user_date (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (manager_approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    type ENUM('leave', 'permission', 'flexible', 'ot'),
    date DATE,
    start_time TIME,
    end_time TIME,
    leave_type VARCHAR(50),
    backup_user_id INT,
    backup_status VARCHAR(20) DEFAULT 'skipped',
    backup_approved_at TIMESTAMP NULL,
    line_manager_status VARCHAR(20) DEFAULT 'pending',
    line_manager_approved_by INT,
    line_manager_approved_at TIMESTAMP NULL,
    department_head_status VARCHAR(20) DEFAULT 'pending',
    department_head_approved_by INT,
    department_head_approved_at TIMESTAMP NULL,
    hr_status VARCHAR(20) DEFAULT 'pending',
    hr_approved_by INT,
    hr_approved_at TIMESTAMP NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected', 'cancelled'),
    admin_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (backup_user_id) REFERENCES users(id),
    FOREIGN KEY (line_manager_approved_by) REFERENCES users(id),
    FOREIGN KEY (department_head_approved_by) REFERENCES users(id),
    FOREIGN KEY (hr_approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS swap_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requester_id INT,
    target_user_id INT,
    swap_date DATE,
    status ENUM('pending', 'accepted_by_target', 'approved_by_manager', 'approved_by_admin', 'rejected'),
    FOREIGN KEY (requester_id) REFERENCES users(id),
    FOREIGN KEY (target_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS location_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    date DATE,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    distance_meters DECIMAL(10,2),
    action_type VARCHAR(20),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO company_location (id, latitude, longitude, radius_meters)
VALUES (1, 11.52812457, 104.91222854, 100)
ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), radius_meters = VALUES(radius_meters);
