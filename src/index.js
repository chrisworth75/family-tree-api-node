const express = require('express');
const pool = require('../config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ============================================
// POST ENDPOINTS
// ============================================

// POST /api/trees - Create a new family tree with a root person
app.post('/api/trees', async (req, res) => {
  const client = await pool.connect();
  try {
    const { treeName, description, rootPerson } = req.body;

    if (!treeName || !rootPerson || !rootPerson.firstName) {
      return res.status(400).json({
        error: 'treeName and rootPerson.firstName are required'
      });
    }

    await client.query('BEGIN');

    // Create family tree
    const treeResult = await client.query(
      'INSERT INTO family_trees (name, description) VALUES ($1, $2) RETURNING *',
      [treeName, description || null]
    );
    const tree = treeResult.rows[0];

    // Create root person
    const personResult = await client.query(
      `INSERT INTO members (family_tree_id, external_id, first_name, last_name, birth_year, birth_date, gender, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        tree.id,
        rootPerson.externalId || null,
        rootPerson.firstName,
        rootPerson.lastName || null,
        rootPerson.birthYear || null,
        rootPerson.birthDate || null,
        rootPerson.gender || null,
        rootPerson.notes || null
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      tree: tree,
      rootPerson: personResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tree:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  } finally {
    client.release();
  }
});

// POST /api/trees/:treeId/members/:memberId/partner - Add a partner to a person
app.post('/api/trees/:treeId/members/:memberId/partner', async (req, res) => {
  const client = await pool.connect();
  try {
    const { treeId, memberId } = req.params;
    const { partner } = req.body;

    if (!partner || !partner.firstName) {
      return res.status(400).json({ error: 'partner.firstName is required' });
    }

    await client.query('BEGIN');

    // Verify the member exists and belongs to the tree
    const memberCheck = await client.query(
      'SELECT * FROM members WHERE id = $1 AND family_tree_id = $2',
      [memberId, treeId]
    );

    if (memberCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Member not found in this tree' });
    }

    // Create partner
    const partnerResult = await client.query(
      `INSERT INTO members (family_tree_id, external_id, first_name, last_name, birth_year, birth_date, gender, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        treeId,
        partner.externalId || null,
        partner.firstName,
        partner.lastName || null,
        partner.birthYear || null,
        partner.birthDate || null,
        partner.gender || null,
        partner.notes || null
      ]
    );
    const partnerPerson = partnerResult.rows[0];

    // Create spouse relationship
    await client.query(
      `INSERT INTO relationships (family_tree_id, member1_id, member2_id, relationship_type)
       VALUES ($1, $2, $3, 'spouse')`,
      [treeId, memberId, partnerPerson.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      partner: partnerPerson,
      relationship: { type: 'spouse', member1Id: memberId, member2Id: partnerPerson.id }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding partner:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  } finally {
    client.release();
  }
});

// POST /api/trees/:treeId/members/:memberId/children - Add children to a person
app.post('/api/trees/:treeId/members/:memberId/children', async (req, res) => {
  const client = await pool.connect();
  try {
    const { treeId, memberId } = req.params;
    const { children } = req.body;

    if (!children || !Array.isArray(children) || children.length === 0) {
      return res.status(400).json({ error: 'children array is required and must not be empty' });
    }

    await client.query('BEGIN');

    // Verify the parent exists and belongs to the tree
    const parentCheck = await client.query(
      'SELECT * FROM members WHERE id = $1 AND family_tree_id = $2',
      [memberId, treeId]
    );

    if (parentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Parent member not found in this tree' });
    }

    // Check if this person is already a child of someone (prevent grandchildren)
    const isChildCheck = await client.query(
      `SELECT * FROM relationships
       WHERE family_tree_id = $1 AND member2_id = $2 AND relationship_type = 'parent-child'`,
      [treeId, memberId]
    );

    if (isChildCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Cannot add children to a person who is already a child. Only direct children are allowed.'
      });
    }

    // Find partner (if exists)
    const partnerResult = await client.query(
      `SELECT member2_id as partner_id FROM relationships
       WHERE family_tree_id = $1 AND member1_id = $2 AND relationship_type = 'spouse'
       UNION
       SELECT member1_id as partner_id FROM relationships
       WHERE family_tree_id = $1 AND member2_id = $2 AND relationship_type = 'spouse'`,
      [treeId, memberId]
    );
    const partnerId = partnerResult.rows.length > 0 ? partnerResult.rows[0].partner_id : null;

    const createdChildren = [];

    for (const child of children) {
      if (!child.firstName) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Each child must have firstName' });
      }

      // Create child
      const childResult = await client.query(
        `INSERT INTO members (family_tree_id, external_id, first_name, last_name, birth_year, birth_date, gender, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          treeId,
          child.externalId || null,
          child.firstName,
          child.lastName || null,
          child.birthYear || null,
          child.birthDate || null,
          child.gender || null,
          child.notes || null
        ]
      );
      const childPerson = childResult.rows[0];

      // Create parent-child relationship with primary parent
      await client.query(
        `INSERT INTO relationships (family_tree_id, member1_id, member2_id, relationship_type)
         VALUES ($1, $2, $3, 'parent-child')`,
        [treeId, memberId, childPerson.id]
      );

      // Create parent-child relationship with partner if exists
      if (partnerId) {
        await client.query(
          `INSERT INTO relationships (family_tree_id, member1_id, member2_id, relationship_type)
           VALUES ($1, $2, $3, 'parent-child')`,
          [treeId, partnerId, childPerson.id]
        );
      }

      createdChildren.push(childPerson);
    }

    // Create sibling relationships between children
    for (let i = 0; i < createdChildren.length; i++) {
      for (let j = i + 1; j < createdChildren.length; j++) {
        await client.query(
          `INSERT INTO relationships (family_tree_id, member1_id, member2_id, relationship_type)
           VALUES ($1, $2, $3, 'sibling')`,
          [treeId, createdChildren[i].id, createdChildren[j].id]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      children: createdChildren,
      parentId: memberId,
      partnerId: partnerId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding children:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  } finally {
    client.release();
  }
});

// ============================================
// GET ENDPOINTS
// ============================================

// GET /api/trees - Get all family trees
app.get('/api/trees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM family_trees ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching trees:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// GET /api/trees/:treeId - Get a specific tree
app.get('/api/trees/:treeId', async (req, res) => {
  try {
    const { treeId } = req.params;

    const treeResult = await pool.query('SELECT * FROM family_trees WHERE id = $1', [treeId]);
    if (treeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tree not found' });
    }

    res.json(treeResult.rows[0]);
  } catch (error) {
    console.error('Error fetching tree:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// GET /api/trees/:treeId/full - Get a specific tree with all members and relationships
app.get('/api/trees/:treeId/full', async (req, res) => {
  try {
    const { treeId } = req.params;

    const treeResult = await pool.query('SELECT * FROM family_trees WHERE id = $1', [treeId]);
    if (treeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tree not found' });
    }

    const membersResult = await pool.query(
      'SELECT * FROM members WHERE family_tree_id = $1 ORDER BY birth_year',
      [treeId]
    );

    const relationshipsResult = await pool.query(
      'SELECT * FROM relationships WHERE family_tree_id = $1',
      [treeId]
    );

    res.json({
      tree: treeResult.rows[0],
      members: membersResult.rows,
      relationships: relationshipsResult.rows
    });
  } catch (error) {
    console.error('Error fetching tree:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// GET /api/trees/:treeId/members/:memberId - Get a specific member
app.get('/api/trees/:treeId/members/:memberId', async (req, res) => {
  try {
    const { treeId, memberId } = req.params;

    const memberResult = await pool.query(
      'SELECT * FROM members WHERE id = $1 AND family_tree_id = $2',
      [memberId, treeId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Get relationships
    const relationshipsResult = await pool.query(
      `SELECT r.*,
              m1.first_name as member1_first_name, m1.last_name as member1_last_name,
              m2.first_name as member2_first_name, m2.last_name as member2_last_name
       FROM relationships r
       LEFT JOIN members m1 ON r.member1_id = m1.id
       LEFT JOIN members m2 ON r.member2_id = m2.id
       WHERE r.family_tree_id = $1 AND (r.member1_id = $2 OR r.member2_id = $2)`,
      [treeId, memberId]
    );

    res.json({
      member: memberResult.rows[0],
      relationships: relationshipsResult.rows
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ============================================
// PATCH ENDPOINTS
// ============================================

// PATCH /api/trees/:treeId - Update a tree
app.patch('/api/trees/:treeId', async (req, res) => {
  try {
    const { treeId } = req.params;
    const { name, description } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(treeId);
    const query = `UPDATE family_trees SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tree not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating tree:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// PATCH /api/trees/:treeId/members/:memberId - Update a member
app.patch('/api/trees/:treeId/members/:memberId', async (req, res) => {
  try {
    const { treeId, memberId } = req.params;
    const { externalId, firstName, lastName, birthYear, birthDate, gender, notes } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (externalId !== undefined) {
      updates.push(`external_id = $${paramCount++}`);
      values.push(externalId);
    }
    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(lastName);
    }
    if (birthYear !== undefined) {
      updates.push(`birth_year = $${paramCount++}`);
      values.push(birthYear);
    }
    if (birthDate !== undefined) {
      updates.push(`birth_date = $${paramCount++}`);
      values.push(birthDate);
    }
    if (gender !== undefined) {
      updates.push(`gender = $${paramCount++}`);
      values.push(gender);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(memberId, treeId);
    const query = `UPDATE members SET ${updates.join(', ')}
                   WHERE id = $${paramCount++} AND family_tree_id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ============================================
// DELETE ENDPOINTS
// ============================================

// DELETE /api/trees/:treeId - Delete a tree (cascades to all members and relationships)
app.delete('/api/trees/:treeId', async (req, res) => {
  try {
    const { treeId } = req.params;

    const result = await pool.query(
      'DELETE FROM family_trees WHERE id = $1 RETURNING *',
      [treeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tree not found' });
    }

    res.json({ message: 'Tree deleted successfully', tree: result.rows[0] });
  } catch (error) {
    console.error('Error deleting tree:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// DELETE /api/trees/:treeId/members/:memberId - Delete a member (cascades relationships)
app.delete('/api/trees/:treeId/members/:memberId', async (req, res) => {
  try {
    const { treeId, memberId } = req.params;

    const result = await pool.query(
      'DELETE FROM members WHERE id = $1 AND family_tree_id = $2 RETURNING *',
      [memberId, treeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ message: 'Member deleted successfully', member: result.rows[0] });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// DELETE /api/trees/:treeId/relationships/:relationshipId - Delete a relationship
app.delete('/api/trees/:treeId/relationships/:relationshipId', async (req, res) => {
  try {
    const { treeId, relationshipId } = req.params;

    const result = await pool.query(
      'DELETE FROM relationships WHERE id = $1 AND family_tree_id = $2 RETURNING *',
      [relationshipId, treeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    res.json({ message: 'Relationship deleted successfully', relationship: result.rows[0] });
  } catch (error) {
    console.error('Error deleting relationship:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Family Tree API running on port ${PORT}`);
});
