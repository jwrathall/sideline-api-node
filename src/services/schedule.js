import {ObjectId} from "mongodb"

export const generateSchedule = async(event, teams, venues, db) => {

    // time and slot set up
    const {startTime, endTime, gameDuration, transitionTime} = event.schedule;
    const slotDuration = gameDuration+transitionTime;

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    const numSlots = Math.floor(totalMinutes / slotDuration);
    const numCourts = venues.length;

    console.log(`Generating ${numSlots} slots across ${numCourts} courts`);

    // init tracking
    const metadata = event.scheduleMetadata ?? {};
    const sitOutHistory = metadata.sitOutHistory ?? Object.fromEntries(teams.map(t => [t._id.toString(), 0]));

    const matchHistory = metadata.matchHistory ?? {};

    // Step 3 — generate slots
    const slots = [];
    const gameSlots = [];
    const games = [];
    let lastSitOut = null;
}