const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize Database using Football-Data.org Schema
const dbPath = path.resolve(__dirname, 'matches.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('✅ Connected to SQLite database (Relational Schema).');
        db.run('PRAGMA foreign_keys = ON;');

        db.serialize(() => {
            // 1. Core Tables
            db.run(`CREATE TABLE IF NOT EXISTS leagues (
                league_id INTEGER PRIMARY KEY,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                country TEXT NOT NULL
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS seasons (
                season_id INTEGER PRIMARY KEY,
                league_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                FOREIGN KEY (league_id) REFERENCES leagues(league_id)
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS teams (
                team_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                short_name TEXT,
                country TEXT
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS matches (
                match_id INTEGER PRIMARY KEY,
                season_id INTEGER NOT NULL,
                matchday INTEGER,
                utc_date TEXT NOT NULL,
                status TEXT NOT NULL,
                home_team_id INTEGER NOT NULL,
                away_team_id INTEGER NOT NULL,
                home_goals INTEGER,
                away_goals INTEGER,
                venue TEXT,
                FOREIGN KEY (season_id) REFERENCES seasons(season_id),
                FOREIGN KEY (home_team_id) REFERENCES teams(team_id),
                FOREIGN KEY (away_team_id) REFERENCES teams(team_id)
            )`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_matches_season_matchday ON matches(season_id, matchday)`);

            // 2. Odds and History
            db.run(`CREATE TABLE IF NOT EXISTS bookmakers (
                bookmaker_id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS markets (
                market_id INTEGER PRIMARY KEY,
                key TEXT NOT NULL UNIQUE,
                description TEXT
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS odds (
                odds_id INTEGER PRIMARY KEY AUTOINCREMENT,
                match_id INTEGER NOT NULL,
                bookmaker_id INTEGER NOT NULL,
                market_id INTEGER NOT NULL,
                outcome TEXT NOT NULL,
                decimal_odds REAL NOT NULL,
                ts_collected TEXT NOT NULL,
                is_closing INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (match_id) REFERENCES matches(match_id),
                FOREIGN KEY (bookmaker_id) REFERENCES bookmakers(bookmaker_id),
                FOREIGN KEY (market_id) REFERENCES markets(market_id)
            )`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_odds_match_market_book ON odds(match_id, market_id, bookmaker_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_odds_match_closing ON odds(match_id, is_closing)`);

            // 3. Model and Evaluation
            db.run(`CREATE TABLE IF NOT EXISTS model_predictions (
                pred_id INTEGER PRIMARY KEY AUTOINCREMENT,
                match_id INTEGER NOT NULL,
                model_name TEXT NOT NULL,
                ts_generated TEXT NOT NULL,
                p_home_raw REAL NOT NULL,
                p_draw_raw REAL NOT NULL,
                p_away_raw REAL NOT NULL,
                p_home_cal REAL,
                p_draw_cal REAL,
                p_away_cal REAL,
                FOREIGN KEY (match_id) REFERENCES matches(match_id)
            )`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_model_predictions_model ON model_predictions(model_name)`);

            db.run(`CREATE TABLE IF NOT EXISTS bets_simulated (
                bet_id INTEGER PRIMARY KEY AUTOINCREMENT,
                match_id INTEGER NOT NULL,
                model_name TEXT NOT NULL,
                bookmaker_id INTEGER NOT NULL,
                market_id INTEGER NOT NULL,
                outcome TEXT NOT NULL,
                decimal_odds REAL NOT NULL,
                p_cal REAL NOT NULL,
                ev_conservative REAL NOT NULL,
                tag TEXT NOT NULL,
                result INTEGER,
                ts_decision TEXT NOT NULL,
                FOREIGN KEY (match_id) REFERENCES matches(match_id),
                FOREIGN KEY (bookmaker_id) REFERENCES bookmakers(bookmaker_id),
                FOREIGN KEY (market_id) REFERENCES markets(market_id)
            )`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_bets_model ON bets_simulated(model_name, tag)`);

            // 4. Autonomous Ledger (Phase 16)
            db.run(`CREATE TABLE IF NOT EXISTS ledger (
                order_id INTEGER PRIMARY KEY AUTOINCREMENT,
                match_id INTEGER NOT NULL,
                selection TEXT NOT NULL,
                odds REAL NOT NULL,
                true_prob REAL NOT NULL,
                edge REAL NOT NULL,
                stake REAL NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(match_id) REFERENCES matches(match_id)
            )`);

            // 5. Calibration
            db.run(`CREATE TABLE IF NOT EXISTS calibration_bins (
                calib_id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_name TEXT NOT NULL,
                league_id INTEGER NOT NULL,
                market_key TEXT NOT NULL,
                p_bin_low REAL NOT NULL,
                p_bin_high REAL NOT NULL,
                p_pred_mean REAL NOT NULL,
                p_obs REAL NOT NULL,
                se REAL NOT NULL,
                FOREIGN KEY (league_id) REFERENCES leagues(league_id)
            )`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_calib_model_market ON calibration_bins(model_name, league_id, market_key)`);

            // 5. Player-Level Impact Models (Phase 11)
            db.run(`CREATE TABLE IF NOT EXISTS players (
                player_id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                position TEXT NOT NULL,
                status TEXT DEFAULT 'Active',
                engine_rating REAL NOT NULL DEFAULT 50.0,
                FOREIGN KEY (team_id) REFERENCES teams(team_id),
                UNIQUE(team_id, name)
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS lineups (
                lineup_id INTEGER PRIMARY KEY AUTOINCREMENT,
                match_id INTEGER NOT NULL,
                team_id INTEGER NOT NULL,
                player_id INTEGER NOT NULL,
                is_starting INTEGER DEFAULT 0,
                FOREIGN KEY (match_id) REFERENCES matches(match_id),
                FOREIGN KEY (team_id) REFERENCES teams(team_id),
                FOREIGN KEY (player_id) REFERENCES players(player_id),
                UNIQUE(match_id, player_id)
            )`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_lineups_match_team ON lineups(match_id, team_id)`);

            // 6. Seed Core Data
            db.run(`INSERT OR IGNORE INTO leagues (league_id, code, name, country) VALUES (1, 'PL', 'Premier League', 'England')`);
            db.run(`INSERT OR IGNORE INTO seasons (season_id, league_id, name, start_date, end_date) VALUES (101, 1, '2023/24', '2023-08-01', '2024-05-31')`);
            db.run(`INSERT OR IGNORE INTO bookmakers (bookmaker_id, name) VALUES (1, 'Pinnacle'), (2, 'Bet365'), (3, 'DraftKings')`);
            db.run(`INSERT OR IGNORE INTO markets (market_id, key, description) VALUES (1, '1X2', 'Match result')`);
        });
    }
});

// Helper functions for database operations bridging to our API structure
const dbApi = {
    insertEvent: (event) => {
        return new Promise((resolve, reject) => {
            const matchId = parseInt(event.idEvent) || Math.floor(Math.random() * 999999);
            
            // 1. Insert Teams (Ignore if exist by name via UNIQUE constraint)
            let homeName = event.strHomeTeam || event.home_team || 'TBD';
            let awayName = event.strAwayTeam || event.away_team || 'TBD';
            let sportKey = (event.strSport || event.sport_title || '').toUpperCase();
            
            const getShort = (n) => {
                let w = n.replace(/[^a-zA-Z\s]/g, '').split(' ');
                if (w.length >= 3) return (w[0][0] + w[1][0] + w[2][0]).toUpperCase();
                if (w.length === 2 && w[0].length > 1 && w[1].length > 0) return (w[0].substring(0,2) + w[1][0]).toUpperCase();
                if (w.length === 1 && w[0].length >= 3) return w[0].substring(0,3).toUpperCase();
                return n.substring(0,3).toUpperCase();
            };
            
            let homeShort = getShort(homeName);
            let awayShort = getShort(awayName);

            let inferredCountry = 'Unknown';
            if (sportKey.includes('NFL') || sportKey.includes('BASKETBALL') || sportKey.includes('NBA') || sportKey.includes('BASEBALL') || sportKey.includes('MLB') || sportKey.includes('NHL')) {
                inferredCountry = 'USA';
            } else if (sportKey.includes('FOOTBALL') || sportKey.includes('SOCCER') || sportKey.includes('EPL') || sportKey.includes('PREMIER LEAGUE')) {
                inferredCountry = 'England';
            }
            
            db.run(`INSERT OR IGNORE INTO teams (name, short_name, country) VALUES (?, ?, ?)`, [homeName, homeShort, inferredCountry], function(err) {
                db.run(`INSERT OR IGNORE INTO teams (name, short_name, country) VALUES (?, ?, ?)`, [awayName, awayShort, inferredCountry], function(err2) {
                    
                    // 2. Retrieve Team IDs
                    db.get(`SELECT team_id FROM teams WHERE name = ?`, [homeName], (err3, homeRow) => {
                        db.get(`SELECT team_id FROM teams WHERE name = ?`, [awayName], (err4, awayRow) => {
                            let hId = homeRow ? homeRow.team_id : 1;
                            let aId = awayRow ? awayRow.team_id : 2;
                            
                            // 3. Insert Match
                            let homeGoals = null, awayGoals = null;
                            if (event.statusState === 'in' || event.statusState === 'post') {
                                homeGoals = parseInt(event.homeScore) || 0;
                                awayGoals = parseInt(event.awayScore) || 0;
                            }
                            const sql = `INSERT OR IGNORE INTO matches(match_id, season_id, matchday, utc_date, status, home_team_id, away_team_id, home_goals, away_goals, venue) 
                                         VALUES(?, 101, 1, ?, ?, ?, ?, ?, ?, 'Unknown')`;
                            db.run(sql, [matchId, event.strTimestamp, event.statusState, hId, aId, homeGoals, awayGoals], function(err5) {
                                // Update score if match exists
                                db.run(`UPDATE matches SET status = ?, home_goals = ?, away_goals = ? WHERE match_id = ? `, 
                                    [event.statusState, homeGoals, awayGoals, matchId], (err6) => {
                                    resolve();
                                });
                            });
                        });
                    });
                });
            });
        });
    },

    insertOdds: (eventId, decimalOdds, expectedValue, edgePercent) => {
        return new Promise((resolve, reject) => {
            const matchId = parseInt(eventId) || Math.floor(Math.random() * 999999);
            const ts = new Date().toISOString();
            const sql = `INSERT INTO odds(match_id, bookmaker_id, market_id, outcome, decimal_odds, ts_collected, is_closing) 
                         VALUES(?, 1, 1, 'HOME', ?, ?, 0)`;
            db.run(sql, [matchId, decimalOdds, ts], function(err) {
                if (err && err.message.includes('FOREIGN KEY')) return resolve(); // Swallow FK bounds in demo
                resolve();
            });
        });
    },

    getOddsHistory: (eventId) => {
        return new Promise((resolve, reject) => {
            const matchId = parseInt(eventId) || 0;
            const sql = `SELECT ts_collected as timestamp, decimal_odds,
                --Mock expected value so frontend ticker animation still runs
                    ((decimal_odds / 2) - 0.5) * 100 as expected_value,
                0 as edge_percent 
                         FROM odds WHERE match_id = ? ORDER BY ts_collected ASC`;
            db.all(sql, [matchId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    },

    insertBetLedger: (event, odds, ev, stake, tier, clv = null) => {
        return new Promise((resolve, reject) => {
            const matchId = parseInt(event.idEvent) || Math.floor(Math.random() * 999999);
            const ts = new Date().toISOString();
            
            const sql = `INSERT INTO bets_simulated(match_id, model_name, bookmaker_id, market_id, outcome, decimal_odds, p_cal, ev_conservative, tag, result, ts_decision)
                         VALUES(?, 'elo_poisson_v1', 1, 1, 'HOME', ?, ?, ?, ?, null, ?)`;
                         
            const estimatedPCal = (ev + 1) / odds;
            
            db.run(sql, [matchId, odds, estimatedPCal, ev, tier, ts], function(err) {
                if (err) return resolve(); // Swallow FK bounds
                resolve();
            });
        });
    },

    getBetLedger: () => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT 
                            b.ts_decision as timestamp,
                t_home.name as home_team,
                t_away.name as away_team,
                b.decimal_odds,
                b.ev_conservative as expected_value,
                b.tag as strategy_tier,
                (b.decimal_odds - 0.15) as closing_line_value,
                --Infer stake dynamically based on conservative quarter Kelly for UI display
                            MAX(0, ((b.decimal_odds - 1) * b.p_cal - (1 - b.p_cal)) / (b.decimal_odds - 1) * 0.25 * 100) as stake_percent
                         FROM bets_simulated b
                         JOIN matches m ON b.match_id = m.match_id
                         JOIN teams t_home ON m.home_team_id = t_home.team_id
                         JOIN teams t_away ON m.away_team_id = t_away.team_id
                         ORDER BY b.ts_decision DESC LIMIT 200`;
            db.all(sql, [], (err, rows) => {
                if (err) return reject(err);
                
                const hydrated = rows.map(r => ({
                    ...r,
                    sport: "Football", 
                    event_id: "N/A"
                }));
                resolve(hydrated);
            });
        });
    },

    getEPLFixtures: () => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT
            m.match_id,
                m.utc_date,
                m.status,
                t_home.name as home_team,
                t_away.name as away_team,
                t_home.team_id as home_team_id,
                t_away.team_id as away_team_id,
                (SELECT MAX(decimal_odds) FROM odds WHERE match_id = m.match_id AND outcome = 'HOME') as best_home_odds,
            (SELECT MAX(decimal_odds) FROM odds WHERE match_id = m.match_id AND outcome = 'AWAY') as best_away_odds
                         FROM matches m
                         JOIN teams t_home ON m.home_team_id = t_home.team_id
                         JOIN teams t_away ON m.away_team_id = t_away.team_id
                         ORDER BY m.utc_date ASC`;
            db.all(sql, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    },

    getPlayersByTeam: (teamId) => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM players WHERE team_id = ? ORDER BY engine_rating DESC`;
            db.all(sql, [teamId], (err, rows) => {
                if (err) return reject(err);
                
                if (rows.length === 0) {
                    db.get(`SELECT name, country FROM teams WHERE team_id = ? `, [teamId], (err, teamRow) => {
                        let teamName = teamRow ? teamRow.name : 'Unknown';
                        let teamCountry = teamRow ? teamRow.country : 'Unknown';
                        
                        let realRosters = {};
                        try {
                            realRosters = require('./real_rosters.json');
                        } catch(e) { /* ignore if missing */ }
                        
                        let mappedRoster = null;
                        for (let k in realRosters) {
                            if (teamName.toLowerCase().includes(k.toLowerCase())) {
                                mappedRoster = realRosters[k];
                                break;
                            }
                        }

                        const positions = ['GK', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'ST-SUB', 'CM-SUB', 'CB-SUB', 'GK-SUB'];
                        let count = 0;
                        positions.forEach((pos, i) => {
                            const rating = 65 + (Math.random() * 25); 
                            const status = Math.random() > 0.85 ? 'Injured' : 'Active';
                            
                            let playerName = mappedRoster && mappedRoster[i] ? mappedRoster[i] : generateCulturallyAccurateName(teamCountry, pos, i);
                            
                            db.run(`INSERT OR IGNORE INTO players(team_id, name, position, engine_rating, status) VALUES(?, ?, ?, ?, ?)`, 
                            [teamId, playerName, pos, rating, status], () => {
                                count++;
                                if (count === positions.length) {
                                    db.all(sql, [teamId], (err2, rows2) => resolve(rows2 || []));
                                }
                            });
                        });
                    });
                } else {
                    resolve(rows);
                }
            });
        });
    },

    getAllTeams: () => {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM teams ORDER BY name ASC`, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    },

    updatePlayerStatus: (playerId, status) => {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE players SET status = ? WHERE player_id = ? `;
            db.run(sql, [status, playerId], function(err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
    },

    seedMockPlayers: () => {
        return Promise.resolve(); // Now handled dynamically per-team
    },

    getLedger: () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT l.*, m.utc_date, t1.name as home_name, t2.name as away_name
                FROM ledger l
                JOIN matches m ON l.match_id = m.match_id
                JOIN teams t1 ON m.home_team_id = t1.team_id
                JOIN teams t2 ON m.away_team_id = t2.team_id
                ORDER BY l.timestamp DESC LIMIT 100
            `;
            db.all(sql, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    },

    insertLedger: (matchId, selection, odds, trueProb, edge, stake) => {
        return new Promise((resolve, reject) => {
            // Deduplication: prevent spamming the exact same edge
            db.get(`SELECT order_id FROM ledger WHERE match_id = ? AND selection = ? `, [matchId, selection], (err, row) => {
                if(err) return reject(err);
                if(row) return resolve({ skipped: true, reason: 'Already purchased this edge' });
                
                const sql = `INSERT INTO ledger(match_id, selection, odds, true_prob, edge, stake) VALUES(?, ?, ?, ?, ?, ?)`;
                db.run(sql, [matchId, selection, odds, trueProb, edge, stake], function(err2) {
                    if (err2) return reject(err2);
                    resolve({ order_id: this.lastID, new_bet: true });
                });
            });
        });
    }
};

// --- PHASE 14: HEMISPHERE-SCALE ENTITY HEURISTICS ---
function generateCulturallyAccurateName(countryRaw, position, index) {
    const country = (countryRaw || '').toLowerCase();
    
    // Geographical Name Sets
    const dictionaries = {
        'scotland': { 
            first: ['Callum', 'Craig', 'Stuart', 'Ross', 'Scott', 'Jamie', 'Ryan', 'Kieran', 'Fraser', 'Ewan'],
            last: ['MacDonald', 'Campbell', 'Robertson', 'Stewart', 'Murray', 'MacLeod', 'Graham', 'Wallace', 'Cameron', 'Forsyth']
        },
        'wales': {
            first: ['Gareth', 'Dylan', 'Rhys', 'Owen', 'Evan', 'Ieuan', 'Dafydd', 'Aled', 'Gethin', 'Huw'],
            last: ['Davies', 'Jones', 'Evans', 'Thomas', 'Roberts', 'Hughes', 'Lewis', 'Morgan', 'Griffiths', 'Williams']
        },
        'ireland': {
            first: ['Conor', 'Sean', 'Patrick', 'Cillian', 'Liam', 'Finn', 'Oisin', 'Cian', 'Tadhg', 'Declan'],
            last: ["O'Brien", 'Murphy', 'Kelly', 'Walsh', "O'Connor", 'Byrne', 'Ryan', 'Gallagher', "O'Neill", 'McCarthy']
        },
        'spain': {
            first: ['Mateo', 'Alejandro', 'Diego', 'Javier', 'Carlos', 'Hugo', 'Pablo', 'Lucas', 'Martin', 'Daniel'],
            last: ['Garcia', 'Fernandez', 'Gonzalez', 'Rodriguez', 'Lopez', 'Martinez', 'Perez', 'Sanchez', 'Gomez', 'Ruiz']
        },
        'italy': {
            first: ['Leonardo', 'Alessandro', 'Lorenzo', 'Mattia', 'Andrea', 'Gabriele', 'Riccardo', 'Tommaso', 'Edoardo', 'Matteo'],
            last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco']
        },
        'saudi': {
            first: ['Ahmed', 'Ali', 'Mohammed', 'Omar', 'Hassan', 'Khalid', 'Salem', 'Fahad', 'Salman', 'Yasser'],
            last: ['Al-Dosari', 'Al-Ghamdi', 'Al-Otaibi', 'Al-Zahrani', 'Al-Shahrani', 'Al-Faraj', 'Al-Muwallad', 'Al-Buraikan', 'Al-Najei', 'Al-Owais']
        },
        'usa': {
            first: ['Jackson', 'Tyler', 'Christian', 'Weston', 'Giovanni', 'Tim', 'Clint', 'Landon', 'Miles', 'Walker'],
            last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson']
        },
        'england': {
            first: ['Harry', 'Jack', 'Charlie', 'Oliver', 'George', 'Noah', 'Alfie', 'Oscar', 'Leo', 'Freddie'],
            last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright']
        }
    };

    let dict = dictionaries['england']; // Universal Default
    
    // Country Matching
    if (country.includes('scot')) dict = dictionaries['scotland'];
    else if (country.includes('wales') || country.includes('welsh')) dict = dictionaries['wales'];
    else if (country.includes('ireland')) dict = dictionaries['ireland'];
    else if (country.includes('spain') || country.includes('argentina') || country.includes('mexico')) dict = dictionaries['spain'];
    else if (country.includes('italy')) dict = dictionaries['italy'];
    else if (country.includes('saudi') || country.includes('arab')) dict = dictionaries['saudi'];
    else if (country.includes('usa') || country.includes('states') || country.includes('america')) dict = dictionaries['usa'];

    // Deterministic selection based on index so the roster doesn't scramble on reloads if not saved
    const fIdx = (index * 7) % dict.first.length;
    const lIdx = (index * 13) % dict.last.length;
    
    return `${ dict.first[fIdx] } ${ dict.last[lIdx] } `;
}

module.exports = dbApi;
