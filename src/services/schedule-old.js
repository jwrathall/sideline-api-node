function scheduleMatchesRandomized(teams, gyms, matchDuration = 20) {
    const n = teams.length; // Total teams
    const rounds = n - 1; // Total rounds (each team plays against all others once)
    const matchesPerRound = Math.floor(n / 2); // Number of matches per round
    const schedule = [];

    // Create a rotating array of teams (excluding the first team)
    let rotatingTeams = teams.slice(1);

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1)); // Random index
            [array[i], array[j]] = [array[j], array[i]]; // Swap elements
        }
        return array;
    }

    // Track which teams have already sat out
    const sittingOutTracker = new Set();

    for (let round = 0; round < rounds; round++) {
        const roundSchedule = { round: round + 1, matches: [], sittingOut: null };

        // Randomly pick a sitting out team that hasn't sat out yet
        let availableTeams = teams.filter(team => !sittingOutTracker.has(team));
        if (availableTeams.length === 0) {
            // Reset tracker if all teams have sat out
            sittingOutTracker.clear();
            availableTeams = teams;
        }
        const sittingOut = availableTeams[Math.floor(Math.random() * availableTeams.length)];
        sittingOutTracker.add(sittingOut);
        roundSchedule.sittingOut = sittingOut;

        // Shuffle teams at the start of each round
        const activeTeams = shuffleArray(rotatingTeams.slice());

        // Pair teams randomly
        for (let i = 0; i < matchesPerRound; i++) {
            const team1 = activeTeams[i];
            const team2 = activeTeams[activeTeams.length - 1 - i]; // Mirror index
            const gym = gyms[i % gyms.length]; // Assign gym

            roundSchedule.matches.push({
                team1,
                team2,
                gym,
                duration: matchDuration,
            });
        }

        // Store the scheduleOld for this round
        schedule.push(roundSchedule);

        // Rotate the array for the next round
        rotatingTeams.push(rotatingTeams.shift());
    }

    return schedule;
}

// Example usage
const teams = ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5", "Team 6", "Team 7", "Team 8", "Team 9"];
const gyms = ["Gym 1", "Gym 2", "Gym 3", "Gym 4"];
const scheduleOld = scheduleMatchesRandomized(teams, gyms);

console.log(JSON.stringify(scheduleOld, null, 2));