# Data Model

## Tables
### users
- id (PK, int, auto)
- name (varchar 100, not null)
- email (varchar 255, unique, not null)
- password_hash (varchar 255, not null)
- created_at (datetime, default now)
- updated_at (datetime, default now)

### posts
- id (PK, int, auto)
- user_id (FK → users.id, not null, index)
- title (varchar 200, not null)
- slug (varchar 220, unique, not null)
- content (longtext, not null)
- published (boolean, default false)
- created_at (datetime, default now)
- updated_at (datetime, default now)

### categories
- id (PK, int, auto)
- name (varchar 100, unique, not null)
- slug (varchar 120, unique, not null)

### post_categories (junction)
- post_id (FK → posts.id, index, on delete cascade)
- category_id (FK → categories.id, index, on delete cascade)
- PK: (post_id, category_id)

## Indexes
- posts.slug (unique)
- categories.slug (unique)
- posts.user_id
- post_categories.post_id, post_categories.category_id

## Example rows
users:
- (1, "Alice", "alice@example.com", ...)

categories:
- (1, "AI", "ai"), (2, "Backend", "backend"), (3, "Frontend", "frontend")

posts:
- (1, 1, "Intro to Vector DBs", "intro-to-vector-dbs", "...", true, ...)

post_categories:
- (1, 1), (1, 2)
