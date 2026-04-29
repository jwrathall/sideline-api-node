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

    //
    for(let i = 0; i < numSlots; ++i) {
        // which team sits
        const sitOut = pickSitOut(teams, sitOutHistory, lastSitOut);
        lastSitOut = sitOut._id.toString();
        sitOutHistory[sitOut._id.toString()]++;

        const activeTeams = teams.filter(team => team._id.toString() !== sitOut._id.toString());
        console.log(`Active teams for slot ${i + 1}: ${activeTeams.length}`);
        const pairs = findBestPairing(activeTeams, matchHistory);

        if (!pairs) {
            console.log(`Could not generate pairs for slot ${i + 1}`);
            continue;
        }

        pairs.forEach(([a, b]) => {
            const key = matchKey(a._id, b._id);
            matchHistory[key] = (matchHistory[key] ?? 0) + 1;
        });


        console.log(`Slot ${i + 1}: ${sitOut.name} sits out`);
        console.log(`Slot ${i + 1}: ${sitOut.name} sits out`);
        pairs.forEach(([a, b]) => console.log(`  ${a.name} vs ${b.name}`));
    }

    return { numSlots };


}

const pickSitOut = (teams, sitOutHistory, lastSitOut) => {
    //never same team twice
    const eligible = teams.filter(t => t._id.toString() !== lastSitOut);
    //find min sit out count
    const minSits = Math.min(...eligible.map(t=> sitOutHistory[t._id.toString()] ?? 0));
    // all teams ties at min
    const candidate = eligible.filter(t=> (sitOutHistory[t._id.toString()] ?? 0) === minSits);

    //random from candidates
    //TODO: there will be more filtering here
    return candidate[Math.floor(Math.random() * candidate.length)];
}

const matchKey = (idA, idB) => {
    const a = idA.toString();
    const b = idB.toString();
    return a < b ? `${a}_${b}` : `${b}_${a}`;
};

const findBestPairing = (teams, matchHistory) => {
    console.log(`findBestPairing called with ${teams.length} teams`)
    if (teams.length === 0) return [];
    if (teams.length === 2) return [[teams[0], teams[1]]];

    const[first, ...rest] = teams;
    let bestScore = Infinity;
    let bestPairing = null;

    for (let i = 0; i < rest.length; i++) {
        const partner = rest[i];
        const remaining = rest.filter((_,index) => index !== i);
        console.log(`  trying ${first.name} vs ${partner.name}, remaining: ${remaining.length}`);
        const key = matchKey(first._id, partner._id);
        const pairScore = matchHistory[key] ?? 0;

        const subPairing = findBestPairing(remaining, matchHistory);
        if (subPairing === null || subPairing === undefined) {
            console.log('subPairing is null, skipping');
            continue;
        }

        const subScore = subPairing.reduce((accumulator, pair) => {
            const teamA = pair[0];
            const teamB = pair[1];
            const key = matchKey(teamA._id, teamB._id);
            const timesPlayed = matchHistory[key] ?? 0;
            console.log(`  subScore: ${teamA.name} vs ${teamB.name} = ${timesPlayed}`);
            return accumulator + timesPlayed;
        }, 0);

        console.log(`  subScore total: ${subScore}`);

        const totalScore = pairScore + subScore;

        if (totalScore < bestScore) {
            bestScore = totalScore;
            bestPairing = [[first, partner], ...subPairing];
        }
    }
    return bestPairing ?? [];
}