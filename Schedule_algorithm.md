**Scheduling Constraints:**

Rest/sit constraints (enforced by algorithm):
- Maximum consecutive sits: 1 (no team sits out twice in a row)
- Maximum wait between games: configurable per event, default 2 slots
- Minimum rest between games: 1 slot (can't play back to back)
- Balanced distribution: each team plays roughly equal number of games
- Sit tracking: teams that have sat out get priority for next slot

**The sit problem:**
Without constraints a naive round robin can produce:
- Team A plays rounds 1,2,3 then sits rounds 4,5,6
- Team B sits rounds 1,2 then plays rounds 3,4,5,6

Target distribution for 9 teams, 4 courts, 7 slots:
- Each team plays ~6 games
- Each team sits ~1 time
- No team sits more than 2 consecutive slots
- Sit-outs distributed across different slots per team

**Sit tracker:**
```javascript
// tracks consecutive sits and total sits per team
const sitTracker = {
  teamId: {
    consecutiveSits: 0,
    totalSits: 0,
    lastPlayedSlot: null
  }
}
```

**Priority queue for sit-outs:**
Teams are prioritized for play based on:
1. Consecutive sits (highest priority — never sit twice in a row)
2. Total sits (teams with more sit-outs get priority)
3. Last played slot (teams that played most recently sit out)


*** see schedule section 6 in APP - event.md
