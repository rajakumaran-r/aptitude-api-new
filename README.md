# Aptitude Practice Web Application – Backend REST API (Separate Collections Architecture)

A production-grade, highly scalable RESTful API built with **Node.js**, **Express.js**, **MongoDB**, and **Mongoose** to serve aptitude questions for practice, mock tests, and test-preparation platforms.

> 📖 **Full API Reference**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete endpoint specifications, parameter boundaries, cURL examples, and frontend integration code snippets.

---

## 1. Database Architecture: Separate Collections per Topic

In this architecture, database **`aptitudeDB`** organizes questions into **separate dedicated collections per topic**:

```text
Database: aptitudeDB
  ├── Collection: percentage (500 questions)
  ├── Collection: profit_and_loss (500 questions)
  ├── Collection: age (500 questions)
  ├── Collection: time_and_work (500 questions)
  ├── Collection: probability (500 questions)
  ├── Collection: ratio_and_proportion (500 questions)
  ├── Collection: simple_interest (500 questions)
  ├── Collection: compound_interest (500 questions)
  ├── Collection: number_system (500 questions)
  └── ... (23 dedicated topic collections)
```

### Strict Schema Adherence
Every document within each collection contains **strictly and only the 5 required fields**:
```json
{
  "_id": ObjectId("66cead890123456789abcdef"),
  "question": "A monthly household electricity bill of ₹2,400 has a prompt rebate of 5%. What is the discount amount?",
  "answer": "₹120",
  "options": [
    "₹100",
    "₹120",
    "₹140",
    "₹240"
  ],
  "explanation": "Rebate amount = 5% of ₹2,400 = (5 / 100) × 2400 = 5 × 24 = ₹120.",
  "pattern": "Direct Percentage of a Number",
  "createdAt": "2026-08-27T07:05:24.000Z",
  "updatedAt": "2026-08-27T07:05:24.000Z"
}
```

**Zero custom fields**: No `topic`, `difficulty`, `isActive`, `category`, `slug`, or `tags` are stored in documents. The topic is naturally defined by the collection itself!

---

## 2. Dynamic Collection Model & Query Routing

### 1. Topic Endpoints (`/api/v1/questions/topic/:topic`)
When a client requests `GET /api/v1/questions/topic/percentage`, the server:
1. Resolves `:topic` to its collection name (`percentage`).
2. Dynamically binds a Mongoose model to `aptitudeDB.percentage`.
3. Executes indexed query & aggregation directly on the `percentage` collection.

### 2. Global Endpoints (`/api/v1/questions`, `/api/v1/questions/random`, `/api/v1/questions/search`)
When querying across all topics, the server utilizes native MongoDB `$unionWith` aggregation across topic collections with `$group` deduplication, ensuring top performance without loading data into Node.js memory.

---

## 3. Quick Start & Importing Data

### 1. Configure `.env`
Ensure `.env` points to `aptitudeDB`:
```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/aptitudeDB
CORS_ORIGIN=*
```

### 2. Run Bulk Import into Topic Collections
```bash
npm run import
```
This automatically parses all JSON files in `data/`, creates the dedicated collections (`percentage`, `profit_and_loss`, `age`, etc.), builds indexes on each, and imports **11,500 questions** in ~1 second.

### 3. Start the Server
```bash
# Development mode with hot-reload
npm run dev

# Production mode
npm start
```

### 4. Run Automated Tests
```bash
npm test
```

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/health` | Server health check |
| **GET** | `/api/v1/questions` | Paginated questions across all collections (`?page=1&limit=20`) |
| **GET** | `/api/v1/questions/:id` | Get question by ObjectId |
| **POST** | `/api/v1/questions` | Create question (saved in appropriate topic collection) |
| **PUT** | `/api/v1/questions/:id` | Update question |
| **DELETE**| `/api/v1/questions/:id` | Delete question |
| **GET** | `/api/v1/questions/topic/:topic` | Get questions directly from topic's collection (`?limit=20` or `?limit=1`) |
| **GET** | `/api/v1/questions/topic/:topic/pattern/:pattern` | Get questions by pattern within a topic collection |
| **GET** | `/api/v1/questions/random` | Random unique questions across all collections (`?limit=10`) |
| **GET** | `/api/v1/questions/topic/:topic/random` | Random unique questions from topic's collection |
| **GET** | `/api/v1/questions/search` | Search questions across collections (`?q=...`) |
| **GET** | `/api/v1/topics` | List available topic collections with question counts |
| **GET** | `/api/v1/topics/:topic/patterns` | Patterns belonging to a topic collection |
| **GET** | `/api/v1/topics/:topic/count` | Question count directly from topic's collection |
| **GET** | `/api/v1/topics/:topic/patterns/:pattern/count` | Count for pattern in topic collection |

---

## 5. Request & Response Examples

### 1. Get Questions for a Topic (Queried directly from `aptitudeDB.percentage`)
```http
GET /api/v1/questions/topic/percentage?limit=1
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Questions for topic 'Percentage' retrieved successfully",
  "topic": "Percentage",
  "collection": "percentage",
  "data": [
    {
      "_id": "66cead890123456789abcdef",
      "question": "A monthly household electricity bill of ₹2,400 has a prompt payment rebate of 5%. What is the discount amount?",
      "answer": "₹120",
      "options": ["₹100", "₹120", "₹140", "₹240"],
      "explanation": "Rebate amount = 5% of ₹2,400 = (5 / 100) × 2400 = 5 × 24 = ₹120.",
      "pattern": "Direct Percentage of a Number",
      "createdAt": "2026-08-27T07:05:24.000Z",
      "updatedAt": "2026-08-27T07:05:24.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 1,
    "total": 500,
    "totalPages": 500
  }
}
```

### 2. List Topics with Live Collection Counts
```http
GET /api/v1/topics
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Topics retrieved successfully",
  "data": [
    {
      "slug": "percentage",
      "collectionName": "percentage",
      "name": "Percentage",
      "patternCount": 14,
      "questionCount": 500,
      "patterns": [
        "Direct Percentage of a Number",
        "Percentage Increase/Decrease",
        "Successive Percentage Change"
      ]
    },
    {
      "slug": "profit-and-loss",
      "collectionName": "profit_and_loss",
      "name": "Profit and Loss",
      "patternCount": 16,
      "questionCount": 500
    }
  ]
}
```

---

## 6. Duplicate Prevention & Validation

1. **Storage Level**: Each topic collection has a unique index on `{ question: 1 }`.
2. **Retrieval Level**: Every GET bulk operation executes a MongoDB `$group` on `question` to guarantee 100% unique question texts.
3. **Strict Validation**: Handled by Joi schemas (exactly 4 options, answer exists in options, non-empty trimmed strings).
# aptitude-api-new
# aptitude-api-new
