# Data Models

## Document Database Schema

To track uploaded documents, the database schema (managed via Drizzle ORM) defines a `documents` entity:

| Field | Type (SQLite) | Type (Postgres) | Description |
| :--- | :--- | :--- | :--- |
| `id` | `text` (UUID) | `uuid` (UUID) | Unique document ID |
| `userId` | `text` | `uuid` | Owner of the document (Mocked in Local Mode) |
| `name` | `text` | `varchar(255)` | Original filename |
| `storagePath` | `text` | `text` | Key/Path in storage adapter |
| `fileSize` | `integer` | `integer` | File size in bytes |
| `status` | `text` | `varchar(50)` | `pending` \| `processing` \| `completed` \| `failed` |
| `createdAt` | `integer` (epoch) | `timestamp` | Creation timestamp |
| `updatedAt` | `integer` (epoch) | `timestamp` | Last update timestamp |
