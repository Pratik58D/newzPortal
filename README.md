# News Portal — Backend

### Node.js + Express + MongoDB backend for a news portal
- Features: users, categories, news articles, authenticated comments
- Image upload (Multer → Cloudinary), search, pagination, role-based auth

---

## Table of Contents

- [What is this](#what-is-this)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Install](#install)
- [Environment variables](#environment-variables)
- [Run](#run)
- [Project structure (recommended)](#project-structure-recommended)
- [Models overview](#models-overview)
- [Auth & middleware](#auth--middleware)
- [File upload (Multer + Cloudinary)](#file-upload-multer--cloudinary)
- [Pagination utility](#pagination-utility)
- [Main API endpoints (summary)](#main-api-endpoints-summary)
- [Example requests](#example-requests)
- [Notes & best practices](#notes--best-practices)
- [Testing & deployment](#testing--deployment)
- [Contributing](#contributing)
- [License](#license)

---

## What is this

This is the backend for a news portal. Features implemented:

- Admin user management (register/login, role-based access)
- Create / Update / Delete news (admin-only)
- News have multiple images stored on Cloudinary (Multer memory storage)
- Categories (optional province) — can be province-specific or national/international
- Authenticated user comments with moderation status
- Search + sorting + pagination for news and categories
- Virtual population to include comments on news responses

---

## Tech stack

- Node.js (LTS)
- Express
- MongoDB + Mongoose
- Multer (memory storage)
- Cloudinary (image hosting)
- bcryptjs, jsonwebtoken
- dotenv

---

## Prerequisites

- Node.js (16+ recommended)
- npm or yarn
- MongoDB instance (local or cloud)
- Cloudinary account

---

## Install

```bash
git clone <repo-url>
cd backend
npm install
```

## Environment variables

- Create a .env file at project root with at least:
- PORT=
- NODE_ENV=development
- MONGO_URI=mongodb+srv://...    
- JWT_SECRET=your_jwt_secret

- CLOUDINARY_CLOUD_NAME=your_cloud_name
- CLOUDINARY_API_KEY=your_api_key
- CLOUDINARY_API_SECRET=your_api_secret


## Models overview

### User
- name, email, password (hashed), role (user, editor, admin, or superadmin)
- password field uses select: false.

### Category
- name, slug, province (optional enum: koshi, madesh,bagmati, gandaki, lumbini, karnali, sudurpashchim)

### NewsArticle
- title, slug, 
- images: [String] (Cloudinary URLs),
- category: ObjectId(ref Category),
- description, date, status (pending|approved|rejected) 
- count (e.g., views)
- Text index on title, description for full-text searching 
- Virtual comments (see below)

## Comment
- newsId: ObjectId(ref NewsArticle),
- userId: ObjectId(ref User), commentText,
- status (pending|approved|rejected)

## Auth & middleware

### auth.js
- authMiddleware — verifies JWT (cookie or header) and sets req.user
- adminOnly (or role) — checks req.user.role === 'admin'
- errorHandler.js
 Central error handler to send friendly errors
- multer.js
- Use multer.memoryStorage() (no local disk)
- Limits file size and accepts only image/*
### File upload (Multer + Cloudinary)
- Multer stores files in RAM: req.files → use file.buffer
- Use cloudinary.uploader.upload_stream() to upload buffer and get result.secure_url
- Save URLs in news.images array
- When deleting, extract Cloudinary public_id from the URL and call cloudinary.uploader.destroy(public_id)
- Helper to extract public id (example): utils/cloudinaryHelpers.js


## Main API endpoints (summary)
### Auth / Users
- POST /api/register — create a regular user account
- POST /api/login — login (returns cookie or token)

### News
- GET /api/news — list news (query: page, limit, search, province, categoryId) — public
- GET /api/news/:slug — get single news with category + comments — public
- POST /api/news/create — create news — admin only (multipart/form-data with images files)
- PUT /api/news/:id — update news — admin only (accept images to replace/append)
- DELETE /api/news/:id — delete news — admin only (optionally delete images from Cloudinary)

### Categories
- GET /api/categories — get all categories
- GET /api/categories/search — search categories (query: search, province, page, limit)
- GET /api/categories/slug/:slug/news — get category + paginated news (virtual populate)
- POST /api/categories — create category — admin only
- DELETE /api/categories/:id — delete category — admin only

### Comments (authenticated users)
- POST /api/comments — create comment (requires login; body: newsId, commentText)
- GET /api/comments?newsId=xxx — get comments for a news (supports page & limit)
- PUT /api/comments/:id — update comment (admin/moderator or via moderation)
- DELETE /api/comments/:id — delete comment (admin)

### License
- authur: pratik devkota
