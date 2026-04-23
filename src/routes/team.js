import express from "express";
import db from "../db/connection.js";
import { ObjectId } from "mongodb";
import { tenantMiddleware } from "../middleware/tenant.js";
import { isAuthenticated } from "../auth.js";

const router = express.Router();

router.get("/", isAuthenticated, tenantMiddleware, async(req, res) => {

  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: "eventId is required" });
    const teams = await db.collection("Team").aggregate([
      { $match: { tenantId: req.tenantId, eventId: new ObjectId(eventId) } },
      {
        $lookup: {
          from: "User",
          localField: "captainId",
          foreignField: "_id",
          as: "captain"
        }
      },
      {
        $addFields: {
          captainName: { $arrayElemAt: ["$captain.name", 0] }
        }
      },
      { $project: { captain: 0 } }
    ]).toArray();

    res.json({ teams });


  }catch(err) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ error: "Error fetching teams" });
  }finally {

  }
})

router.get("/:id", isAuthenticated, tenantMiddleware, async(req, res) => {
  try {
    const team = await db.collection("Team").findOne({
      _id: new ObjectId(req.params.id),
      tenantId: req.tenantId
    });

    if (!team) return res.status(404).json({ error: "Team not found" });
    res.json({ team });
  } catch(err) {
    console.error("Error fetching team:", err);
    res.status(500).json({ error: "Error fetching team" });
  }
})

router.post("/", isAuthenticated, tenantMiddleware, async(req, res) => {

  try {
    const team = {
      tenantId: req.tenantId,
      eventId: new ObjectId(req.body.eventId),
      name: req.body.name,
      captainId: req.body.captainId ? new ObjectId(req.body.captainId) : null,
      divisionId: req.body.divisionId ? new ObjectId(req.body.divisionId) : null,
      members: req.body.members ? req.body.members.map(id => new ObjectId(id)) : [],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('Team').insertOne(team);
    res.status(201).json({ team: { ...team, _id: result.insertedId } });

  }catch(err) {
    console.error("Error creating teams:", err);
    res.status(500).json({ error: "Error fetching teams" });
  }finally {

  }
})

router.patch("/:id", isAuthenticated, tenantMiddleware, async(req, res) => {

  try {
    const updates = {};

    if (req.body.name) updates.name = req.body.name;
    if (req.body.captainId !== undefined) updates.captainId = req.body.captainId ? new ObjectId(req.body.captainId) : null;
    if (req.body.divisionId !== undefined) updates.divisionId = req.body.divisionId ? new ObjectId(req.body.divisionId) : null;
    if (req.body.members) updates.members = req.body.members.map(id => new ObjectId(id));
    if (req.body.status) updates.status = req.body.status;
    updates.updatedAt = new Date();

    const result = await db.collection("Team").updateOne(
        { _id: new ObjectId(req.params.id), tenantId: req.tenantId },
        { $set: updates }
    );

    if (result.matchedCount === 0) return res.status(404).json({ error: "Team not found" });
    res.json({ message: "Team updated" });

  }catch(err) {
    console.error("Error updating teams:", err);
    res.status(500).json({ error: "Error updating teams" });
  }finally {

  }
})

router.patch('/:id/reset', isAuthenticated, tenantMiddleware, async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id), tenantId: req.tenantId };
    const result = await db.collection('Team').updateOne(query, {
      $set: { members: [] }
    });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Team not found' });
    res.json({ message: 'Roster cleared' });
  } catch (error) {
    console.error('Error clearing roster:', error);
    res.status(500).json({ error: 'Error clearing roster' });
  }
});

router.delete("/:id", isAuthenticated, tenantMiddleware, async(req, res) => {

  try {
    const result = await db.collection("Team").deleteOne({
      _id: new ObjectId(req.params.id),
      tenantId: req.tenantId
    });

    if (result.deletedCount === 0) return res.status(404).json({ error: "Team not found" });

    res.json({ message: "Team deleted" });

  }catch(err) {
    console.error("Error deleting teams:", err);
    res.status(500).json({ error: "Error deleting teams" });
  }finally {

  }
})


export default router;