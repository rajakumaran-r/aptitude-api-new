# Aptitude Practice Web Application — Full REST API Documentation

> **Version:** 1.0.0  
> **Base URL (Local Development):** `http://localhost:5001`  
> **API Version Prefix:** `/api/v1`  
> **Architecture:** MongoDB Separate Collections per Topic (Multi-Collection Architecture)  
> **Target Audience:** Frontend Engineers building Web / Mobile Applications (React, Next.js, Vue, Angular, React Native, etc.)

---

## Table of Contents

1. [Overview & Core Architecture](#1-overview--core-architecture)
2. [Global Standards & Conventions](#2-global-standards--conventions)
   - [Base URL & Headers](#base-url--headers)
   - [Standard Success Response Structure](#standard-success-response-structure)
   - [Standard Error Response Structure](#standard-error-response-structure)
   - [HTTP Status Codes](#http-status-codes)
3. [Question Data Model (TypeScript Interfaces)](#3-question-data-model-typescript-interfaces)
4. [Supported Topics & Collection Slugs](#4-supported-topics--collection-slugs)
5. [System & Health Endpoints](#5-system--health-endpoints)
6. [Topics & Patterns Metadata Endpoints](#6-topics--patterns-metadata-endpoints)
   - [1. Get All Topics with Counts & Patterns](#61-get-all-topics-with-counts--patterns)
   - [2. Get Patterns for a Specific Topic](#62-get-patterns-for-a-specific-topic)
   - [3. Get Question Count for a Topic](#63-get-question-count-for-a-topic)
   - [4. Get Question Count for a Pattern](#64-get-question-count-for-a-pattern)
7. [Question Retrieval Endpoints](#7-question-retrieval-endpoints)
   - [1. Get Questions for a Topic (Paginated)](#71-get-questions-for-a-topic-paginated)
   - [2. Get Questions by Pattern (Paginated)](#72-get-questions-by-pattern-paginated)
   - [3. Get All Questions Globally (Paginated)](#73-get-all-questions-globally-paginated)
   - [4. Get Random Questions (Mock Tests / Quizzes)](#74-get-random-questions-mock-tests--quizzes)
   - [5. Full-Text / Keyword Search](#75-full-text--keyword-search)
   - [6. Get Question by ID](#76-get-question-by-id)
8. [Question Mutation Endpoints (CRUD)](#8-question-mutation-endpoints-crud)
   - [1. Create Question](#81-create-question)
   - [2. Full Update Question (PUT)](#82-full-update-question-put)
   - [3. Partial Update Question (PATCH)](#83-partial-update-question-patch)
   - [4. Delete Question (DELETE)](#84-delete-question-delete)
9. [Frontend Integration Guide & Code Examples](#9-frontend-integration-guide--code-examples)
   - [Axios / Fetch API Client Service](#axios--fetch-api-client-service)
   - [Handling URL Encoding for Pattern Names](#handling-url-encoding-for-pattern-names)
   - [Interactive Practice Flow (State Management Pattern)](#interactive-practice-flow-state-management-pattern)

---

## 1. Overview & Core Architecture

The Aptitude Practice API is a high-performance REST backend powering topic-wise and pattern-wise aptitude practice.

### Key Backend Architectural Highlights
* **Separate Topic Collections:** Each aptitude topic is stored in its own dedicated MongoDB collection (`age`, `percentage`, `profit_and_loss`, `time_and_work`, etc.).
* **100% Database Driven:** All topic lists, patterns, and question counts are queried dynamically from MongoDB.
* **100% Deduplication Guarantee:** Aggregation pipelines automatically deduplicate questions across collections.
* **Smart Word-Boundary Search:** Full-text search searches whole words and word stems (e.g. searching `q=age` matches age questions without false-matching `percentage` or `average`).
* **Strict 5-Field Question Schema:** Every question strictly contains `question`, `answer`, `options` (exactly 4 strings), `explanation`, and `pattern`.

---

## 2. Global Standards & Conventions

### Base URL & Headers
* **Base URL:** `http://localhost:5001`
* **Request Header:**
  ```http
  Content-Type: application/json
  Accept: application/json
  ```

### Standard Success Response Structure

All successful responses (HTTP 2xx) return a unified envelope:

```json
{
  "success": true,
  "message": "Human-readable success message",
  "data": { ... } | [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25
  },
  "topic": "Problems on Ages",
  "collection": "age",
  "pattern": "Ratio Changes Over Time (Past → Future)"
}
```

* `pagination` is present whenever a paginated list is requested.
* `topic`, `collection`, and `pattern` metadata are included on topic/pattern endpoints to assist UI breadcrumbs.

### Standard Error Response Structure

All error responses (HTTP 4xx/5xx) follow a predictable structure:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "answer",
        "message": "Answer must match one of the four options"
      }
    ]
  }
}
```

### HTTP Status Codes

| Status Code | Description | Meaning for Frontend |
| :--- | :--- | :--- |
| **`200 OK`** | Request succeeded | Display returned data |
| **`201 Created`** | Document created successfully | Show success toast, redirect |
| **`400 Bad Request`** | Validation error / Invalid parameter | Highlight invalid form fields |
| **`404 Not Found`** | Topic, pattern, or question ID not found | Display empty state or 404 page |
| **`409 Conflict`** | Duplicate question text detected | Show duplicate warning |
| **`429 Too Many Requests`** | Rate limit exceeded | Prompt user to wait |
| **`500 Internal Server Error`**| Backend unhandled error | Show retry banner |

---

## 3. Question Data Model (TypeScript Interfaces)

Frontend developers can copy and paste these TypeScript interfaces into their codebase:

```typescript
/**
 * Core Question Interface
 */
export interface Question {
  _id: string;
  question: string;
  answer: string;
  options: [string, string, string, string]; // Exactly 4 non-empty options
  explanation: string;
  pattern: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Topic Summary with live counts and patterns
 */
export interface TopicSummary {
  slug: string;           // URL slug (e.g. "profit-and-loss", "age")
  collectionName: string; // MongoDB collection name (e.g. "profit_and_loss")
  name: string;           // Display Name (e.g. "Profit and Loss")
  patternCount: number;   // Number of patterns available in this topic
  questionCount: number;  // Total questions in this topic
  patterns: string[];     // List of pattern names
}

/**
 * Pagination Envelope
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * API Response Envelopes
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: PaginationMeta;
  topic?: string;
  collection?: string;
  pattern?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details: Array<{ field?: string; message: string }> | string[];
  };
}
```

---

## 4. Supported Topics & Collection Slugs

You can pass either the **slug** (kebab-case) or **collection name** (snake_case) in any topic endpoint:

| # | Display Name | URL Slug | MongoDB Collection | Sample Live Link |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Problems on Ages | `age` | `age` | [`/api/v1/topics/age/patterns`](http://localhost:5001/api/v1/topics/age/patterns) |
| 2 | Percentage | `percentage` | `percentage` | [`/api/v1/topics/percentage/patterns`](http://localhost:5001/api/v1/topics/percentage/patterns) |
| 3 | Profit and Loss | `profit-and-loss` | `profit_and_loss` | [`/api/v1/topics/profit-and-loss/patterns`](http://localhost:5001/api/v1/topics/profit-and-loss/patterns) |
| 4 | Time and Work | `time-and-work` | `time_and_work` | [`/api/v1/topics/time-and-work/patterns`](http://localhost:5001/api/v1/topics/time-and-work/patterns) |
| 5 | Time, Speed & Distance | `time-speed-and-distance` | `time_speed_and_distance` | [`/api/v1/topics/time-speed-and-distance/patterns`](http://localhost:5001/api/v1/topics/time-speed-and-distance/patterns) |
| 6 | Problems on Trains | `trains` | `trains` | [`/api/v1/topics/trains/patterns`](http://localhost:5001/api/v1/topics/trains/patterns) |
| 7 | Boats and Streams | `boats-and-streams` | `boats_and_streams` | [`/api/v1/topics/boats-and-streams/patterns`](http://localhost:5001/api/v1/topics/boats-and-streams/patterns) |
| 8 | Ratio and Proportion | `ratio-and-proportion` | `ratio_and_proportion` | [`/api/v1/topics/ratio-and-proportion/patterns`](http://localhost:5001/api/v1/topics/ratio-and-proportion/patterns) |
| 9 | Probability | `probability` | `probability` | [`/api/v1/topics/probability/patterns`](http://localhost:5001/api/v1/topics/probability/patterns) |
| 10 | Permutation & Combination | `permutation-and-combination` | `permutation_and_combination` | [`/api/v1/topics/permutation-and-combination/patterns`](http://localhost:5001/api/v1/topics/permutation-and-combination/patterns) |
| 11 | Simple Interest | `simple-interest` | `simple_interest` | [`/api/v1/topics/simple-interest/patterns`](http://localhost:5001/api/v1/topics/simple-interest/patterns) |
| 12 | Compound Interest | `compound-interest` | `compound_interest` | [`/api/v1/topics/compound-interest/patterns`](http://localhost:5001/api/v1/topics/compound-interest/patterns) |
| 13 | Number System | `number-system` | `number_system` | [`/api/v1/topics/number-system/patterns`](http://localhost:5001/api/v1/topics/number-system/patterns) |
| 14 | HCF and LCM | `hcf-and-lcm` | `hcf_and_lcm` | [`/api/v1/topics/hcf-and-lcm/patterns`](http://localhost:5001/api/v1/topics/hcf-and-lcm/patterns) |
| 15 | Mixture and Alligation | `mixture-and-alligation` | `mixture_and_alligation` | [`/api/v1/topics/mixture-and-alligation/patterns`](http://localhost:5001/api/v1/topics/mixture-and-alligation/patterns) |
| 16 | Pipes and Cisterns | `pipes-and-cisterns` | `pipes_and_cisterns` | [`/api/v1/topics/pipes-and-cisterns/patterns`](http://localhost:5001/api/v1/topics/pipes-and-cisterns/patterns) |
| 17 | Average | `average` | `average` | [`/api/v1/topics/average/patterns`](http://localhost:5001/api/v1/topics/average/patterns) |
| 18 | Partnership | `partnership` | `partnership` | [`/api/v1/topics/partnership/patterns`](http://localhost:5001/api/v1/topics/partnership/patterns) |
| 19 | Calendar | `calendar` | `calendar` | [`/api/v1/topics/calendar/patterns`](http://localhost:5001/api/v1/topics/calendar/patterns) |
| 20 | Clock | `clock` | `clock` | [`/api/v1/topics/clock/patterns`](http://localhost:5001/api/v1/topics/clock/patterns) |
| 21 | Algebra | `algebra` | `algebra` | [`/api/v1/topics/algebra/patterns`](http://localhost:5001/api/v1/topics/algebra/patterns) |
| 22 | Surds and Indices | `surds-and-indices` | `surds_and_indices` | [`/api/v1/topics/surds-and-indices/patterns`](http://localhost:5001/api/v1/topics/surds-and-indices/patterns) |
| 23 | Trigonometry | `trigonometry` | `trigonometry` | [`/api/v1/topics/trigonometry/patterns`](http://localhost:5001/api/v1/topics/trigonometry/patterns) |
| 24 | Volume and Surface Area | `volume-and-surface-area` | `volume_and_surface_area` | [`/api/v1/topics/volume-and-surface-area/patterns`](http://localhost:5001/api/v1/topics/volume-and-surface-area/patterns) |
| 25 | Stocks and Shares | `stocks-and-shares` | `stocks_and_shares` | [`/api/v1/topics/stocks-and-shares/patterns`](http://localhost:5001/api/v1/topics/stocks-and-shares/patterns) |
| 26 | Data Interpretation | `data-interpretation` | `data_interpretation` | [`/api/v1/topics/data-interpretation/patterns`](http://localhost:5001/api/v1/topics/data-interpretation/patterns) |

---

## 5. System & Health Endpoints

### 5.1 Health Check
Check server connectivity and uptime.

* **URL:** `GET /health` or `GET /api/v1/health`
* **Direct Browser Link:** [http://localhost:5001/health](http://localhost:5001/health)
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Aptitude API is healthy",
    "data": {
      "status": "UP",
      "timestamp": "2026-08-29T14:10:00.000Z",
      "uptime": 1245.82
    }
  }
  ```

---

## 6. Topics & Patterns Metadata Endpoints

Use these endpoints to build your **Topic Directory Navigation**, **Topic Dashboard Cards**, and **Pattern Selection Dropdowns**.

### 6.1 Get All Topics with Counts & Patterns
Returns all topic collections present in your database, along with total question count and available patterns for each.

* **URL:** `GET /api/v1/topics`
* **Direct Browser Link:** [http://localhost:5001/api/v1/topics](http://localhost:5001/api/v1/topics)
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Topics retrieved successfully",
    "data": [
      {
        "slug": "age",
        "collectionName": "age",
        "name": "Problems on Ages",
        "patternCount": 18,
        "questionCount": 500,
        "patterns": [
          "Sum + Ratio Combined",
          "Father–Son / Mother–Daughter Type",
          "Age After/Before N Years",
          "Ratio Changes Over Time (Past → Future)",
          "Difference of Ages is Constant (Key Trick)"
        ]
      },
      {
        "slug": "percentage",
        "collectionName": "percentage",
        "name": "Percentage",
        "patternCount": 57,
        "questionCount": 500,
        "patterns": [
          "Direct Percentage of a Number",
          "Finding Percentage Change",
          "Percentage Change in Price and Consumption",
          "Successive Discounts"
        ]
      }
    ]
  }
  ```

---

### 6.2 Get Patterns for a Specific Topic
Returns the exact list of patterns available within a specific topic collection.

* **URL:** `GET /api/v1/topics/:topic/patterns`
* **Direct Browser Link:** [http://localhost:5001/api/v1/topics/age/patterns](http://localhost:5001/api/v1/topics/age/patterns)
* **Path Parameters:**
  * `:topic` *(string, required)* — Topic slug (e.g. `age`, `percentage`, `profit-and-loss`).
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Patterns for topic 'Problems on Ages' retrieved successfully",
    "data": [
      "Sum + Ratio Combined",
      "Father–Son / Mother–Daughter Type",
      "Age After/Before N Years",
      "Average Age of a Group — Basic",
      "Ratio Changes Over Time (Past → Future)",
      "Difference of Ages is Constant (Key Trick)"
    ]
  }
  ```

---

### 6.3 Get Question Count for a Topic
Get the real-time number of questions stored in a topic's collection.

* **URL:** `GET /api/v1/topics/:topic/count`
* **Direct Browser Link:** [http://localhost:5001/api/v1/topics/age/count](http://localhost:5001/api/v1/topics/age/count)
* **Path Parameters:**
  * `:topic` *(string, required)* — Topic slug (e.g. `age`).
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Question count for topic 'Problems on Ages' retrieved successfully",
    "data": {
      "topic": "Problems on Ages",
      "slug": "age",
      "collectionName": "age",
      "count": 500
    }
  }
  ```

---

### 6.4 Get Question Count for a Pattern
Get question count for a specific pattern within a topic.

* **URL:** `GET /api/v1/topics/:topic/patterns/:pattern/count`
* **Direct Browser Link:** [http://localhost:5001/api/v1/topics/age/patterns/Sum%20%2B%20Ratio%20Combined/count](http://localhost:5001/api/v1/topics/age/patterns/Sum%20%2B%20Ratio%20Combined/count)
* **Path Parameters:**
  * `:topic` *(string, required)* — Topic slug (e.g. `age`).
  * `:pattern` *(string, required)* — Pattern name or slug (URL-encoded).
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Question count for pattern 'Sum + Ratio Combined' retrieved successfully",
    "data": {
      "topic": "Problems on Ages",
      "pattern": "Sum + Ratio Combined",
      "count": 35
    }
  }
  ```

---

## 7. Question Retrieval Endpoints

Use these endpoints to power **Topic Practice Pages**, **Pattern-specific Workouts**, **Mock Tests**, **Full-Text Search**, and **Question Detail Modals**.

---

### 7.1 Get Questions for a Topic (Paginated)
Fetch questions directly from a specific topic's collection with pagination.

* **URL:** `GET /api/v1/questions/topic/:topic`
* **Direct Browser Link:** [http://localhost:5001/api/v1/questions/topic/age?page=1&limit=20](http://localhost:5001/api/v1/questions/topic/age?page=1&limit=20)
* **Path Parameters:**
  * `:topic` *(string, required)* — Topic slug (e.g. `age`, `percentage`, `profit-and-loss`).
* **Query Parameters:**
  * `page` *(number, optional, default: 1)* — Page number (min: 1).
  * `limit` *(number, optional, default: 20)* — Number of items per page (min: 1, max: 100).
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Questions for topic 'Problems on Ages' retrieved successfully",
    "topic": "Problems on Ages",
    "collection": "age",
    "data": [
      {
        "_id": "6a8fdf910beec31a32727a34",
        "question": "The sum of the present ages of Leela and Kamala is 13 years. After 13 years, the ratio of their ages will be 8:5. Find Leela's present age.",
        "answer": "11 years",
        "options": [
          "24 years",
          "2 years",
          "11 years",
          "14 years"
        ],
        "explanation": "Step 1: Let their ages after 13 years be 8t and 5t. Step 2: Present ages are (8t - 13) and (5t - 13)...",
        "pattern": "Sum + Ratio Combined"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "totalPages": 25
    }
  }
  ```

---

### 7.2 Get Questions by Pattern (Paginated)
Targeted drill on a specific pattern within a topic.

* **URL:** `GET /api/v1/questions/topic/:topic/pattern/:pattern`
* **Direct Browser Link:** [http://localhost:5001/api/v1/questions/topic/age/pattern/Sum%20%2B%20Ratio%20Combined?page=1&limit=10](http://localhost:5001/api/v1/questions/topic/age/pattern/Sum%20%2B%20Ratio%20Combined?page=1&limit=10)
* **Path Parameters:**
  * `:topic` *(string, required)* — Topic slug (e.g. `age`).
  * `:pattern` *(string, required)* — Pattern name or slug (URL-encoded).
* **Query Parameters:**
  * `page` *(number, optional, default: 1)*
  * `limit` *(number, optional, default: 20, max: 100)*
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Questions for pattern 'Sum + Ratio Combined' retrieved successfully",
    "topic": "Problems on Ages",
    "collection": "age",
    "pattern": "Sum + Ratio Combined",
    "data": [
      {
        "_id": "6a8fdf910beec31a32727a34",
        "question": "The sum of the present ages of Leela and Kamala is 13 years. After 13 years, the ratio of their ages will be 8:5. Find Leela's present age.",
        "answer": "11 years",
        "options": ["24 years", "2 years", "11 years", "14 years"],
        "explanation": "Step 1: Let their ages after 13 years be 8t and 5t...",
        "pattern": "Sum + Ratio Combined"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 35,
      "totalPages": 4
    }
  }
  ```

---

### 7.3 Get All Questions Globally (Paginated)
Fetch questions across all topic collections with automatic deduplication.

* **URL:** `GET /api/v1/questions`
* **Direct Browser Link:** [http://localhost:5001/api/v1/questions?page=1&limit=20](http://localhost:5001/api/v1/questions?page=1&limit=20)
* **Query Parameters:**
  * `page` *(number, optional, default: 1)*
  * `limit` *(number, optional, default: 20, max: 100)*
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Questions retrieved successfully",
    "data": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 11500,
      "totalPages": 575
    }
  }
  ```

---

### 7.4 Get Random Questions (Mock Tests / Quizzes)
Returns a randomized set of unique questions. Ideal for **Quick Quizzes**, **Daily Practice**, and **Full-Length Mock Tests**.

#### Variations:

| Scenario | Endpoint | Direct Browser Link |
| :--- | :--- | :--- |
| **Global Mock Test** (across all topics) | `GET /api/v1/questions/random?limit=10` | [Open 10 Random](http://localhost:5001/api/v1/questions/random?limit=10) |
| **Topic Quiz** (e.g. 5 questions on Age) | `GET /api/v1/questions/topic/age/random?limit=5` | [Open 5 Age Random](http://localhost:5001/api/v1/questions/topic/age/random?limit=5) |
| **Pattern Quiz** (e.g. 3 questions on pattern) | `GET /api/v1/questions/topic/age/pattern/Sum%20%2B%20Ratio%20Combined/random?limit=3` | [Open 3 Pattern Random](http://localhost:5001/api/v1/questions/topic/age/pattern/Sum%20%2B%20Ratio%20Combined/random?limit=3) |

* **Query Parameters:**
  * `limit` *(number, optional, default: 10, max: 50)* — Number of random questions to return.
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Random questions retrieved successfully",
    "data": [
      {
        "_id": "6a8ff25d751f4a6289c8f321",
        "question": "A father divides $42,000 between his two sons aged 10 and 15 years such that when they reach the age of 20 years, they receive equal amounts. If the rate of simple interest is 10% per annum, find the share of the younger son.",
        "answer": "$18,000",
        "options": ["$17,000", "$18,000", "$19,000", "$24,000"],
        "explanation": "Younger son's money grows for 20 - 10 = 10 years...",
        "pattern": "Equal Amounts / Equal SI across Multiple Rates"
      }
    ]
  }
  ```

---

### 7.5 Full-Text / Keyword Search
Searches questions using word-boundary matching across all topic collections.

* **URL:** `GET /api/v1/questions/search?q=:query`
* **Direct Browser Link:** [http://localhost:5001/api/v1/questions/search?q=age&limit=5](http://localhost:5001/api/v1/questions/search?q=age&limit=5)
* **Query Parameters:**
  * `q` *(string, required)* — Search query keyword or phrase (e.g. `age`, `speed`, `discount`, `train`).
  * `page` *(number, optional, default: 1)*
  * `limit` *(number, optional, default: 20, max: 100)*
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Search results retrieved successfully",
    "data": [
      {
        "_id": "6a8ff25d751f4a6289c8f321",
        "question": "A father divides $42,000 between his two sons aged 10 and 15 years such that when they reach the age of 20 years, they receive equal amounts...",
        "answer": "$18,000",
        "options": ["$17,000", "$18,000", "$19,000", "$24,000"],
        "explanation": "Younger son's money grows for 20 - 10 = 10 years...",
        "pattern": "Equal Amounts / Equal SI across Multiple Rates"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 628,
      "totalPages": 126
    }
  }
  ```

---

### 7.6 Get Question by ID
Retrieve a single question by its MongoDB 24-character hex ObjectId.

* **URL:** `GET /api/v1/questions/:id`
* **Direct Browser Link:** [http://localhost:5001/api/v1/questions/6a8fdf910beec31a32727a34](http://localhost:5001/api/v1/questions/6a8fdf910beec31a32727a34)
* **Path Parameters:**
  * `:id` *(string, required)* — MongoDB 24-character hexadecimal ObjectId.
* **Optional Query Parameters:**
  * `topic` *(string, optional)* — Topic slug hint for faster single-collection lookup (e.g. `?topic=age`).
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Question retrieved successfully",
    "data": {
      "_id": "6a8fdf910beec31a32727a34",
      "question": "The sum of the present ages of Leela and Kamala is 13 years. After 13 years, the ratio of their ages will be 8:5. Find Leela's present age.",
      "answer": "11 years",
      "options": ["24 years", "2 years", "11 years", "14 years"],
      "explanation": "Step 1: Let their ages after 13 years be 8t and 5t...",
      "pattern": "Sum + Ratio Combined",
      "createdAt": "2026-08-27T10:00:00.000Z",
      "updatedAt": "2026-08-27T10:00:00.000Z"
    }
  }
  ```

---

## 8. Question Mutation Endpoints (CRUD)

Use these endpoints for Admin Question Management, Content Authoring, or User Contribution tools.

---

### 8.1 Create Question
Creates a new question document in the designated topic collection.

* **URL:** `POST /api/v1/questions`
* **Optional Query Parameter:**
  * `topic` *(string, optional, default: "percentage")* — Target topic collection (e.g. `?topic=age`).
* **Headers:** `Content-Type: application/json`
* **Request Body Schema:**
  ```json
  {
    "question": "A sum of money doubles itself in 8 years at simple interest. In how many years will it become 4 times?",
    "answer": "24 years",
    "options": [
      "16 years",
      "20 years",
      "24 years",
      "32 years"
    ],
    "explanation": "If sum doubles in 8 years, SI = P in 8 years. For 4 times, SI = 3P. Time = 3 × 8 = 24 years.",
    "pattern": "Times of Principal & Maturity Period"
  }
  ```
* **Validation Rules:**
  * `question`: Non-empty string (trimmed). Must be unique within the topic.
  * `options`: Array of exactly 4 non-empty strings.
  * `answer`: Non-empty string. **Must match one of the 4 options exactly**.
  * `explanation`: Non-empty string.
  * `pattern`: Non-empty string.
* **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "Question created successfully",
    "data": {
      "_id": "67be84a92c81d1e43b123456",
      "question": "A sum of money doubles itself in 8 years at simple interest. In how many years will it become 4 times?",
      "answer": "24 years",
      "options": ["16 years", "20 years", "24 years", "32 years"],
      "explanation": "If sum doubles in 8 years, SI = P in 8 years. For 4 times, SI = 3P. Time = 3 × 8 = 24 years.",
      "pattern": "Times of Principal & Maturity Period",
      "createdAt": "2026-08-29T14:15:00.000Z",
      "updatedAt": "2026-08-29T14:15:00.000Z"
    }
  }
  ```

---

### 8.2 Full Update Question (PUT)
Replaces all 5 fields of an existing question.

* **URL:** `PUT /api/v1/questions/:id`
* **Path Parameters:**
  * `:id` *(string, required)* — MongoDB ObjectId.
* **Request Body:** Requires all 5 fields (`question`, `answer`, `options` [4 items], `explanation`, `pattern`).
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Question updated successfully",
    "data": {
      "_id": "6a8fdf910beec31a32727a34",
      "question": "Updated question text...",
      "answer": "11 years",
      "options": ["24 years", "2 years", "11 years", "14 years"],
      "explanation": "Updated explanation...",
      "pattern": "Sum + Ratio Combined"
    }
  }
  ```

---

### 8.3 Partial Update Question (PATCH)
Updates only the supplied fields of an existing question.

* **URL:** `PATCH /api/v1/questions/:id`
* **Path Parameters:**
  * `:id` *(string, required)* — MongoDB ObjectId.
* **Request Body Example:**
  ```json
  {
    "explanation": "Corrected and simplified step 2 calculation."
  }
  ```
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Question updated successfully",
    "data": { ... }
  }
  ```

---

### 8.4 Delete Question (DELETE)
Permanently deletes a question by ID.

* **URL:** `DELETE /api/v1/questions/:id`
* **Path Parameters:**
  * `:id` *(string, required)* — MongoDB ObjectId.
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Question deleted successfully",
    "data": {
      "_id": "6a8fdf910beec31a32727a34",
      "question": "The sum of the present ages of Leela and Kamala is 13 years..."
    }
  }
  ```

---

## 9. Frontend Integration Guide & Code Examples

### Axios / Fetch API Client Service

Here is a ready-to-use TypeScript API client service:

```typescript
// src/services/apiClient.ts
import axios from 'axios';
import {
  ApiResponse,
  TopicSummary,
  Question,
  PaginationMeta
} from '../types';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const AptitudeApi = {
  // 1. Topics Metadata
  async getTopics(): Promise<TopicSummary[]> {
    const res = await API.get<ApiResponse<TopicSummary[]>>('/topics');
    return res.data.data;
  },

  async getTopicPatterns(topicSlug: string): Promise<string[]> {
    const res = await API.get<ApiResponse<string[]>>(`/topics/${topicSlug}/patterns`);
    return res.data.data;
  },

  async getTopicCount(topicSlug: string): Promise<number> {
    const res = await API.get<ApiResponse<{ count: number }>>(`/topics/${topicSlug}/count`);
    return res.data.data.count;
  },

  // 2. Practice Questions
  async getQuestionsByTopic(
    topicSlug: string,
    page = 1,
    limit = 20
  ): Promise<{ questions: Question[]; pagination: PaginationMeta }> {
    const res = await API.get<ApiResponse<Question[]>>(`/questions/topic/${topicSlug}`, {
      params: { page, limit },
    });
    return {
      questions: res.data.data,
      pagination: res.data.pagination!,
    };
  },

  async getQuestionsByPattern(
    topicSlug: string,
    pattern: string,
    page = 1,
    limit = 20
  ): Promise<{ questions: Question[]; pagination: PaginationMeta }> {
    const encodedPattern = encodeURIComponent(pattern);
    const res = await API.get<ApiResponse<Question[]>>(
      `/questions/topic/${topicSlug}/pattern/${encodedPattern}`,
      { params: { page, limit } }
    );
    return {
      questions: res.data.data,
      pagination: res.data.pagination!,
    };
  },

  // 3. Mock Test / Quizzes
  async getRandomMockTest(limit = 10): Promise<Question[]> {
    const res = await API.get<ApiResponse<Question[]>>('/questions/random', {
      params: { limit },
    });
    return res.data.data;
  },

  async getRandomTopicQuiz(topicSlug: string, limit = 5): Promise<Question[]> {
    const res = await API.get<ApiResponse<Question[]>>(`/questions/topic/${topicSlug}/random`, {
      params: { limit },
    });
    return res.data.data;
  },

  // 4. Search
  async searchQuestions(
    query: string,
    page = 1,
    limit = 20
  ): Promise<{ questions: Question[]; pagination: PaginationMeta }> {
    const res = await API.get<ApiResponse<Question[]>>('/questions/search', {
      params: { q: query, page, limit },
    });
    return {
      questions: res.data.data,
      pagination: res.data.pagination!,
    };
  },
};
```

---

### Handling URL Encoding for Pattern Names

Pattern names often contain special characters like `+`, `/`, `&`, or `—` (e.g. `"Sum + Ratio Combined"` or `"Father–Son / Mother–Daughter Type"`).

> **Crucial Rule for Frontend Routing:**  
> Always use `encodeURIComponent(pattern)` when embedding pattern names in the URL path:
>
> ```typescript
> const patternName = "Sum + Ratio Combined";
> const url = `/api/v1/questions/topic/age/pattern/${encodeURIComponent(patternName)}`;
> // Result: /api/v1/questions/topic/age/pattern/Sum%20%2B%20Ratio%20Combined
> ```

---

### Interactive Practice Flow (State Management Pattern)

```tsx
// Example React / Next.js Component Skeleton
import React, { useState, useEffect } from 'react';
import { AptitudeApi } from './apiClient';
import { Question } from './types';

export default function PracticeScreen({ topicSlug }: { topicSlug: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    AptitudeApi.getQuestionsByTopic(topicSlug, 1, 20).then(({ questions }) => {
      setQuestions(questions);
    });
  }, [topicSlug]);

  if (questions.length === 0) return <div>Loading questions...</div>;

  const currentQ = questions[currentIndex];

  const handleSelect = (option: string) => {
    setSelectedOption(option);
    setShowExplanation(true);
  };

  return (
    <div className="practice-card">
      <span className="badge">{currentQ.pattern}</span>
      <h2>{currentQ.question}</h2>

      <div className="options-grid">
        {currentQ.options.map((opt, idx) => {
          const isSelected = selectedOption === opt;
          const isCorrect = opt === currentQ.answer;
          let btnClass = "option-btn";
          if (showExplanation) {
            if (isCorrect) btnClass += " correct";
            else if (isSelected) btnClass += " wrong";
          }

          return (
            <button
              key={idx}
              className={btnClass}
              onClick={() => !showExplanation && handleSelect(opt)}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="explanation-box">
          <h3>Explanation:</h3>
          <p>{currentQ.explanation}</p>
          <button onClick={() => {
            setSelectedOption(null);
            setShowExplanation(false);
            setCurrentIndex((prev) => (prev + 1) % questions.length);
          }}>
            Next Question →
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 10. Summary Checklist for Frontend Developers

* [x] **Topics Directory:** Fetch dynamically via `GET /api/v1/topics`.
* [x] **Pattern Filter Dropdown:** Fetch dynamically via `GET /api/v1/topics/:topic/patterns`.
* [x] **Pagination:** Inspect `res.pagination.page`, `limit`, and `totalPages`.
* [x] **Mock Tests:** Call `GET /api/v1/questions/random?limit=10`.
* [x] **Search Bar:** Call `GET /api/v1/questions/search?q=keyword`.
* [x] **Error Handling:** Check `res.data.error.code` (`NOT_FOUND`, `VALIDATION_ERROR`, etc.).
