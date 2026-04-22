import express from "express";
import db from "../db/connection.js";
import { ObjectId } from "mongodb";
import { tenantMiddleware } from "../middleware/tenant.js";
import { isAuthenticated } from "../auth.js";

const router = express.Router();

router.get('/current', isAuthenticated, (req, res) => {
  res.json({ user: req.user, isAuthenticated: true });
});

// get all users for tenant
router.get("/", isAuthenticated, tenantMiddleware, async (req, res) => {
  try {
    const results = await db.collection("User").aggregate([
      { $match: { tenantIds: req.tenantId } },
      {
        $lookup: {
          from: "Role",
          localField: "role",
          foreignField: "_id",
          as: "role"
        }
      }
    ]).toArray();
    res.json({ users: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching users" });
  }
});

// get single user for tenant
router.get("/:id", isAuthenticated, tenantMiddleware, async (req, res) => {
  try {
    const result = await db.collection("User").aggregate([
      { $match: { _id: new ObjectId(req.params.id), tenantId: req.tenantId } },
      {
        $lookup: {
          from: "Role",
          localField: "role",
          foreignField: "_id",
          as: "role"
        }
      }
    ]).toArray();

    if (!result.length) return res.status(404).json({ error: "User not found" });
    res.json({ user: result[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching user" });
  }
});

// create a new user under tenant
router.post("/", isAuthenticated, tenantMiddleware, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newDocument = {
      tenantId: [req.tenantId],
      createdAt: new Date(),
      email: req.body.email,
      name: req.body.name,
      password: hashedPassword,
      isCaptain: req.body.isCaptain
    };
    const collection = db.collection("User");
    const result = await collection.insertOne(newDocument);
    res.status(201).json({ user: { ...newDocument, _id: result.insertedId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error adding user" });
  }
});

// update a user (scoped to tenant)
router.patch("/:id", isAuthenticated, tenantMiddleware, async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id), tenantId: req.tenantId };
    const updates = { $set: { updatedAt: new Date() } };
    const collection = db.collection("User");
    const result = await collection.updateOne(query, updates);
    if (result.matchedCount === 0) return res.status(404).json({ error: "User not found" });
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating user" });
  }
});

// delete a user (scoped to tenant)
router.delete("/:id", isAuthenticated, tenantMiddleware, async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id), tenantId: req.tenantId };
    const collection = db.collection("User");
    const result = await collection.deleteOne(query);
    if (result.deletedCount === 0) return res.status(404).json({ error: "User not found" });
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting user" });
  }
});

export default router;