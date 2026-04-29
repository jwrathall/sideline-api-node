import express from "express";
import db from "../db/connection.js";
import { ObjectId} from 'mongodb';
import {tenantMiddleware} from '../middleware/tenant.js';
import { isAuthenticated } from "../auth.js";
import {generateSchedule} from "../services/schedule.js"

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

router.post("/", isAuthenticated, tenantMiddleware, async (req, res) => {
    try{
        const event = {
            tenantId: req.tenantId,
            name: req.body.name,
            type: req.body.type,
            status: 'draft',
            startDate: new Date(req.body.startDate),
            endDate: new Date(req.body.endDate),
            facilityIds: req.body.facilityId ? [new ObjectId(req.body.facilityId)] : [],
            visibility: {
                schedulePublic: false,
                rostersPublic: false,
                playerNamesPublic: false,
                requiresApproval: false
            },
            notifications: {
                emailEnabled: true,
                reminderMinutesBefore: 30,
                notifyOnScoreEntry: true,
                notifyOnScheduleChange: true
            },
            schedule: {
                recurring: req.body.type === 'league',
                startTime: '',
                endTime: '',
                gameDuration: 20,
                transitionTime: 5
            },
            createdAt: new Date()
        };
        const result = await db.collection('Event').insertOne(event);
        res.status(201).json({ event: { ...event, _id: result.insertedId } });
    }catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Error creating event' });
    }
})

router.post("/:id/generate", isAuthenticated, tenantMiddleware, async (req, res) => {
    try{
        const event = await db.collection("Event").findOne({
            _id: new ObjectId(req.params.id),
            tenantId: req.tenantId
        })
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const teams = await db.collection('Team').find({
            eventId: new ObjectId(req.params.id),
            tenantId: req.tenantId,
            status: { $in: ['active', 'draft'] }
        }).toArray();

        if (teams.length < 2) return res.status(400).json({ error: 'Need at least 2 teams' });

        // 1. get the facility
        const facility = await db.collection('Facility').findOne({
            _id: { $in: event.facilityIds.map(id => new ObjectId(id)) },
            tenantId: req.tenantId
        });

        if (!facility) return res.status(400).json({ error: 'No facility found' });

        const venues = await db.collection('Venue').find({
            _id: { $in: facility.venueIds }
        }).toArray();

        if (venues.length === 0) return res.status(400).json({ error: 'No venues found' });

       // res.status(201).json({ message: 'Schedule generation coming soon' });
        const result = await generateSchedule(event, teams, venues, db);
        res.status(201).json({
            message: 'Schedule generated',
            numSlots: result.numSlots
        });

    }
    catch(err){
        console.error('Error generating schedule:', err);
        res.status(500).json({ error: 'Error generating schedule' });
    }
})
export default router;