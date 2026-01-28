-- =====================================================
-- Thêm Soft Delete cho Address
-- File: add_soft_delete_to_address.sql
-- =====================================================

USE ecodb;

-- 1. Kiểm tra và thêm cột isDeleted
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'ecodb' 
AND TABLE_NAME = 'Address' 
AND COLUMN_NAME = 'isDeleted';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE Address ADD COLUMN isDeleted BOOLEAN DEFAULT FALSE COMMENT ''Đánh dấu đã xóa (soft delete)''',
    'SELECT ''Column isDeleted already exists'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Kiểm tra và thêm cột deletedAt
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'ecodb' 
AND TABLE_NAME = 'Address' 
AND COLUMN_NAME = 'deletedAt';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE Address ADD COLUMN deletedAt DATETIME NULL COMMENT ''Thời điểm xóa''',
    'SELECT ''Column deletedAt already exists'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Kiểm tra và thêm cột deletedBy
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'ecodb' 
AND TABLE_NAME = 'Address' 
AND COLUMN_NAME = 'deletedBy';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE Address ADD COLUMN deletedBy INT NULL COMMENT ''User ID người xóa''',
    'SELECT ''Column deletedBy already exists'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Thêm index (MySQL tự động bỏ qua nếu đã tồn tại)
CREATE INDEX idx_address_deleted ON Address(isDeleted, deletedAt);

-- 5. Kiểm tra kết quả
SELECT 'Migration completed successfully!' AS status;
DESCRIBE Address;
