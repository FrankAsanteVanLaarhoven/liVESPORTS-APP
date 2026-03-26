const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./matches.db');

db.all("SELECT * FROM teams", [], (err, rows) => {
    if (err) throw err;
    let updates = 0;
    
    rows.forEach(team => {
        let name = team.name;
        let lowerName = name.toLowerCase();
        let country = team.country;
        
        // 1. Geography Fixes for Canadian / Global anomalies
        if (lowerName.includes('maple leafs') || lowerName.includes('canadiens') || lowerName.includes('canucks') || lowerName.includes('flames') || lowerName.includes('oilers') || lowerName.includes('senators') || lowerName.includes('jets') || lowerName.includes('raptors') || lowerName.includes('blue jays') || lowerName.includes('cf montreal') || lowerName.includes('toronto fc') || lowerName.includes('vancouver whitecaps')) {
            country = 'Canada';
        } else if (lowerName.includes('ducks') || lowerName.includes('kings') || lowerName.includes('sharks') || lowerName.includes('wild') || lowerName.includes('blues') || lowerName.includes('predators') || lowerName.includes('hurricanes') || lowerName.includes('panthers') || lowerName.includes('lightning') || lowerName.includes('capitals') || lowerName.includes('islanders') || lowerName.includes('sabres') || lowerName.includes('sporting kc') || lowerName.includes('revolution') || lowerName.includes('athletics')) {
            country = 'USA'; // Catch missing NHL/MLS/MLB
        } else if (lowerName.includes('athletic club') || lowerName.includes('osasuna') || lowerName.includes('mallorca') || lowerName.includes('cadiz') || lowerName.includes('getafe') || lowerName.includes('rayo vallecano') || lowerName.includes('girona')) {
            country = 'Spain';
        } else if (lowerName.includes('genk') || lowerName.includes('anderlecht') || lowerName.includes('brugge') || lowerName.includes('standard liege')) {
            country = 'Belgium';
        } else if (lowerName.includes('feyenoord') || lowerName.includes('ajax') || lowerName.includes('psv') || lowerName.includes('az alkmaar')) {
            country = 'Netherlands';
        } else if (lowerName.includes('boca') || lowerName.includes('river plate') || lowerName.includes('racing') || lowerName.includes('independiente') || lowerName.includes('san lorenzo')) {
            country = 'Argentina';
        } else if (lowerName.includes('flamengo') || lowerName.includes('palmeiras') || lowerName.includes('sao paulo') || lowerName.includes('corinthians') || lowerName.includes('gremio') || lowerName.includes('vasco') || lowerName.includes('fluminense') || lowerName.includes('botafogo')) {
            country = 'Brazil';
        } else if (lowerName.includes('al-hilal') || lowerName.includes('al-nassr') || lowerName.includes('al-ittihad') || lowerName.includes('al-ahli') || lowerName.includes('al-shabab')) {
            country = 'Saudi Arabia';
        }

        // 2. Short Name Generation (3 letter acronym)
        let shortName = team.short_name;
        if (!shortName) {
            // Generate a 3 letter acronym
            let words = name.replace(/[^a-zA-Z\s]/g, '').split(' ');
            if (words.length >= 3) {
                shortName = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
            } else if (words.length === 2 && words[0].length > 1 && words[1].length > 0) {
                shortName = (words[0].substring(0, 2) + words[1][0]).toUpperCase();
            } else if (words.length === 1 && words[0].length >= 3) {
                shortName = words[0].substring(0, 3).toUpperCase();
            } else {
                shortName = name.substring(0, 3).toUpperCase();
            }
        }
        
        // Manual override for common ones that look weird when auto-generated
        if (lowerName === "manchester united") shortName = "MUN";
        if (lowerName === "manchester city") shortName = "MCI";
        if (lowerName === "arsenal") shortName = "ARS";
        if (lowerName === "chelsea") shortName = "CHE";
        if (lowerName === "liverpool") shortName = "LIV";
        if (lowerName === "tottenham hotspur") shortName = "TOT";
        if (lowerName === "new york yankees") shortName = "NYY";
        if (lowerName === "los angeles lakers") shortName = "LAL";
        if (lowerName === "los angeles clippers") shortName = "LAC";

        db.run(`UPDATE teams SET country = ?, short_name = ? WHERE team_id = ?`, [country, shortName, team.team_id], (uErr) => {
            if (!uErr) updates++;
        });
    });

    setTimeout(() => {
        console.log(`Successfully mapped and auto-generated short-names for ${updates} franchises in SQLite.`);
        process.exit(0);
    }, 2000); 
});
