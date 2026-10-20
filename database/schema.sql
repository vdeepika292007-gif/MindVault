-- ==============================================================================
-- MindVault Version 2 — MySQL Database Schema
-- Multi-user personal knowledge vault with secure relational ownership
-- ==============================================================================

-- 1. Create database with full UTF-8 Unicode support (supports emoji, code symbols)
CREATE DATABASE IF NOT EXISTS `mindvault`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `mindvault`;

-- ------------------------------------------------------------------------------
-- Table: users
-- Stores registered user accounts with securely hashed passwords
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table: captures
-- Stores user-owned captures (Notes, Ideas, Links, Snippets)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `captures` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` MEDIUMTEXT NOT NULL,
  `type` ENUM('note', 'idea', 'link', 'snippet') NOT NULL DEFAULT 'note',
  `url` VARCHAR(1000) DEFAULT NULL,
  `tags` JSON DEFAULT NULL,
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Relational integrity: deleting an account cascades to delete their captures
  CONSTRAINT `fk_captures_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) 
    ON DELETE CASCADE,

  -- Performance indexes for fast filtering, sorting, and user-scoped retrieval
  INDEX `idx_user_status_pin` (`user_id`, `is_archived`, `is_pinned`),
  INDEX `idx_user_updated` (`user_id`, `updated_at`),
  INDEX `idx_user_type` (`user_id`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table: user_settings
-- Stores user preferences (theme, last daily insight date)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_settings` (
  `user_id` INT UNSIGNED NOT NULL PRIMARY KEY,
  `theme` VARCHAR(20) NOT NULL DEFAULT 'light',
  `last_insight_date` VARCHAR(20) DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_settings_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
