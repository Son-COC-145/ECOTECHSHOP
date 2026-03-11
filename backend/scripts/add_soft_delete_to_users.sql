-- =====================================================
-- Thêm Soft Delete cho Users
-- File: add_soft_delete_to_users.sql
-- =====================================================

USE ecodb;

-- 1. Thêm cột isDeleted
SET @col1 = 0;
SELECT COUNT(*) INTO @col1 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'ecodb' AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'isDeleted';

SET @sql1 = IF(@col1 = 0, 
    'ALTER TABLE Users ADD COLUMN isDeleted BOOLEAN DEFAULT FALSE COMMENT ''Đánh dấu đã xóa (soft delete)''',
    'SELECT ''Column isDeleted already exists'' AS Info');
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- 2. Thêm cột deletedAt
SET @col2 = 0;
SELECT COUNT(*) INTO @col2 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'ecodb' AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'deletedAt';

SET @sql2 = IF(@col2 = 0, 
    'ALTER TABLE Users ADD COLUMN deletedAt DATETIME DEFAULT NULL COMMENT ''Thời điểm xóa''',
    'SELECT ''Column deletedAt already exists'' AS Info');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
