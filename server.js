const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- FRONTEND SERVER (Port 8080) ---
// This serves the Match Day UI and forcefully clears old browser caches
const frontendApp = express();
frontendApp.use((req, res, next) => {
    // VIOLENTLY NUKE ANY BROWSER CACHES/SERVICE WORKERS FROM PREVIOUS PROJECTS
    res.setHeader('Clear-Site-Data', '"cache", "storage", "executionContexts"');
    next();
});
frontendApp.use(express.static(__dirname));

const FRONTEND_PORT = 8080;
frontendApp.listen(FRONTEND_PORT, () => {
    console.log(`✅ Frontend Dashboard actively wiping old cache and running on http://localhost:${FRONTEND_PORT}`);
});


// Helpers for data generation
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDateString(daysOffset, hoursOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    d.setHours(d.getHours() + hoursOffset, 0, 0, 0);
    return d.toISOString();
}

/**
 * Generates realistic-looking odds for the Top 10 bookmakers.
 * Calculates which bookmaker offers the "Best Odds" (highest decimal value)
 * for the favored participant (to keep the mock simple).
 */
function generateTop10Odds(baseOddsDecimal, favoriteName) {
    const bookmakersList = ['Bet365', 'SkyBet', 'William Hill', 'Ladbrokes', 'Betfred', 'Paddy Power', 'Coral', 'BetVictor', 'Unibet', '888sport'];
    
    let bookmakersData = [];
    let bestDecimal = 0;
    let bestBookie = null;

    bookmakersList.forEach(bookie => {
        // Vary the odds slightly around the base
        const variation = (Math.random() * 0.4) - 0.2; // -0.2 to +0.2
        const decimalOdds = Math.max(1.01, +(baseOddsDecimal + variation).toFixed(2));
        
        // Convert to American format for display
        let americanOdds = '';
        if (decimalOdds >= 2.0) {
            americanOdds = '+' + Math.round((decimalOdds - 1) * 100);
        } else {
            americanOdds = '-' + Math.round(100 / (decimalOdds - 1));
        }

        const oddsString = `${favoriteName} ${americanOdds}`;

        bookmakersData.push({
            key: bookie.toLowerCase().replace(/\s+/g, ''),
            title: bookie,
            last_update: new Date().toISOString(),
            markets: [
                {
                    key: 'h2h',
                    outcomes: [
                        { name: favoriteName, price: decimalOdds, displayStr: oddsString }
                    ]
                }
            ],
            link: `https://www.${bookie.toLowerCase().replace(/\s+/g, '')}.com`
        });

        // Track the absolute best odds
        if (decimalOdds > bestDecimal) {
            bestDecimal = decimalOdds;
            bestBookie = bookie;
        }
    });

    // Sort bookmakers by best decimal odds descending so top 5 is easy to slice
    bookmakersData.sort((a, b) => b.markets[0].outcomes[0].price - a.markets[0].outcomes[0].price);

    const bestAmerican = bestDecimal >= 2.0 ? '+' + Math.round((bestDecimal - 1) * 100) : '-' + Math.round(100 / (bestDecimal - 1));

    // ADVANCED ANALYTICS Engine
    const impliedProb = 1 / bestDecimal;
    
    // Simulate a quantitative edge ranging from -2% to +10%
    const edgeSimulation = (Math.random() * 0.12) - 0.02;
    const modelProb = Math.min(0.99, Math.max(0.01, impliedProb + edgeSimulation));
    
    const edgePct = (modelProb - impliedProb) * 100;
    const ev = (modelProb * bestDecimal) - 1; // Expected Value per unit
    
    // Kelly Criterion Stake Sizing
    let recommendedStake = 0;
    if (ev > 0) {
        const b = bestDecimal - 1;
        const p = modelProb;
        const q = 1 - p;
        const kellyFraction = (b * p - q) / b;
        
        // Quarter Kelly strategy capped at 5% of bankroll
        recommendedStake = Math.min(5.0, Math.max(0.1, kellyFraction * 0.25 * 100));
    }

    const analytics = {
        implied_probability: (impliedProb * 100).toFixed(1),
        model_probability: (modelProb * 100).toFixed(1),
        edge_percent: edgePct.toFixed(1),
        expected_value: (ev * 100).toFixed(1),
        recommended_stake: recommendedStake > 0 ? `${recommendedStake.toFixed(1)}%` : 'No Bet'
    };

    return {
        bookmakers: bookmakersData,
        best_odds: {
            provider: bestBookie,
            decimal: bestDecimal,
            displayStr: `${favoriteName} ${bestAmerican}`,
            link: `https://www.${bestBookie.toLowerCase().replace(/\s+/g, '')}.com`
        },
        analytics: analytics
    };
}

function generateDailyPicks(allEvents) {
    // Filter to only events with significant positive EV (> 2% return)
    const highEvEvents = allEvents.filter(e => e.analytics && parseFloat(e.analytics.expected_value) > 2.0);
    
    highEvEvents.sort((a, b) => parseFloat(b.analytics.expected_value) - parseFloat(a.analytics.expected_value));

    const parlays = [];
    
    if (highEvEvents.length >= 2) {
        const pick1 = highEvEvents[0];
        const pick2 = highEvEvents[1];
        const combinedOdds = (pick1.best_odds.decimal * pick2.best_odds.decimal).toFixed(2);
        
        parlays.push({
            type: 'High-Conviction Double',
            legs: [pick1, pick2],
            total_odds: combinedOdds,
            description: `A data-backed EV double utilizing our top simulated mathematical edges.`
        });
    }

    if (highEvEvents.length >= 3) {
        const picks = [highEvEvents[0], highEvEvents[1], highEvEvents[2]];
        const combinedOdds = picks.reduce((acc, curr) => acc * curr.best_odds.decimal, 1).toFixed(2);
        
        parlays.push({
            type: 'Cross-Sport Accumulator',
            legs: picks,
            total_odds: combinedOdds,
            description: `A 3-leg parlay hunting the biggest market inefficiencies of the day across our live feeds.`
        });
    }

    if (highEvEvents.length >= 4) {
        const picks = [highEvEvents[0], highEvEvents[1], highEvEvents[2], highEvEvents[3]];
        const combinedOdds = picks.reduce((acc, curr) => acc * curr.best_odds.decimal, 1).toFixed(2);
        
        parlays.push({
            type: 'Mega 4-Leg Parlay',
            legs: picks,
            total_odds: combinedOdds,
            description: `A 4-leg mega slip combining the top quantitative picks for maximum return profile.`
        });
    }

    return parlays;
}


const ESPN_APIs = [
    { url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard', key: 'Basketball', title: 'NBA' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard', key: 'American Football', title: 'NFL' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard', key: 'Hockey', title: 'NHL' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard', key: 'Baseball', title: 'MLB' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard', key: 'Soccer', title: 'English Premier League' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.2/scoreboard', key: 'Soccer', title: 'Championship' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.fa/scoreboard', key: 'Soccer', title: 'FA Cup' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.league_cup/scoreboard', key: 'Soccer', title: 'League Cup' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard', key: 'Soccer', title: 'Champions League' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard', key: 'Soccer', title: 'Europa League' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard', key: 'Soccer', title: 'La Liga' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard', key: 'Soccer', title: 'Serie A' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard', key: 'Soccer', title: 'Bundesliga' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard', key: 'Soccer', title: 'Ligue 1' }
];

async function fetchESPN(config) {
    try {
        const response = await fetch(config.url);
        if (!response.ok) return [];
        const data = await response.json();
        
        if (!data.events) return [];

        return data.events.map(e => {
            const comp = e.competitions && e.competitions[0];
            if(!comp) return null;
            
            const home = comp.competitors.find(c => c.homeAway === 'home');
            const away = comp.competitors.find(c => c.homeAway === 'away');
            
            return {
                idEvent: e.id,
                strSport: config.key,
                strLeague: config.title,
                strHomeTeam: home ? home.team.displayName : 'TBD',
                strAwayTeam: away ? away.team.displayName : 'TBD',
                strTimestamp: e.date
            };
        }).filter(Boolean);
    } catch (error) {
        console.error(`Failed to fetch ESPN ${config.title}:`, error);
        return [];
    }
}

// Function to map TheSportsDB live payload into our unified frontend format
function mapLiveEvents(allEvents) {
    const todayEvents = [];
    const forecastEvents = [];
    
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + 7);

    allEvents.forEach((evt, index) => {
        // Skip invalid rows
        if (!evt || !evt.strTimestamp) return;

        const eventTime = new Date(evt.strTimestamp);
        
        // We removed the timestamp hack, so events accurately reflect their real-time schedule.

        const isToday = eventTime <= thresholdDate; // Treat anything in next 7 days as "Today" for dashboard purposes

        // Calculate a random baseline odds factor based on home vs away to keep it somewhat realistic
        // (Just a visual simulation since free API lacks real odds)
        const favoriteName = evt.strHomeTeam.substring(0, 3).toUpperCase();
        const randomBaseOdds = (Math.random() * (2.80 - 1.20) + 1.20); 

        // Map broadcasting info - often not provided reliably in free tiers, so we inject a placeholder
        const defaultBroadcasters = [
            { name: 'StreamTV', region: 'Global', hasFreeTrial: true, watchLink: '#' }
        ];

        const mappedEvent = {
            id: evt.idEvent,
            sport_key: evt.strSport,
            sport_title: evt.strLeague || evt.strSport,
            home_team: evt.strHomeTeam,
            away_team: evt.strAwayTeam,
            commence_time: evt.strTimestamp,
            broadcasters: defaultBroadcasters,
            broadcaster: 'Local Providers',
            ...generateTop10Odds(randomBaseOdds, favoriteName)
        };

        if (isToday) {
            todayEvents.push(mappedEvent);
        } else {
            forecastEvents.push(mappedEvent);
        }
    });

    // Sort chronologically
    todayEvents.sort((a,b) => new Date(a.commence_time) - new Date(b.commence_time));
    forecastEvents.sort((a,b) => new Date(a.commence_time) - new Date(b.commence_time));

    const parlays = generateDailyPicks(todayEvents.concat(forecastEvents));

    return { today: todayEvents, forecast: forecastEvents, parlays: parlays };
}

// Async Data Generator pulling from ESPN APIs
async function getLiveOddsData() {
    console.log("Fetching live schedules from ESPN Multi-Sport...");
    
    // Fetch all leagues in parallel
    const allResults = await Promise.all(ESPN_APIs.map(fetchESPN));
    
    // Flatten array of arrays
    let combinedEvents = allResults.flat();
    
    console.log(`Successfully retrieved ${combinedEvents.length} upcoming live events from ESPN.`);

    return mapLiveEvents(combinedEvents);
}

// Minimal fallback if the free API blocks us or is out of season
function getFallbackMockData() {
    const fallback = {
        id: 'fallback-01',
        sport_key: 'soccer',
        sport_title: 'API Rate Limited',
        home_team: 'Fallback Team A',
        away_team: 'Fallback Team B',
        commence_time: generateDateString(0, 2),
        broadcasters: [{ name: 'N/A', region: 'N/A', hasFreeTrial: false, watchLink: '#' }],
        broadcaster: 'N/A',
        ...generateTop10Odds(1.90, 'TEA')
    };
    return { today: [fallback], forecast: [], parlays: [] };
}

// API Route
app.get('/api/odds', async (req, res) => {
    // Simulate slight network delay of a live API (500ms)
    // plus the actual await time of TheSportsDB request
    const delay = getRandomInt(400, 800);
    
    setTimeout(async () => {
        try {
            const data = await getLiveOddsData();
            res.json(data);
        } catch (error) {
            console.error("Route error:", error);
            res.status(500).json({ error: "Inner Server Fetch Error" });
        }
    }, delay);
});

// Custom Bet Verifier Endpoint
app.post('/api/verify-bet', (req, res) => {
    const { decimalOdds, userProb } = req.body;

    if (!decimalOdds || !userProb) {
        return res.status(400).json({ error: "Missing decimalOdds or userProb" });
    }

    const oddsFloat = parseFloat(decimalOdds);
    const probFloat = parseFloat(userProb) / 100; // Expected format like 55 for 55%

    if (isNaN(oddsFloat) || isNaN(probFloat) || probFloat <= 0 || probFloat >= 1) {
        return res.status(400).json({ error: "Invalid numbers provided." });
    }

    const impliedProb = 1 / oddsFloat;
    const edgePct = (probFloat - impliedProb) * 100;
    const ev = (probFloat * oddsFloat) - 1; 
    
    let recommendedStake = 0;
    let betVerdict = "AVOID";
    let message = "This bet has a negative expected value and will lose money long-term.";

    if (ev > 0) {
        const b = oddsFloat - 1;
        const p = probFloat;
        const q = 1 - p;
        const kellyFraction = (b * p - q) / b;
        
        // Quarter Kelly strategy capped at 5% of bankroll
        recommendedStake = Math.min(5.0, Math.max(0.1, kellyFraction * 0.25 * 100));
        
        if (recommendedStake > 2.0) {
            betVerdict = "HIGH CONVICTION";
            message = "Strong mathematical edge detected. Excellent value bet.";
        } else {
            betVerdict = "SAFE TO PROCEED";
            message = "Positive expected value detected. Proceed with measured stake.";
        }
    }

    res.json({
        implied_probability: (impliedProb * 100).toFixed(1) + "%",
        model_probability: (probFloat * 100).toFixed(1) + "%",
        edge_percent: edgePct.toFixed(1) + "%",
        expected_value: (ev * 100).toFixed(1) + "%",
        recommended_stake: recommendedStake > 0 ? `${recommendedStake.toFixed(1)}% of Bankroll` : '0% (NO BET)',
        verdict: betVerdict,
        message: message,
        isSafe: ev > 0
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`✅ Live Sports API Mock Server active on http://localhost:${PORT}`);
    console.log(`📡 Fetch odds at: http://localhost:${PORT}/api/odds`);
});
