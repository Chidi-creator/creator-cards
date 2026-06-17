# Creator Cards API

A REST API for creating, retrieving, and deleting creator profile cards with support for service rates, link collections, and access control.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [POST /creator-cards](#post-creator-cards)
  - [GET /creator-cards/:slug](#get-creator-cardsslug)
  - [DELETE /creator-cards/:slug](#delete-creator-cardsslug)
- [Error Codes](#error-codes)
- [Data Model](#data-model)
- [Deployment](#deployment)

---

## Tech Stack

- **Runtime:** Node.js (CommonJS)
- **Framework:** Express.js via `@app-core/server` wrapper
- **Database:** MongoDB via Mongoose
- **ID generation:** ULID (exposed as `id` in all responses)
- **Validation:** VSL (custom domain-specific language via `@app-core/validator`)

---

## Project Structure

```
.
├── app.js                        # Express app setup and endpoint registration
├── bootstrap.js                  # Entry point; loads env then requires app.js
├── core/
│   ├── errors/                   # throwAppError and error code constants
│   ├── express/                  # createServer and createHandler factories
│   ├── logger/                   # Pino-based structured logger
│   ├── mock-factory/             # In-memory model mocks for testing
│   ├── mongoose/                 # Connection, ModelSchema, DatabaseModel, ULID support
│   ├── randomness/               # ULID, UUID, and random byte generators
│   ├── repository-factory/       # Generic CRUD factory (create, findOne, updateOne, deleteOne)
│   └── validator-vsl/            # VSL schema parser and validator
├── endpoints/
│   └── creator-cards/
│       ├── create-creator-card.js   # POST /creator-cards
│       ├── get-creator-card.js      # GET  /creator-cards/:slug
│       └── delete-creator-card.js   # DELETE /creator-cards/:slug
├── models/
│   ├── creator-card.js           # Mongoose schema definition with paranoid soft-delete
│   └── index.js                  # Model registry
├── mock-models/                  # Auto-generated in-memory stubs (used in test mode)
├── repository/
│   └── creator-card/
│       └── index.js              # Repository instance for CreatorCard model
└── services/
    └── creator-cards/
        ├── create-creator-card.js   # Validation, slug resolution, persistence
        ├── get-creator-card.js      # Access control and retrieval
        ├── delete-creator-card.js   # Soft-delete and response shaping
        └── format-card.js          # Shared helper: maps _id to id, normalises deleted field
```

---

## Getting Started

### Prerequisites

- Node.js 18 or above
- A MongoDB connection URI (local or MongoDB Atlas)

### Installation

```bash
git clone https://github.com/Chidi-creator/creator-cards.git
cd creator-cards
npm install
```

### Configure environment

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

At minimum, set `PORT` and `MONGODB_URI`. See [Environment Variables](#environment-variables) for the full reference.

### Start the server

```bash
npm run start
```

The server will log the port it is listening on once ready.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Port the HTTP server listens on |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `NO_SINGLE_ERRORS` | No | Set to `1` to collect all validation errors before throwing instead of failing on the first |
| `TOP_LEVEL_ERROR_MESSAGE` | No | Override the top-level message when multiple validation errors are thrown |
| `USE_MOCK_MODEL` | No | Set to `1` to use in-memory stubs instead of real MongoDB (for tests) |
| `MODEL_MOCK_SESSION` | No | Session key used to seed mock model stubs |
| `PINO_LOG_LEVEL` | No | Minimum log level (trace, debug, info, warn, error). Defaults to info |
| `LOG_APP_REQUEST` | No | Set to `1` to log every incoming request body and headers |
| `SHOW_RAW_HEADERS` | No | Set to `1` to log raw headers (disables masking) |
| `CAN_LOG_ENDPOINT_INFORMATION` | No | Set to `1` to write endpoint metadata to `endpoint-data/endpoints.json` on startup |
| `APP_BASE_URL` | No | Base URL of the deployed application |
| `APP_NAME` | No | Application name injected into logs |
| `USE_SECRETS_MANAGER` | No | Set to `1` to load secrets from AWS Secrets Manager before starting |
| `SECRETS_MANAGER_ID` | No | AWS Secrets Manager secret ID |
| `AWS_ACCESS_KEY_ID` | No | AWS credentials for Secrets Manager |
| `AWS_SECRET_ACCESS_KEY` | No | AWS credentials for Secrets Manager |

---

## API Reference

All endpoints are at the root path. There is no version prefix. All responses are JSON.

### Successful response envelope

```json
{
  "status": "success",
  "data": { }
}
```

### Error response envelope

```json
{
  "status": "error",
  "message": "Human-readable reason",
  "data": {
    "code": "ERROR_CODE"
  }
}
```

Validation errors from the VSL validator include a field-level breakdown:

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    { "field": "title", "message": "Passed title length 1 should not be lesser than 3" }
  ]
}
```

---

### POST /creator-cards

Creates a new creator card.

#### Request body

| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | string | Yes | 3-100 characters |
| `creator_reference` | string | Yes | Exactly 20 characters |
| `status` | string | Yes | `"draft"` or `"published"` |
| `description` | string | No | Max 500 characters |
| `slug` | string | No | 5-50 characters, letters/numbers/hyphens/underscores only. Auto-generated from title if omitted |
| `access_type` | string | No | `"public"` (default) or `"private"` |
| `access_code` | string | No | Exactly 6 alphanumeric characters. Required when `access_type` is `"private"` |
| `links` | array | No | Array of link objects |
| `links[].title` | string | Yes (if links provided) | 1-100 characters |
| `links[].url` | string | Yes (if links provided) | Max 200 characters, must begin with `http://` or `https://` |
| `service_rates` | object | No | Service rates object |
| `service_rates.currency` | string | Yes (if service_rates provided) | `"NGN"`, `"USD"`, `"GBP"`, or `"GHS"` |
| `service_rates.rates` | array | No | Array of rate objects |
| `service_rates.rates[].name` | string | Yes (if rates provided) | 3-100 characters |
| `service_rates.rates[].description` | string | No | Max 250 characters |
| `service_rates.rates[].amount` | number | Yes (if rates provided) | Positive integer |

#### Slug auto-generation

When `slug` is not provided, the title is lowercased, spaces are replaced with hyphens, and invalid characters are removed. If the resulting string is shorter than 5 characters, a 6-character random suffix is appended. If the generated slug already exists, a suffix is added to make it unique.

#### Example request

```json
{
  "title": "Design and Branding",
  "creator_reference": "CREATORREF12345678AB",
  "status": "published",
  "description": "Custom brand identity work for startups.",
  "access_type": "public",
  "links": [
    { "title": "Portfolio", "url": "https://example.com/portfolio" }
  ],
  "service_rates": {
    "currency": "USD",
    "rates": [
      { "name": "Logo design", "description": "Full brand logo package", "amount": 500 }
    ]
  }
}
```

#### Example response (HTTP 200)

```json
{
  "status": "success",
  "data": {
    "id": "01KVAHRTV2ZAJWAE149TSYVGEK",
    "slug": "design-and-branding",
    "title": "Design and Branding",
    "creator_reference": "CREATORREF12345678AB",
    "status": "published",
    "description": "Custom brand identity work for startups.",
    "access_type": "public",
    "links": [
      { "title": "Portfolio", "url": "https://example.com/portfolio" }
    ],
    "service_rates": {
      "currency": "USD",
      "rates": [
        { "name": "Logo design", "description": "Full brand logo package", "amount": 500 }
      ]
    },
    "created": 1718000000000,
    "updated": 1718000000000,
    "deleted": null
  }
}
```

#### Errors

| HTTP | Code | Reason |
|---|---|---|
| 400 | `SL02` | Slug is already taken |
| 400 | `AC01` | `access_code` is required when `access_type` is `"private"` |
| 400 | `AC05` | `access_code` cannot be set on a `"public"` card |

---

### GET /creator-cards/:slug

Retrieves a published creator card by its slug.

#### Path parameter

| Parameter | Description |
|---|---|
| `slug` | The unique slug of the card |

#### Query parameter

| Parameter | Required | Description |
|---|---|---|
| `access_code` | Conditional | Required when the card's `access_type` is `"private"` |

#### Access control order

1. Card does not exist or has been deleted: `404 NF01`
2. Card exists but `status` is `"draft"`: `404 NF02`
3. Card is `"private"` and no `access_code` is provided: `403 AC03`
4. Card is `"private"` and `access_code` is incorrect: `403 AC04`
5. All checks pass: `200` with card data

The `access_code` field is never included in the response.

#### Example request

```
GET /creator-cards/design-and-branding
GET /creator-cards/private-card?access_code=ABC123
```

#### Example response (HTTP 200)

```json
{
  "status": "success",
  "data": {
    "id": "01KVAHRTV2ZAJWAE149TSYVGEK",
    "slug": "design-and-branding",
    "title": "Design and Branding",
    "creator_reference": "CREATORREF12345678AB",
    "status": "published",
    "access_type": "public",
    "created": 1718000000000,
    "updated": 1718000000000,
    "deleted": null
  }
}
```

#### Errors

| HTTP | Code | Reason |
|---|---|---|
| 404 | `NF01` | Card not found or has been deleted |
| 404 | `NF02` | Card exists but is in draft status |
| 403 | `AC03` | Card is private and no access code was supplied |
| 403 | `AC04` | Card is private and the supplied access code is incorrect |

---

### DELETE /creator-cards/:slug

Soft-deletes a creator card. The card is no longer retrievable via GET after deletion, but the record is retained in the database with a `deleted` timestamp.

#### Path parameter

| Parameter | Description |
|---|---|
| `slug` | The unique slug of the card to delete |

#### Request body

| Field | Type | Required | Constraints |
|---|---|---|---|
| `creator_reference` | string | Yes | Exactly 20 characters |

#### Example request

```json
{
  "creator_reference": "CREATORREF12345678AB"
}
```

#### Example response (HTTP 200)

```json
{
  "status": "success",
  "data": {
    "id": "01KVAHRTV2ZAJWAE149TSYVGEK",
    "slug": "design-and-branding",
    "title": "Design and Branding",
    "creator_reference": "CREATORREF12345678AB",
    "status": "published",
    "access_type": "public",
    "created": 1718000000000,
    "updated": 1718000000000,
    "deleted": 1718001000000
  }
}
```

#### Errors

| HTTP | Code | Reason |
|---|---|---|
| 404 | `NF01` | Card not found |

---

## Error Codes

| Code | HTTP | Description |
|---|---|---|
| `NF01` | 404 | Card not found (does not exist or has been deleted) |
| `NF02` | 404 | Card exists but is in draft status |
| `AC01` | 400 | `access_code` is required when `access_type` is `"private"` |
| `AC03` | 403 | Private card accessed without an `access_code` |
| `AC04` | 403 | Private card accessed with an incorrect `access_code` |
| `AC05` | 400 | `access_code` provided but `access_type` is not `"private"` |
| `SL02` | 400 | The provided `slug` is already in use |

---

## Data Model

### CreatorCard

| Field | Type | Description |
|---|---|---|
| `id` | string (ULID) | Unique identifier. Stored as `_id` in MongoDB, exposed as `id` in all responses |
| `slug` | string | URL-safe unique identifier. 5-50 characters |
| `title` | string | Display title. 3-100 characters |
| `description` | string | Optional description. Max 500 characters |
| `creator_reference` | string | External reference tied to the creator. Exactly 20 characters |
| `links` | array | Optional list of URL links associated with the card |
| `service_rates` | object | Optional pricing information including currency and rate entries |
| `status` | string | `"draft"` or `"published"` |
| `access_type` | string | `"public"` (default) or `"private"` |
| `access_code` | string | 6-character alphanumeric code. Only set on private cards |
| `created` | number | Unix timestamp in milliseconds when the card was created |
| `updated` | number | Unix timestamp in milliseconds when the card was last updated |
| `deleted` | number or null | Unix timestamp in milliseconds when the card was deleted, or `null` if active |

### Notes

- IDs are generated as ULIDs and are lexicographically sortable by creation time.
- Deletion is soft: the record is retained but the `deleted` field is set to the deletion timestamp. Soft-deleted cards are excluded from all reads automatically.
- When a card is soft-deleted, its `slug` is internally modified to free it for reuse.

---

## Deployment

The project includes a `Procfile` for Heroku-compatible platforms:

```
web: node bootstrap.js
```

### Steps

1. Create a new app on Render, Heroku, or a compatible platform.
2. Set the following environment variables in the platform dashboard:
   - `PORT` (usually set automatically by the platform)
   - `MONGODB_URI` (your MongoDB Atlas connection string)
   - `NO_SINGLE_ERRORS=1`
3. Connect the repository and deploy.
4. The base URL of the deployed service is your submission URL. Do not append a path.
