#!/usr/bin/env node

/**
 * Postman Collection Generator for family-tree-api-node
 *
 * This script generates a Postman collection dynamically during the build process.
 * It includes endpoints for family tree management operations.
 */

const fs = require('fs');
const path = require('path');

// Get configuration from environment variables or use defaults
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'Family Tree API Collection';
const BUILD_NUMBER = process.env.BUILD_NUMBER || 'dev';

// Collection template
const collection = {
    info: {
        _postman_id: generateUUID(),
        name: `${COLLECTION_NAME} - Build ${BUILD_NUMBER}`,
        description: `Automatically generated Postman collection for Family Tree API testing. Build: ${BUILD_NUMBER}, Generated: ${new Date().toISOString()}`,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: [
        {
            name: "Health Check",
            item: [
                {
                    name: "Health Check",
                    event: [
                        {
                            listen: "test",
                            script: {
                                exec: [
                                    "pm.test(\"Status code is 200\", function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "",
                                    "pm.test(\"Response contains status\", function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.status).to.eql('ok');",
                                    "});"
                                ],
                                type: "text/javascript"
                            }
                        }
                    ],
                    request: {
                        method: "GET",
                        header: [],
                        url: `${BASE_URL}/health`,
                        description: "Check if the API is healthy and running"
                    },
                    response: []
                }
            ]
        },
        {
            name: "Tree Management",
            item: [
                {
                    name: "Create Tree with Root Person",
                    event: [
                        {
                            listen: "test",
                            script: {
                                exec: [
                                    "pm.test(\"Status code is 201\", function () {",
                                    "    pm.response.to.have.status(201);",
                                    "});",
                                    "",
                                    "pm.test(\"Response contains tree and rootPerson\", function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData).to.have.property('tree');",
                                    "    pm.expect(jsonData).to.have.property('rootPerson');",
                                    "    pm.expect(jsonData.tree).to.have.property('id');",
                                    "    pm.expect(jsonData.rootPerson).to.have.property('id');",
                                    "});",
                                    "",
                                    "// Save tree and member IDs for subsequent tests",
                                    "if (pm.response.code === 201) {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.collectionVariables.set('tree_id', jsonData.tree.id);",
                                    "    pm.collectionVariables.set('root_member_id', jsonData.rootPerson.id);",
                                    "}"
                                ],
                                type: "text/javascript"
                            }
                        }
                    ],
                    request: {
                        method: "POST",
                        header: [
                            {
                                key: "Content-Type",
                                value: "application/json"
                            }
                        ],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({
                                treeName: "Test Family Tree",
                                description: "Created by Newman test",
                                rootPerson: {
                                    firstName: "John",
                                    lastName: "Doe",
                                    birthYear: 1950,
                                    gender: "male"
                                }
                            }, null, 2)
                        },
                        url: `${BASE_URL}/api/trees`,
                        description: "Create a new family tree with a root person"
                    },
                    response: []
                },
                {
                    name: "Get All Trees",
                    event: [
                        {
                            listen: "test",
                            script: {
                                exec: [
                                    "pm.test(\"Status code is 200\", function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "",
                                    "pm.test(\"Response is an array\", function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData).to.be.an('array');",
                                    "});"
                                ],
                                type: "text/javascript"
                            }
                        }
                    ],
                    request: {
                        method: "GET",
                        header: [],
                        url: `${BASE_URL}/api/trees`,
                        description: "Retrieve all family trees"
                    },
                    response: []
                },
                {
                    name: "Get Specific Tree",
                    event: [
                        {
                            listen: "test",
                            script: {
                                exec: [
                                    "pm.test(\"Status code is 200\", function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "",
                                    "pm.test(\"Tree has required fields\", function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData).to.have.property('id');",
                                    "    pm.expect(jsonData).to.have.property('name');",
                                    "});"
                                ],
                                type: "text/javascript"
                            }
                        }
                    ],
                    request: {
                        method: "GET",
                        header: [],
                        url: `${BASE_URL}/api/trees/{{tree_id}}`,
                        description: "Get a specific tree by ID"
                    },
                    response: []
                },
                {
                    name: "Get Full Tree",
                    event: [
                        {
                            listen: "test",
                            script: {
                                exec: [
                                    "pm.test(\"Status code is 200\", function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "",
                                    "pm.test(\"Response contains tree, members, and relationships\", function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData).to.have.property('tree');",
                                    "    pm.expect(jsonData).to.have.property('members');",
                                    "    pm.expect(jsonData).to.have.property('relationships');",
                                    "    pm.expect(jsonData.members).to.be.an('array');",
                                    "    pm.expect(jsonData.relationships).to.be.an('array');",
                                    "});"
                                ],
                                type: "text/javascript"
                            }
                        }
                    ],
                    request: {
                        method: "GET",
                        header: [],
                        url: `${BASE_URL}/api/trees/{{tree_id}}/full`,
                        description: "Get full tree with all members and relationships"
                    },
                    response: []
                },
                {
                    name: "Update Tree",
                    event: [
                        {
                            listen: "test",
                            script: {
                                exec: [
                                    "pm.test(\"Status code is 200\", function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "",
                                    "pm.test(\"Tree name was updated\", function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.name).to.include('Updated');",
                                    "});"
                                ],
                                type: "text/javascript"
                            }
                        }
                    ],
                    request: {
                        method: "PATCH",
                        header: [
                            {
                                key: "Content-Type",
                                value: "application/json"
                            }
                        ],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({
                                name: "Updated Family Tree",
                                description: "Updated description"
                            }, null, 2)
                        },
                        url: `${BASE_URL}/api/trees/{{tree_id}}`,
                        description: "Update tree metadata"
                    },
                    response: []
                }
            ]
        },
        {
            name: "Member Management",
            item: [
                {
                    name: "Add Partner",
                    event: [
                        {
                            listen: "test",
                            script: {
                                exec: [
                                    "pm.test(\"Status code is 201\", function () {",
                                    "    pm.response.to.have.status(201);",
                                    "});",
                                    "",
                                    "pm.test(\"Response contains partner and relationship\", function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData).to.have.property('partner');",
                                    "    pm.expect(jsonData).to.have.property('relationship');",
                                    "    pm.expect(jsonData.relationship.type).to.eql('spouse');",
                                    "});",
                                    "",
                                    "// Save partner ID",
                                    "if (pm.response.code === 201) {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.collectionVariables.set('partner_id', jsonData.partner.id);",
                                    "}"
                                ],
                                type: "text/javascript"
                            }
                        }
                    ],
                    request: {
                        method: "POST",
                        header: [
                            {
                                key: "Content-Type",
                                value: "application/json"
                            }
                        ],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({
                                partner: {
                                    firstName: "Jane",
                                    lastName: "Doe",
                                    birthYear: 1952,
                                    gender: "female"
                                }
                            }, null, 2)
                        },
                        url: `${BASE_URL}/api/trees/{{tree_id}}/members/{{root_member_id}}/partner`,
                        description: "Add a partner/spouse to a member"
                    },
                    response: []
                },
                {
                    name: "Add Children",
                    event: [
                        {
                            listen: "test",
                            script: {
                                exec: [
                                    "pm.test(\"Status code is 201\", function () {",
                                    "    pm.response.to.have.status(201);",
                                    "});",
                                    "",
                                    "pm.test(\"Response contains children array\", function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData).to.have.property('children');",
                                    "    pm.expect(jsonData.children).to.be.an('array');",
                                    "    pm.expect(jsonData.children.length).to.be.at.least(1);",
                                    "});",
                                    "",
                                    "// Save first child ID",
                                    "if (pm.response.code === 201) {",
                                    "    var jsonData = pm.response.json();",
                                    "    if (jsonData.children.length > 0) {",
                                    "        pm.collectionVariables.set('child_id', jsonData.children[0].id);",
                                    "    }",
                                    "}"
                                ],
                                type: "text/javascript"
                            }
                        }
                    ],
                    request: {
                        method: "POST",
                        header: [
                            {
                                key: "Content-Type",
                                value: "application/json"
                            }
                        ],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({
                                children: [
                                    {
                                        firstName: "Alice",
                                        lastName: "Doe",
                                        birthYear: 1975,
                                        gender: "female"
                                    },
                                    {
                                        firstName: "Bob",
                                        lastName: "Doe",
                                        birthYear: 1978,
                                        gender: "male"
                                    }
                                ]
                            }, null, 2)
                        },
                        url: `${BASE_URL}/api/trees/{{tree_id}}/members/{{root_member_id}}/children`,
                        description: "Add children to a member"
                    },
                    response: []
                },
                {
                    name: "Get Member Details",
                    event: [
                        {
                            listen: "test",
                            script: {
                                exec: [
                                    "pm.test(\"Status code is 200\", function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "",
                                    "pm.test(\"Response contains member and relationships\", function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData).to.have.property('member');",
                                    "    pm.expect(jsonData).to.have.property('relationships');",
                                    "});"
                                ],
                                type: "text/javascript"
                            }
                        }
                    ],
                    request: {
                        method: "GET",
                        header: [],
                        url: `${BASE_URL}/api/trees/{{tree_id}}/members/{{root_member_id}}`,
                        description: "Get member details with relationships"
                    },
                    response: []
                },
                {
                    name: "Update Member",
                    event: [
                        {
                            listen: "test",
                            script: {
                                exec: [
                                    "pm.test(\"Status code is 200\", function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "",
                                    "pm.test(\"Member has updated fields\", function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData).to.have.property('notes');",
                                    "});"
                                ],
                                type: "text/javascript"
                            }
                        }
                    ],
                    request: {
                        method: "PATCH",
                        header: [
                            {
                                key: "Content-Type",
                                value: "application/json"
                            }
                        ],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({
                                notes: "Updated via Newman test",
                                birthDate: "1950-01-15"
                            }, null, 2)
                        },
                        url: `${BASE_URL}/api/trees/{{tree_id}}/members/{{root_member_id}}`,
                        description: "Update member information"
                    },
                    response: []
                },
                {
                    name: "Delete Member",
                    event: [
                        {
                            listen: "test",
                            script: {
                                exec: [
                                    "pm.test(\"Status code is 200\", function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "",
                                    "pm.test(\"Response contains success message\", function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.message).to.exist;",
                                    "});"
                                ],
                                type: "text/javascript"
                            }
                        }
                    ],
                    request: {
                        method: "DELETE",
                        header: [],
                        url: `${BASE_URL}/api/trees/{{tree_id}}/members/{{child_id}}`,
                        description: "Delete a member from the tree"
                    },
                    response: []
                }
            ]
        },
        {
            name: "Cleanup",
            item: [
                {
                    name: "Delete Tree",
                    event: [
                        {
                            listen: "test",
                            script: {
                                exec: [
                                    "pm.test(\"Status code is 200\", function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "",
                                    "pm.test(\"Response contains success message\", function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.message).to.exist;",
                                    "});"
                                ],
                                type: "text/javascript"
                            }
                        }
                    ],
                    request: {
                        method: "DELETE",
                        header: [],
                        url: `${BASE_URL}/api/trees/{{tree_id}}`,
                        description: "Delete entire tree with all members"
                    },
                    response: []
                }
            ]
        }
    ],
    event: [
        {
            listen: "prerequest",
            script: {
                type: "text/javascript",
                exec: [
                    "console.log('Running request: ' + pm.info.requestName);"
                ]
            }
        },
        {
            listen: "test",
            script: {
                type: "text/javascript",
                exec: [
                    "pm.test(\"Response has valid JSON\", function () {",
                    "    pm.response.to.be.json;",
                    "});"
                ]
            }
        }
    ],
    variable: [
        {
            key: "base_url",
            value: BASE_URL,
            type: "string"
        },
        {
            key: "build_number",
            value: BUILD_NUMBER,
            type: "string"
        },
        {
            key: "tree_id",
            value: "",
            type: "string"
        },
        {
            key: "root_member_id",
            value: "",
            type: "string"
        },
        {
            key: "partner_id",
            value: "",
            type: "string"
        },
        {
            key: "child_id",
            value: "",
            type: "string"
        }
    ]
};

// Helper function to generate UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Output directory
const outputDir = process.env.OUTPUT_DIR || 'build';
const outputFile = path.join(outputDir, 'api-collection.json');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Write the collection to file
fs.writeFileSync(outputFile, JSON.stringify(collection, null, 2));

console.log('========================================');
console.log('Postman Collection Generated Successfully');
console.log('========================================');
console.log(`Collection Name: ${collection.info.name}`);
console.log(`Build Number: ${BUILD_NUMBER}`);
console.log(`Base URL: ${BASE_URL}`);
console.log(`Output File: ${outputFile}`);
console.log('========================================');

// Also create a metadata file
const metadata = {
    generatedAt: new Date().toISOString(),
    buildNumber: BUILD_NUMBER,
    baseUrl: BASE_URL,
    collectionName: COLLECTION_NAME,
    requestCount: collection.item.reduce((count, folder) => count + folder.item.length, 0),
    fileName: outputFile
};

fs.writeFileSync(
    path.join(outputDir, 'collection-metadata.json'),
    JSON.stringify(metadata, null, 2)
);

console.log('Metadata file created: collection-metadata.json');
