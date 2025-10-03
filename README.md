# Family Tree API (Node.js/Express)

REST API for managing family trees with PostgreSQL database backend.

## Features

- Create family trees with a root person
- Add partners to any person
- Add children to any person (prevents grandchildren - only direct children allowed)
- Full CRUD operations on trees, members, and relationships
- PostgreSQL database integration

## Prerequisites

- Node.js 14+
- PostgreSQL database running (use family-tree-db project)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=familytree
DB_USER=familytree_user
DB_PASSWORD=familytree_pass
PORT=3001
```

## Running the API

```bash
node src/index.js
```

The API will be available at `http://localhost:3001`

## API Endpoints

### POST Endpoints

#### Create a new family tree with root person
```bash
POST /api/trees
```

Request body:
```json
{
  "treeName": "Smith Family",
  "description": "The Smith family tree",
  "rootPerson": {
    "firstName": "John",
    "lastName": "Smith",
    "birthYear": 1950,
    "gender": "male"
  }
}
```

#### Add a partner to a person
```bash
POST /api/trees/:treeId/members/:memberId/partner
```

Request body:
```json
{
  "partner": {
    "firstName": "Jane",
    "lastName": "Smith",
    "birthYear": 1952,
    "gender": "female"
  }
}
```

#### Add children to a person
```bash
POST /api/trees/:treeId/members/:memberId/children
```

Request body:
```json
{
  "children": [
    {
      "firstName": "Bob",
      "lastName": "Smith",
      "birthYear": 1975,
      "gender": "male"
    },
    {
      "firstName": "Alice",
      "lastName": "Smith",
      "birthYear": 1977,
      "gender": "female"
    }
  ]
}
```

**Note:** Children can only be added to people who are not already children themselves (no grandchildren).

### GET Endpoints

#### Get all family trees
```bash
GET /api/trees
```

#### Get a specific tree with all members and relationships
```bash
GET /api/trees/:treeId
```

#### Get a specific member with their relationships
```bash
GET /api/trees/:treeId/members/:memberId
```

### PATCH Endpoints

#### Update a tree
```bash
PATCH /api/trees/:treeId
```

Request body:
```json
{
  "name": "Updated Family Name",
  "description": "Updated description"
}
```

#### Update a member
```bash
PATCH /api/trees/:treeId/members/:memberId
```

Request body:
```json
{
  "firstName": "Jonathan",
  "birthYear": 1951,
  "notes": "Updated information"
}
```

### DELETE Endpoints

#### Delete a tree (cascades to all members and relationships)
```bash
DELETE /api/trees/:treeId
```

#### Delete a member (cascades relationships)
```bash
DELETE /api/trees/:treeId/members/:memberId
```

#### Delete a relationship
```bash
DELETE /api/trees/:treeId/relationships/:relationshipId
```

## Example Usage

### Complete workflow example:

1. Create a tree with root person:
```bash
curl -X POST http://localhost:3001/api/trees \
  -H "Content-Type: application/json" \
  -d '{
    "treeName": "Johnson Family",
    "rootPerson": {
      "firstName": "Robert",
      "lastName": "Johnson",
      "birthYear": 1960
    }
  }'
```

Response: `{ "tree": { "id": 1, ... }, "rootPerson": { "id": 1, ... } }`

2. Add partner to Robert (member ID 1):
```bash
curl -X POST http://localhost:3001/api/trees/1/members/1/partner \
  -H "Content-Type: application/json" \
  -d '{
    "partner": {
      "firstName": "Mary",
      "lastName": "Johnson",
      "birthYear": 1962
    }
  }'
```

3. Add children to Robert:
```bash
curl -X POST http://localhost:3001/api/trees/1/members/1/children \
  -H "Content-Type: application/json" \
  -d '{
    "children": [
      {
        "firstName": "David",
        "lastName": "Johnson",
        "birthYear": 1985
      },
      {
        "firstName": "Sarah",
        "lastName": "Johnson",
        "birthYear": 1988
      }
    ]
  }'
```

4. Get the complete tree:
```bash
curl http://localhost:3001/api/trees/1
```

## Data Model

### Member Fields
- `firstName` (required): Person's first name
- `lastName`: Person's last name
- `birthYear`: Year of birth
- `birthDate`: Full date of birth (YYYY-MM-DD)
- `gender`: Gender
- `notes`: Additional notes
- `externalId`: External reference ID

### Relationship Types
- `parent-child`: Parent to child relationship
- `spouse`: Marriage/partnership
- `sibling`: Brother/sister relationship

## Rules and Constraints

1. **Direct Children Only**: The API enforces that children can only be added to people who are not already children themselves. This prevents the creation of grandchildren through the children endpoint.

2. **Automatic Relationships**: When adding children:
   - Parent-child relationships are created with both parents (if partner exists)
   - Sibling relationships are automatically created between all children

3. **Cascading Deletes**: Deleting a tree or member will automatically delete all associated relationships.

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad request (invalid data)
- `404`: Resource not found
- `500`: Internal server error

## Health Check

```bash
GET /health
```

Returns: `{ "status": "ok" }`
