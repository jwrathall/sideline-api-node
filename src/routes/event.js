import express from "express";
import db from "../db/connection.js";
import { ObjectId} from 'mongodb';
import {tenantMiddleware} from '../middleware/tenant.js';
import { isAuthenticated } from "../auth.js";

const router = express.Router();

//get all events for tenant
router.get("/", isAuthenticated, tenantMiddleware, async (req, res) => {
    try{
        const events = await db.collection("Event")
            .find({ tenantId: req.tenantId })
            .toArray();

        res.json({ events });
    }catch(err)
    {
        console.error("Error fetching events:", error);
        res.status(500).json({ error: "Error fetching events" });
    }
})

//get single event
router.get("/:id", isAuthenticated, tenantMiddleware, async (req, res) => {
    try{
        const event = await db.collection("Event")
            .findOne({
                _id: new ObjectId(req.params.id),
                tenantId: req.tenantId
            });

        if (!event) return res.status(404).json({ error: "Event not found" });

        res.json({ event });

    }catch(err){
        console.error("Error fetching event:", error);
        res.status(500).json({ error: "Error fetching event" });
    }
})
export default router;