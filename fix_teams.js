const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./matches.db');

db.all("SELECT * FROM teams WHERE country = 'Unknown' OR country IS NULL", [], (err, rows) => {
    if (err) throw err;
    let updates = 0;
    rows.forEach(team => {
        let name = team.name.toLowerCase();
        let country = 'Global';
        
        // Simple Categorization Engine
        if (name.includes('bulls') || name.includes('nets') || name.includes('braves') || name.includes('sox') || name.includes('flames') || name.includes('blackhawks') || name.includes('reds') || name.includes('avalanche') || name.includes('jackets') || name.includes('mavericks') || name.includes('stars') || name.includes('patriots') || name.includes('penguins') || name.includes('suns') || name.includes('celtics') || name.includes('lakers') || name.includes('warriors') || name.includes('knicks') || name.includes('yankees') || name.includes('dodgers') || name.includes('astros') || name.includes('eagles') || name.includes('chiefs') || name.includes('packers') || name.includes('bruins') || name.includes('rangers') || name.includes('flyers')) {
            country = 'USA';
        } else if (name.includes('arsenal') || name.includes('chelsea') || name.includes('liverpool') || name.includes('brighton') || name.includes('city') || name.includes('united') || name.includes('villa') || name.includes('spurs') || name.includes('forest') || name.includes('brentford') || name.includes('palace') || name.includes('everton') || name.includes('fulham') || name.includes('newcastle')) {
            country = 'England';
        } else if (name.includes('madrid') || name.includes('barcelona') || name.includes('sevilla') || name.includes('vigo') || name.includes('alavés') || name.includes('betis') || name.includes('sociedad') || name.includes('valencia') || name.includes('bilbao')) {
            country = 'Spain';
        } else if (name.includes('monaco') || name.includes('paris') || name.includes('lyon') || name.includes('lille') || name.includes('marseille') || name.includes('nantes') || name.includes('rennes') || name.includes('lens') || name.includes('toulouse')) {
            country = 'France';
        } else if (name.includes('roma') || name.includes('milan') || name.includes('lazio') || name.includes('fiorentina') || name.includes('bologna') || name.includes('juventus') || name.includes('napoli') || name.includes('atalanta') || name.includes('torino') || name.includes('verona')) {
            country = 'Italy';
        } else if (name.includes('bayern') || name.includes('dortmund') || name.includes('frankfurt') || name.includes('leipzig') || name.includes('leverkusen') || name.includes('stuttgart') || name.includes('wolfsburg') || name.includes('freiburg')) {
            country = 'Germany';
        } else if (name.includes('porto') || name.includes('benfica') || name.includes('sporting')) {
            country = 'Portugal';
        } else if (name.includes('celtic') || name.includes('rangers')) {
            country = 'Scotland';
        }

        db.run(`UPDATE teams SET country = ? WHERE team_id = ?`, [country, team.team_id], (uErr) => {
            if (!uErr) updates++;
        });
    });

    setTimeout(() => {
        console.log(`Successfully mapped ${updates} legacy teams to their true physical geographical regions in SQLite.`);
        process.exit(0);
    }, 2000); // 2 second buffer for SQLite event loop bounds
});
