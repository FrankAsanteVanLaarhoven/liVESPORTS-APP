// --- WebGL Background Animation ---
function initWebGL() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) {
        console.warn("WebGL not supported, falling back to static background.");
        return;
    }

    // Resize canvas
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    // Shaders
    const vsSource = `
        attribute vec4 aVertexPosition;
        void main() {
            gl_Position = aVertexPosition;
        }
    `;

    const fsSource = `
        precision mediump float;
        uniform vec2 u_resolution;
        uniform float u_time;

        void main() {
            vec2 st = gl_FragCoord.xy / u_resolution.xy;
            float intensity = 0.03 + 0.02 * sin(u_time * 0.3 + (st.x - st.y) * 2.0) + 0.01 * cos(u_time * 0.1 + st.x * 5.0);
            float r = 0.01;
            float g = 0.03 + intensity * 0.4;
            float b = 0.06 + intensity;
            gl_FragColor = vec4(r, g, b, 1.0);
        }
    `;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);

    // Buffer for full screen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1.0,  1.0,
         1.0,  1.0,
        -1.0, -1.0,
         1.0, -1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const vertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(vertexPosition);
    gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);

    const timeLocation = gl.getUniformLocation(shaderProgram, 'u_time');
    const resolutionLocation = gl.getUniformLocation(shaderProgram, 'u_resolution');

    function render(time) {
        time *= 0.001; // convert to seconds
        gl.uniform1f(timeLocation, time);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

// --- WebRTC Simulation ---
function initWebRTC() {
    const btn = document.getElementById('start-webrtc-btn');
    const video = document.getElementById('p2p-video');
    const container = document.getElementById('webrtc-container');
    
    if(!btn || !video) return;

    btn.addEventListener('click', async () => {
        btn.textContent = 'Connecting to P2P Swarm...';
        btn.disabled = true;

        try {
            // In a real scenario, this would negotiate SDP and ICE candidates
            // For now, we simulate receiving a local media stream or external source
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            
            // Show the video element
            container.classList.remove('webrtc-hidden');
            video.style.display = 'block';
            video.srcObject = stream;
            
            btn.textContent = 'Connected to WebRTC Peer';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
            
        } catch (err) {
            console.error('Error accessing media devices for WebRTC simulation.', err);
            btn.textContent = 'Connection Failed (Camera Denied)';
            btn.disabled = false;
        }
    });
}

// Dummy data generation Helpers
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDateString(daysOffset, hoursOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    d.setHours(d.getHours() + hoursOffset, 0, 0, 0);
    return d.toISOString();
}

function formatTimeOnly(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('default', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

// Keep formatTime for full details if needed
function formatTime(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('default', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    }).format(date);
}

function formatTimeOnly(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('default', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function formatDayAndDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('default', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

function createBroadcasterCard(broadcaster) {
    return `
        <div class="broadcaster-card">
            <div class="b-region">${broadcaster.region}</div>
            <h4 class="b-name">${broadcaster.name}</h4>
            
            ${broadcaster.hasFreeTrial ? '<div class="free-trial-badge">✨ Free Trial Available</div>' : ''}
            
            <div class="b-actions">
                <a href="${broadcaster.watchLink === '#' ? 'javascript:void(0)' : broadcaster.watchLink}" ${broadcaster.watchLink === '#' ? `onclick="alert('Live Stream Integration Coming Soon!')"` : `target="_blank" rel="noopener noreferrer"`} class="btn btn-primary compact-btn">
                    Watch Stream
                </a>
            </div>
        </div>
    `;
}

// Generates an odds comparison list limiting to top 5 out of 10
function createOddsComparisonList(bookmakers, bestOdds) {
    if (!bookmakers || bookmakers.length === 0) return '<div class="no-odds">No odds available</div>';

    // Show top 5 bookmakers
    const topBookmakers = bookmakers.slice(0, 5);
    
    let listHtml = '<div class="odds-list">';
    
    topBookmakers.forEach(bookie => {
        const isBest = bestOdds && bestOdds.provider === bookie.title;
        const out = bookie.markets[0].outcomes[0];
        
        listHtml += `
            <a href="${bookie.link}" target="_blank" class="odds-row ${isBest ? 'best-odds-highlight' : ''}">
                <span class="odds-bookie">${bookie.title} ${isBest ? '<span class="best-badge">BEST</span>' : ''}</span>
                <span class="odds-value">${out.price} <small>(${out.displayStr.split(' ')[1]})</small></span>
            </a>
        `;
    });
    
    listHtml += '</div>';
    return listHtml;
}


// Detailed card for Today's events
function createTodayCard(match) {
    const timeFormatted = formatTimeOnly(match.commence_time);
    
    // Betting block HTML featuring top 5 bookies
    let bettingHtml = '';
    if (match.bookmakers && match.bookmakers.length > 0) {
        bettingHtml = `
            <div class="betting-panel">
                <div class="odds-header">
                    <span class="odds-title">Live API Odds Comparison</span>
                    <p class="odds-subtitle">Top Bookmakers</p>
                </div>
                <div class="odds-content">
                    ${createOddsComparisonList(match.bookmakers, match.best_odds)}
                    <a href="${match.best_odds.link}" target="_blank" class="btn btn-bet">Bet with Best Odds</a>
                </div>
            </div>
        `;
    }

    let analyticsHtml = '';
    if (match.analytics) {
        const isEvPositive = parseFloat(match.analytics.expected_value) > 0;
        analyticsHtml = `
            <div class="edge-predictor-panel">
                <div class="ep-header">QUANTITATIVE EDGE PREDICTOR</div>
                <div class="ep-grid">
                    <div class="ep-stat">
                        <span class="ep-label">Implied Prob</span>
                        <span class="ep-val">${match.analytics.implied_probability}%</span>
                    </div>
                    <div class="ep-stat">
                        <span class="ep-label">Model Prob</span>
                        <span class="ep-val highlight">${match.analytics.model_probability}%</span>
                    </div>
                    <div class="ep-stat">
                        <span class="ep-label">Edge</span>
                        <span class="ep-val ${isEvPositive ? 'text-green' : 'text-red'}">${isEvPositive ? '+' : ''}${match.analytics.edge_percent}%</span>
                    </div>
                    <div class="ep-stat">
                        <span class="ep-label">Exp. Value</span>
                        <span class="ep-val ${isEvPositive ? 'text-green' : 'text-red'}">${isEvPositive ? '+' : ''}${match.analytics.expected_value}%</span>
                    </div>
                </div>
                <div class="ep-stake ${isEvPositive ? 'stake-active' : ''}">
                    <span>Kelly Stake Rec:</span> <strong>${match.analytics.recommended_stake}</strong>
                </div>
            </div>
        `;
    }

    const isLive = match.status_state === 'in';
    const isPost = match.status_state === 'post';
    const hasScores = isLive || isPost;

    return `
        <div class="match-card today-card" data-sport="${match.sport_key ? match.sport_key.toLowerCase() : ''}">
            <div class="poster-bg" style="background-image: url('${getPosterForSport(match.sport_title)}')"></div>
            <div class="match-header">
                <div class="league-sport">
                    <span class="sport-tag">${match.sport_title}</span>
                    <div id="trend-${match.id}" class="trend-container" style="display: inline-block;"></div>
                </div>
                <div class="teams">
                    <span class="team">${match.home_team} ${hasScores && match.home_score ? `<span class="score-badge">${match.home_score}</span>` : ''}</span>
                    <span class="vs">${isLive ? '<span class="live-pulse">🔴 LIVE</span>' : isPost ? 'FT' : 'VS'}</span>
                    <span class="team">${match.away_team} ${hasScores && match.away_score ? `<span class="score-badge">${match.away_score}</span>` : ''}</span>
                </div>
                <div class="match-meta">
                    <span class="time ${isLive ? 'text-green' : ''}">${isLive || isPost ? match.status_detail : 'Today @ ' + timeFormatted}</span>
                </div>
            </div>
            
            <div class="action-section">
                ${analyticsHtml}
                <div class="broadcasters-section">
                    <div class="broadcaster-grid inline-grid">
                        ${match.broadcasters ? match.broadcasters.map(createBroadcasterCard).join('') : ''}
                    </div>
                </div>
                ${bettingHtml}
            </div>
        </div>
    `;
}

// Compact card for Weekly Forecast
function createForecastCard(event) {
    const dayDate = formatDayAndDate(event.commence_time);
    const timeFormatted = formatTimeOnly(event.commence_time);
    
    let bettingBadge = '';
    if (event.best_odds) {
        const evBadge = event.analytics && parseFloat(event.analytics.expected_value) > 0 ? 
            `<span class="ev-mini-badge text-green">+${event.analytics.expected_value}% EV</span>` : '';

        bettingBadge = `
            <div class="f-bet-group">
                ${evBadge}
                <a href="${event.best_odds.link}" target="_blank" class="f-bet-link" title="Best Odds provided by ${event.best_odds.provider}">
                    <span class="f-odds-label">Top Odds:</span>
                    <span class="f-odds">${event.best_odds.displayStr}</span>
                    <span class="f-bet-btn">Bet</span>
                </a>
            </div>
        `;
    }

    const isLive = event.status_state === 'in';
    const isPost = event.status_state === 'post';
    const hasScores = isLive || isPost;

    return `
        <div class="forecast-card" data-sport="${event.sport_key ? event.sport_key.toLowerCase() : ''}">
            <div class="poster-bg" style="background-image: url('${getPosterForSport(event.sport_title)}')"></div>
            <div class="f-date">
                <span class="f-day">${isLive ? '<span class="live-pulse">LIVE</span>' : dayDate}</span>
                <span class="f-time ${isLive ? 'text-green' : ''}">${isLive || isPost ? event.status_detail : timeFormatted}</span>
            </div>
            <div class="f-details">
                <div class="f-sport">${event.sport_title}</div>
                <div class="f-matchup">
                    ${event.home_team} ${hasScores ? `<strong>${event.home_score}</strong>` : ''} 
                    ${isLive ? 'vs' : isPost ? '-' : 'vs'} 
                    ${event.away_team} ${hasScores ? `<strong>${event.away_score}</strong>` : ''}
                </div>
                <div class="f-meta-row">
                    <div class="f-network">📺 ${event.broadcaster || 'TBD'}</div>
                    ${bettingBadge}
                </div>
            </div>
        </div>
    `;
}

async function fetchOddsData() {
    try {
        const hostname = window.location.hostname || 'localhost';
        const response = await fetch(`http://${hostname}:3000/api/odds`);
        if (!response.ok) {
            throw new Error(`API error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to fetch odds from local API:", error);
        return null;
    }
}

function createParlayCard(parlay) {
    const legsHtml = parlay.legs.map((leg, index) => `
        <div class="parlay-leg">
            <span class="leg-num">Leg ${index + 1}</span>
            <span class="leg-match">${leg.home_team} vs ${leg.away_team}</span>
            <span class="leg-odds">${leg.best_odds.displayStr}</span>
        </div>
    `).join('');

    return `
        <div class="forecast-card premium-card">
            <div class="poster-bg" style="background-image: url('${getPosterForSport('Premium Parlay')}')"></div>
            <div class="parlay-header">
                <span class="parlay-type">${parlay.type}</span>
                <span class="parlay-total-odds">Odds: ${parlay.total_odds}x</span>
            </div>
            <p class="parlay-desc">${parlay.description}</p>
            <div class="parlay-legs-container">
                ${legsHtml}
            </div>
            <button class="btn btn-bet premium-btn">Load Slip to API</button>
        </div>
    `;
}

async function fetchOddsHistory(id) {
    try {
        const hostname = window.location.hostname || 'localhost';
        const response = await fetch(`http://${hostname}:3000/api/odds/${id}/history`);
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch odds history:", error);
        return [];
    }
}

function updateLiveTicker(events) {
    const ticker = document.getElementById('live-ticker');
    if (!ticker) return;
    
    const liveEvents = events.filter(e => e.status_state === 'in' || e.status_state === 'post');
    if (liveEvents.length === 0) {
        ticker.innerHTML = '<div class="ticker-item"><span class="live-pulse">🔴</span> No live matches currently. Checking for updates...</div>';
        return;
    }

    let html = '';
    // Duplicate 3 times for a seamless marquee
    for (let i = 0; i < 3; i++) {
        liveEvents.forEach(match => {
            const hasScores = match.home_score !== '' && match.away_score !== '';
            const scoreStr = hasScores ? `<span class="ticker-score">${match.home_score} - ${match.away_score}</span>` : 'vs';
            const oddsStr = match.best_odds ? `<span class="ticker-odds">${match.best_odds.displayStr}</span>` : '';
            html += `<div class="ticker-item">
                        <span class="live-pulse">🔴</span>
                        <span class="ticker-match">${match.home_team} ${scoreStr} ${match.away_team}</span>
                        ${oddsStr}
                     </div>`;
        });
    }
    ticker.innerHTML = html;
}

async function renderDashboard() {
    const todayContainer = document.getElementById('today-container');
    const forecastContainer = document.getElementById('forecast-container');
    const parlaysContainer = document.getElementById('parlays-container');
    
    if (todayContainer) todayContainer.innerHTML = '<div class="loading-state">Fetching Live API Data...</div>';
    if (forecastContainer) forecastContainer.innerHTML = '<div class="loading-state">Syncing Odds...</div>';
    if (parlaysContainer) parlaysContainer.innerHTML = '<div class="loading-state">Computing AI Parlays...</div>';

    const data = await fetchOddsData();
    
    if (!data) {
        if (todayContainer) todayContainer.innerHTML = '<div class="error-state">Failed to connect to Local API Server. Did you start node server.js?</div>';
        return;
    }

    if (data && data.today) {
        updateLiveTicker(data.today);
    }

    if (todayContainer) {
        if (data.today && data.today.length > 0) {
            todayContainer.innerHTML = data.today.map(createTodayCard).join('');
            
            // Fetch and inject odds trends
            data.today.forEach(async match => {
                const history = await fetchOddsHistory(match.id);
                const trendEl = document.getElementById(`trend-${match.id}`);
                if (trendEl && history && history.length > 1) {
                    const first = history[0].expected_value;
                    const last = history[history.length - 1].expected_value;
                    const diff = last - first;
                    let trendClass, icon;
                    if (diff > 0.5) { trendClass = 'trend-up'; icon = '↗️'; }
                    else if (diff < -0.5) { trendClass = 'trend-down'; icon = '↘️'; }
                    else { trendClass = 'trend-flat'; icon = '➡️'; }
                    trendEl.innerHTML = `<span class="odds-trend ${trendClass}">${icon} EV ${diff > 0 ? '+' : ''}${diff.toFixed(1)}%</span>`;
                } else if (trendEl) {
                     trendEl.innerHTML = `<span class="odds-trend trend-flat">➡️ EV Stable</span>`;
                }
            });
        } else {
            todayContainer.innerHTML = `
                <div class="match-card today-card">
                    <div class="poster-bg" style="background-image: url('${PREMIUM_POSTERS.soccer}')"></div>
                    <div class="match-header">
                        <div class="teams"><span class="team">Global Soccer Hub</span></div>
                        <div class="match-meta"><span class="time">Awaiting Live API Events</span></div>
                    </div>
                </div>
                <div class="match-card today-card">
                    <div class="poster-bg" style="background-image: url('${PREMIUM_POSTERS.basketball}')"></div>
                    <div class="match-header">
                        <div class="teams"><span class="team">Global Hoops Hub</span></div>
                        <div class="match-meta"><span class="time">Awaiting Live API Events</span></div>
                    </div>
                </div>
            `;
        }
    }

    if (forecastContainer) {
        if (data.forecast && data.forecast.length > 0) {
            forecastContainer.innerHTML = data.forecast.map(createForecastCard).join('');
        } else {
            forecastContainer.innerHTML = '<div class="no-odds">Synchronizing Weekly Schedule...</div>';
        }
    }

    if (parlaysContainer && data.parlays) {
        if (data.parlays.length > 0) {
            parlaysContainer.innerHTML = data.parlays.map(createParlayCard).join('');
        } else {
            parlaysContainer.innerHTML = `
                <div class="forecast-card premium-card">
                    <div class="poster-bg" style="background-image: url('${PREMIUM_POSTERS.soccer}')"></div>
                    <div class="parlay-header">
                        <span class="parlay-type">Premium AI Analysis Loading</span>
                    </div>
                    <p class="parlay-desc">Awaiting sufficient live market data for Quantitative Edge Predictions.</p>
                </div>
            `;
        }
    }
}

function initBetVerifier() {
    const btn = document.getElementById('btn-verify-bet');
    const resultsContainer = document.getElementById('calc-results');
    
    if (!btn || !resultsContainer) return;

    btn.addEventListener('click', async () => {
        const odds = document.getElementById('calc-odds').value;
        const prob = document.getElementById('calc-prob').value;

        if (!odds || !prob) {
            alert('Please enter both odds and probability.');
            return;
        }

        btn.textContent = 'Analyzing...';
        btn.disabled = true;

        try {
            const hostname = window.location.hostname || 'localhost';
            const response = await fetch(`http://${hostname}:3000/api/verify-bet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decimalOdds: odds, userProb: prob })
            });

            const data = await response.json();
            
            if (response.ok) {
                resultsContainer.classList.remove('hidden');
                
                const statusClass = data.isSafe ? 'text-green' : 'text-red';
                
                resultsContainer.innerHTML = `
                    <div class="verdict-banner ${data.isSafe ? 'verdict-safe' : 'verdict-danger'}">
                        <strong>VERDICT:</strong> ${data.verdict}
                    </div>
                    <p class="verdict-msg">${data.message}</p>
                    <div class="ep-grid calc-grid">
                        <div class="ep-stat">
                            <span class="ep-label">Implied Prob</span>
                            <span class="ep-val">${data.implied_probability}</span>
                        </div>
                        <div class="ep-stat">
                            <span class="ep-label">Model Prob</span>
                            <span class="ep-val highlight">${data.model_probability}</span>
                        </div>
                        <div class="ep-stat">
                            <span class="ep-label">Edge</span>
                            <span class="ep-val ${statusClass}">${data.edge_percent}</span>
                        </div>
                        <div class="ep-stat">
                            <span class="ep-label">Exp. Value</span>
                            <span class="ep-val ${statusClass}">${data.expected_value}</span>
                        </div>
                    </div>
                    <div class="ep-stake ${data.isSafe ? 'stake-active' : ''}">
                        <span>Kelly Stake Rec:</span> <strong>${data.recommended_stake}</strong>
                    </div>
                `;
            } else {
                alert(data.error || 'Verification failed.');
            }
        } catch (error) {
            console.error('Error verifying bet:', error);
            alert('Could not connect to verification server.');
        } finally {
            btn.textContent = 'Analyze Bet';
            btn.disabled = false;
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setInterval(fetchOddsData, 5000); // 5 sec heartbeat
    setInterval(fetchEPLSync, 3000);  // Sync EPL fast 
    setInterval(fetchAndRenderLedger, 4000); // Stream Execution Fill Logs
    
    initWebGL();
    initWebRTC();
    initBetVerifier();
    initSidebarRouting();
    renderDashboard();
    initEphemeralUI();
    setupPortfolioSimulator();
});

function initSidebarRouting() {
    const navItems = document.querySelectorAll('.sidebar-menu .menu-item');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active classes
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const targetId = item.getAttribute('data-view');
            
            // Hide all views, display target
            viewSections.forEach(view => {
                view.classList.remove('active-view');
            });
            
            const targetView = document.getElementById(targetId);
            if(targetView) targetView.classList.add('active-view');
        });
    });
}

// --- Dynamic Ledger Hook ---
async function fetchAndRenderLedger() {
    const tbody = document.getElementById('global-ledger-body');
    if (!tbody) return;
    
    try {
        const hostname = window.location.hostname || 'localhost';
        const res = await fetch(`http://${hostname}:3000/api/ledger`);
        if (!res.ok) throw new Error("Bad response");
        const data = await res.json();
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align:center; color:var(--text-secondary)">No execution ledgers found in SQLite tables.</td></tr>';
            return;
        }

        let html = '';
        data.forEach(row => {
            const date = new Date(row.timestamp).toLocaleString();
            const edgeClass = row.expected_value > 0 ? 'text-green' : 'text-red';
            html += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 1rem; color:var(--text-secondary);">${date}</td>
                    <td style="padding: 1rem; font-weight: bold;">${row.home_team} vs ${row.away_team}</td>
                    <td style="padding: 1rem; color:#fbbf24; font-family:monospace; font-weight:bold;">${row.decimal_odds.toFixed(2)}</td>
                    <td style="padding: 1rem; color:var(--accent);">${(row.p_cal * 100).toFixed(1)}%</td>
                    <td style="padding: 1rem; font-weight:bold;" class="${edgeClass}">${row.expected_value > 0 ? '+' : ''}${(row.expected_value * 100).toFixed(1)}% EV</td>
                    <td style="padding: 1rem; font-family:monospace;">${row.stake_percent.toFixed(2)}%</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (e) {
        console.error("Ledger fetch error:", e);
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align:center; color:var(--danger)">Error connecting to SQLite Ledger Service.</td></tr>';
    }
}

// --- Python Python Execution Engine Trigger ---
async function executeBacktestNode(btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ INITIALIZING DATAFRAMES...';
    btn.disabled = true;
    
    try {
        const hostname = window.location.hostname || 'localhost';
        const res = await fetch(`http://${hostname}:3000/api/execute-backtest`, { method: 'POST' });
        const data = await res.json();
        
        if (res.ok) {
            btn.innerHTML = '✅ BACKTEST PIPELINE EXECUTED';
            Object.assign(btn.style, { background: 'var(--success)', color: '#000', borderColor: 'var(--success)' });
            setTimeout(fetchAndRenderLedger, 500);
        } else {
            btn.innerHTML = '❌ BACKTEST FAILED: ' + data.message;
            Object.assign(btn.style, { background: 'var(--danger)', color: '#fff' });
        }
    } catch (e) {
        console.error("Backtest Error:", e);
        btn.innerHTML = '❌ NODE PIPELINE TIMEOUT';
        Object.assign(btn.style, { background: 'var(--danger)', color: '#fff' });
    }
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
    }, 6000);
}

async function fetchEPLSync() {
    const container = document.getElementById('epl-container');
    if (!container) return;

    try {
        const hostname = window.location.hostname || 'localhost';
        const res = await fetch(`http://${hostname}:3000/api/epl-matches`);
        if (!res.ok) return;
        const data = await res.json();
        const matches = data.fixtures || [];

        if (matches.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">No EPL matches found in database.</div>';
            return;
        }

        let html = `
            <div style="overflow-x: auto; background: rgba(0,0,0,0.4); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                    <thead style="background: rgba(255,255,255,0.05);">
                        <tr>
                            <th style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Fixture</th>
                            <th style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Latest Odds</th>
                            <th style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Model Fair Prob</th>
                            <th style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Model EV</th>
                            <th style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Rec. Stake</th>
                            <th style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: right;">Micro-Sim</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        matches.forEach(m => {
            const date = new Date(m.utc_date).toLocaleString();
            const rawOdds = m.best_home_odds || 0;
            const homeOddsStr = rawOdds > 0 ? rawOdds.toFixed(2) : 'Awaiting';
            const p_home_cal = 0.52; 
            
            let evString = '-';
            let evColor = 'var(--text-secondary)';
            let recStake = 'AVOID';
            let rowHighlight = '';
            
            if (rawOdds > 0) {
                const ev = (p_home_cal * rawOdds) - 1;
                evString = `+${(ev*100).toFixed(1)}% Edge`;
                if (ev > 0.05) {
                    evColor = 'var(--success)';
                    recStake = '0.25x Kelly';
                    rowHighlight = 'background: rgba(16, 185, 129, 0.05);';
                } else if (ev > 0) {
                    evColor = '#fbbf24';
                }
            }

            const escapedHome = m.home_team.replace(/'/g, "\\'");
            const escapedAway = m.away_team.replace(/'/g, "\\'");

            html += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; ${rowHighlight}" 
                    onmouseover="this.style.background='rgba(255,255,255,0.1)'" 
                    onmouseout="this.style.background='${rowHighlight}'">
                    
                    <td style="padding: 1rem; cursor: pointer;" onclick="openMatchModal(${m.match_id}, '${escapedHome}', '${escapedAway}', '${m.status}', ${p_home_cal}, ${rawOdds})">
                        <div style="font-weight: 700;">${m.home_team} v ${m.away_team}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${date} | ${m.status}</div>
                    </td>
                    <td style="padding: 1rem; color: #fbbf24; font-weight:bold;">${homeOddsStr} <span style="font-size:0.75rem; font-weight:normal; color:var(--text-secondary);">(DK)</span></td>
                    <td style="padding: 1rem; color: var(--accent); font-weight:bold;">${(p_home_cal*100).toFixed(1)}%</td>
                    <td style="padding: 1rem; color: ${evColor}; font-weight:bold;">${evString}</td>
                    <td style="padding: 1rem; font-family: monospace;">${recStake}</td>
                    <td style="padding: 1rem; text-align: right;">
                        <button class="btn btn-secondary" style="padding: 0.4rem 0.6rem; font-size: 0.8rem; border-radius: 4px;" onclick="openManagerSandbox(${m.home_team_id || 1}, ${m.away_team_id || 2}, '${escapedHome}', '${escapedAway}')">⚙️ Sandbox</button>
                    </td>
                </tr>
            `;
        });
        
        html += `</tbody></table></div>`;
        container.innerHTML = html;
        
    } catch (e) {
        console.error("EPL sync error", e);
    }
}

async function openMatchModal(match_id, home, away, status, p_home_cal, best_odds) {
    const modal = document.getElementById('match-modal');
    if (!modal) return;
    
    document.getElementById('diag-teams').textContent = `${home} vs ${away} (ID: ${match_id})`;
    document.getElementById('diag-status').textContent = status;
    
    if (best_odds > 0) {
        const ev = (p_home_cal * best_odds) - 1;
        document.getElementById('diag-clv').textContent = ev > 0 ? `+${(ev*100).toFixed(1)}% Expected Edge` : 'No Edge';
        document.getElementById('diag-clv').style.color = ev > 0 ? 'var(--success)' : 'var(--text-secondary)';
    } else {
        document.getElementById('diag-clv').textContent = 'Waiting for odds...';
        document.getElementById('diag-clv').style.color = 'var(--text-secondary)';
    }

    modal.style.display = 'flex';
    
    const chartContainer = document.getElementById('diag-time-series-list');
    chartContainer.innerHTML = '<div>Fetching history pulses...</div>';

    try {
        const hostname = window.location.hostname || 'localhost';
        const res = await fetch(`http://${hostname}:3000/api/odds-history/${match_id}`);
        if(res.ok) {
            const history = await res.json();
            if(history.length === 0) {
                chartContainer.innerHTML = '<div style="color:var(--text-secondary)">No historical ticks recorded yet.</div>';
                return;
            }
            
            let html = '<div style="display:flex; justify-content:space-between; margin-bottom:0.8rem; padding-bottom:0.5rem; border-bottom:1px solid rgba(255,255,255,0.1); font-weight:bold;"><span>Pulse Time</span><span>Book</span><span>Odds</span></div>';
            history.forEach(tick => {
                const date = new Date(tick.timestamp).toLocaleTimeString();
                html += `<div style="display:flex; justify-content:space-between; padding:0.4rem 0; font-family:monospace; border-bottom:1px dashed rgba(255,255,255,0.05);">
                    <span style="color:var(--text-secondary)">${date}</span>
                    <span style="color:#fbbf24">DraftKings (Soft)</span>
                    <span style="color:var(--accent); font-weight:bold;">${tick.decimal_odds.toFixed(2)}</span>
                </div>`;
            });
            chartContainer.innerHTML = html;
        } else {
            chartContainer.innerHTML = '<div style="color:var(--danger)">Failed to load data.</div>';
        }
    } catch(e) {
        chartContainer.innerHTML = '<div style="color:var(--danger)">Connection error.</div>';
    }
}

function setupPortfolioSimulator() {
    // Bind to the new sidebar button ID
    const btn = document.getElementById('sidebar-btn-portfolio');
    const modal = document.getElementById('portfolio-modal');
    const closeBtn = document.getElementById('close-portfolio');

    if (!btn || !modal) return;

    // Attach Monte Carlo Inputs
    const bankrollSlider = document.getElementById('sim-bankroll');
    const kellySlider = document.getElementById('sim-kelly');
    const evSlider = document.getElementById('sim-ev-thresh');
    
    // Create an update function with debouncing for smooth sliding
    let updateTimeout = null;
    const updateSim = async () => {
        if(bankrollSlider) document.getElementById('sim-bankroll-val').textContent = `$${parseInt(bankrollSlider.value).toLocaleString()}`;
        if(kellySlider) document.getElementById('sim-kelly-val').textContent = `${parseFloat(kellySlider.value).toFixed(2)}x`;
        if(evSlider) document.getElementById('sim-ev-thresh-val').textContent = `${parseFloat(evSlider.value).toFixed(1)}%`;
        
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(async () => {
            try {
                const hostname = window.location.hostname || 'localhost';
                const req = await fetch(`http://${hostname}:3000/api/simulate-bankroll`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        startingBankroll: bankrollSlider ? bankrollSlider.value : 10000,
                        kellyMultiplier: kellySlider ? kellySlider.value : 0.25,
                        evThreshold: evSlider ? evSlider.value : 2.0
                    })
                });
                if (req.ok) {
                    const data = await req.json();
                    const cagrEl = document.getElementById('mc-cagr');
                    cagrEl.textContent = `${data.cagr > 0 ? '+' : ''}${data.cagr.toFixed(1)}%`;
                    cagrEl.style.color = data.cagr > 0 ? 'var(--success)' : 'var(--danger)';
                    
                    document.getElementById('mc-drawdown').textContent = `-${(data.max_drawdown * 100).toFixed(1)}%`;
                    
                    const ruinEl = document.getElementById('mc-ruin');
                    ruinEl.textContent = data.isRuined ? 'Yes' : 'No';
                    ruinEl.style.color = data.isRuined ? 'var(--danger)' : 'var(--success)';

                    if (data.raw_returns && data.raw_returns.length > 0) {
                        const simReturns = data.raw_returns;
                        const histBins = 20;
                        const minReturn = Math.min(...simReturns);
                        const maxReturn = Math.max(...simReturns);
                        const binSize = ((maxReturn - minReturn) / histBins) || 0.01;
                        
                        const bins = new Array(histBins).fill(0);
                        const binLabels = [];
                        for (let i = 0; i < histBins; i++) {
                            binLabels.push(`${((minReturn + (i * binSize)) * 100).toFixed(1)}%`);
                        }
                        
                        simReturns.forEach(ret => {
                            let index = Math.floor((ret - minReturn) / binSize);
                            if (index >= histBins) index = histBins - 1;
                            bins[index]++;
                        });

                        if (window.mcHistChart) window.mcHistChart.destroy();
                        const histCtx = document.getElementById('mc-histogram').getContext('2d');
                        window.mcHistChart = new Chart(histCtx, {
                            type: 'bar',
                            data: {
                                labels: binLabels,
                                datasets: [{
                                    label: 'Frequency',
                                    data: bins,
                                    backgroundColor: 'rgba(16, 185, 129, 0.5)',
                                    borderColor: 'rgba(16, 185, 129, 1)',
                                    borderWidth: 1
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                    title: { display: true, text: 'Return Distribution per Bet', color: '#888' }
                                },
                                scales: {
                                    y: { display: false, grid: { display: false } },
                                    x: { ticks: { color: 'rgba(255,255,255,0.5)', maxTicksLimit: 5 }, grid: { display: false } }
                                }
                            }
                        });
                    }
                }
            } catch(e) { console.error("Sim error", e); }
        }, 100);
    };
    
    if(bankrollSlider) bankrollSlider.addEventListener('input', updateSim);
    if(kellySlider) kellySlider.addEventListener('input', updateSim);
    if(evSlider) evSlider.addEventListener('input', updateSim);

    btn.addEventListener('click', async () => {
        modal.style.display = 'flex';
        updateSim(); // Run initial Monte Carlo simulation
        
        const tbody = document.getElementById('ledger-body');
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 1rem; text-align: center;">Fetching Ledger...</td></tr>';
        
        try {
            const hostname = window.location.hostname || 'localhost';
            const req = await fetch(`http://${hostname}:3000/api/ledger`);
            if (req.ok) {
                const ledger = await req.json();
                populateLedger(ledger);
            } else {
                tbody.innerHTML = '<tr><td colspan="6" style="padding: 1rem; text-align: center; color: red;">Failed to fetch ledger.</td></tr>';
            }
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding: 1rem; text-align: center; color: red;">Error connecting to DB.</td></tr>';
        }
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

function populateLedger(ledger) {
    const tbody = document.getElementById('ledger-body');
    const simBets = document.getElementById('sim-bets');
    const simEv = document.getElementById('sim-ev');
    const simClv = document.getElementById('sim-clv');

    if (ledger.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 1rem; text-align: center; color: var(--text-secondary);">No bets recorded in SQLite ledger yet. Wait for a live event to trigger an edge.</td></tr>';
        return;
    }

    let totalEv = 0;
    let totalClvDiff = 0;
    let html = '';

    ledger.forEach(bet => {
        const d = new Date(bet.timestamp);
        const timeStr = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
        
        let tierColor = '#fff';
        if (bet.strategy_tier === "HIGH_CONVICTION") tierColor = 'var(--success)';
        else if (bet.strategy_tier === "SAFE_TO_PROCEED") tierColor = '#fbbf24';

        const evPct = (bet.expected_value * 100).toFixed(2);
        const clvStr = bet.closing_line_value ? bet.closing_line_value.toFixed(2) : '-';

        totalEv += bet.expected_value;
        if (bet.closing_line_value) {
            totalClvDiff += (bet.decimal_odds - bet.closing_line_value);
        }

        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem;">
                <td style="padding: 1rem; color: var(--text-secondary);">${timeStr}</td>
                <td style="padding: 1rem; font-weight: 500;">
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${bet.sport}</div>
                    ${bet.home_team} vs ${bet.away_team}
                </td>
                <td style="padding: 1rem; font-weight: 700; color: ${tierColor};">${bet.strategy_tier.replace(/_/g, ' ')}</td>
                <td style="padding: 1rem;">
                    <div>Obs: <strong style="color: #fbbf24;">${bet.decimal_odds.toFixed(2)}</strong></div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">CLV: ${clvStr}</div>
                </td>
                <td style="padding: 1rem; color: var(--success); font-weight: bold;">+${evPct}%</td>
                <td style="padding: 1rem; font-family: monospace;">${bet.stake_percent.toFixed(2)}%</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    simBets.textContent = ledger.length;
    simEv.textContent = `+${((totalEv / ledger.length) * 100).toFixed(2)}%`;
    simClv.textContent = `+${(totalClvDiff / ledger.length).toFixed(3)} avg dist`;
}

// --- SOTA EPHEMERAL UI ENGINE ---
const PREMIUM_POSTERS = {
    soccer: 'assets/hero_soccer.png',
    basketball: 'assets/hero_basketball.png',
    football: 'https://images.unsplash.com/photo-1611004639943-41bb878fce0a?q=80&w=800&auto=format&fit=crop',
    hockey: 'https://images.unsplash.com/photo-1515515286202-69024f2b1d6d?q=80&w=800&auto=format&fit=crop',
    baseball: 'https://images.unsplash.com/photo-1508344928928-7137b29de2f6?q=80&w=800&auto=format&fit=crop',
    default: 'assets/hero_soccer.png'
};

function getPosterForSport(sportName) {
    if (!sportName) return PREMIUM_POSTERS.default;
    const s = sportName.toLowerCase();
    if (s.includes('soccer') || s.includes('premier') || s.includes('liga') || s.includes('champions')) return PREMIUM_POSTERS.soccer;
    if (s.includes('nba') || s.includes('basket')) return PREMIUM_POSTERS.basketball;
    if (s.includes('nfl') || s.includes('football')) return PREMIUM_POSTERS.football;
    if (s.includes('nhl') || s.includes('hockey')) return PREMIUM_POSTERS.hockey;
    if (s.includes('mlb') || s.includes('base')) return PREMIUM_POSTERS.baseball;
    return PREMIUM_POSTERS.default;
}

let recognition;
let isListening = false;
let synthesis = window.speechSynthesis;

function initEphemeralUI() {
    const orb = document.getElementById('intent-orb');
    const input = document.getElementById('intent-input');
    
    // Setup Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            orb.classList.add('listening');
            input.placeholder = "Listening for intent...";
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            input.value = transcript;
            processIntent(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            stopListening();
        };

        recognition.onend = () => {
            stopListening();
        };
    } else {
        input.placeholder = "Speech unsupported. Type intent here...";
    }

    // Input events
    orb.addEventListener('click', toggleListening);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            processIntent(input.value);
            input.blur();
        }
    });
}

function speakResponse(text) {
    if (!synthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.9;
    utterance.rate = 1.0;
    // synthesis.speak(utterance); // Optional
}

function toggleListening() {
    const input = document.getElementById('intent-input');
    input.classList.toggle('active');
    if (input.classList.contains('active')) input.focus();
    
    if (recognition) {
        if (isListening) {
            recognition.stop();
        } else {
            input.value = "";
            recognition.start();
        }
    }
}

function stopListening() {
    isListening = false;
    const orb = document.getElementById('intent-orb');
    const input = document.getElementById('intent-input');
    orb.classList.remove('listening');
    input.placeholder = "Type intent or tap orb to speak...";
}

function hideAllEphemeral() {
    document.querySelectorAll('.ephemeral-active').forEach(el => {
        el.classList.remove('ephemeral-active');
        el.classList.add('ephemeral-hidden');
    });
}

function showEphemeral(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('ephemeral-hidden');
        el.classList.add('ephemeral-active');
    }
}

function processIntent(text) {
    if (!text) return;
    const intent = text.toLowerCase();
    
    hideAllEphemeral();
    
    let matched = false;

    if (intent.includes('premium') || intent.includes('parlay') || intent.includes('ev') || intent.includes('hedge') || intent.includes('best return')) {
        showEphemeral('premium-picks');
        matched = true;
    }
    if (intent.includes('today') || intent.includes('live') || intent.includes('now') || intent.includes('currently')) {
        showEphemeral('today-events');
        matched = true;
    }
    if (intent.includes('forecast') || intent.includes('week') || intent.includes('upcoming') || intent.includes('future')) {
        showEphemeral('weekly-forecast');
        matched = true;
    }
    if (intent.includes('verify') || intent.includes('calculator') || intent.includes('custom bet') || intent.includes('math')) {
        showEphemeral('custom-bet-verifier');
        matched = true;
    }
    if (intent.includes('everything') || intent.includes('all')) {
        showEphemeral('premium-picks');
        showEphemeral('today-events');
        showEphemeral('weekly-forecast');
        showEphemeral('custom-bet-verifier');
        matched = true;
    }
    
    // SOTA Magic Element Filtering
    if (!matched) {
        // Fallback: Show everything and filter by elements
        showEphemeral('today-events');
        showEphemeral('weekly-forecast');
        showEphemeral('premium-picks');
        
        const cards = document.querySelectorAll('.match-card, .forecast-card');
        cards.forEach(card => {
            const dataSport = card.getAttribute('data-sport') || '';
            const textContent = card.textContent.toLowerCase();
            
            let isMatch = false;
            if (intent === 'cup') {
                isMatch = textContent.includes('cup') || textContent.includes('champions league') || textContent.includes('europa league');
            } else if (textContent.includes(intent) || dataSport.includes(intent.replace('football', 'american football'))) {
                isMatch = true;
            } else if (intent === 'football' && dataSport.includes('american football')) {
                isMatch = true;
            } else if (intent === 'football' && dataSport.includes('soccer') && window.location.hostname.includes('uk')) {
                isMatch = true;
            } else if (intent === 'soccer' && dataSport.includes('soccer')) {
                isMatch = true;
            } else if (dataSport.includes(intent)) {
                isMatch = true;
            }
            
            card.style.display = isMatch ? '' : 'none';
        });
    } else {
        // Reset all displays if a main section was triggered
        const cards = document.querySelectorAll('.match-card, .forecast-card');
        cards.forEach(card => card.style.display = '');
    }
    
    // Clear input after a short delay
    setTimeout(() => {
        document.getElementById('intent-input').classList.remove('active');
    }, 2000);
}

window.handleNavClick = function(intent, btnElement) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) {
        btnElement.classList.add('active');
    }
    processIntent(intent);
};

// ==========================================
// PWA Custom Installation Logic
// ==========================================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    
    // Update UI notify the user they can install the PWA
    const installBtn = document.getElementById('btn-install-pwa');
    if(installBtn) {
        installBtn.style.display = 'block';
        
        installBtn.onclick = async () => {
            // Hide the app provided install promotion
            installBtn.style.display = 'none';
            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            // We've used the prompt, and can't use it again, throw it away
            deferredPrompt = null;
        };
    }
});

window.addEventListener('appinstalled', () => {
    // Hide the app-provided install promotion if visible
    const installBtn = document.getElementById('btn-install-pwa');
    if(installBtn) installBtn.style.display = 'none';
    
    // Clear the deferredPrompt so it can be garbage collected
    deferredPrompt = null;
    console.log('Match Day SDK PWA was successfully installed');
});

// ==========================================
// UTILITY BELT LOGIC
// ==========================================

// 1. World Clocks
function updateWorldClocks() {
    const clockEl = document.getElementById('world-clock');
    if (!clockEl) return;
    
    const now = new Date();
    const options = { hour: '2-digit', minute: '2-digit', hour12: false };
    
    const local = now.toLocaleTimeString([], options);
    const london = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', ...options }).format(now);
    const ny = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', ...options }).format(now);
    const tokyo = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', ...options }).format(now);

    clockEl.innerHTML = `
        <span class="world-clock"><b>LOC</b> ${local}</span>
        <span class="world-clock"><b>LON</b> ${london}</span>
        <span class="world-clock"><b>NYC</b> ${ny}</span>
        <span class="world-clock"><b>TYO</b> ${tokyo}</span>
    `;
}
setInterval(updateWorldClocks, 1000);
updateWorldClocks();

// 2. Weather Engine
async function fetchLocalWeather() {
    const weatherEl = document.getElementById('weather-widget');
    if (!weatherEl) return;

    try {
        // Defaulting to universal coords for global dashboard feel (London base)
        let lat = 51.5074;
        let lon = -0.1278;
        
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`);
        const data = await res.json();
        const maxT = data.daily.temperature_2m_max[0];
        const minT = data.daily.temperature_2m_min[0];
        const rainP = data.daily.precipitation_probability_max[0];
        
        weatherEl.innerHTML = `🌤️ ${maxT}°C / ${minT}°C | 💧${rainP}%`;
    } catch (e) {
        weatherEl.innerHTML = `🌤️ Weather Unavailable`;
    }
}
fetchLocalWeather();

// 3. Currency Calculator
let exchangeRates = {};
async function fetchExchangeRates() {
    try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        exchangeRates = data.rates;
        calculateCurrency();
    } catch(e) {
        console.error("Exchange API failed");
    }
}

function calculateCurrency() {
    const inputEl = document.getElementById('curr-input');
    const fromEl = document.getElementById('curr-from');
    const toEl = document.getElementById('curr-to');
    const resultEl = document.getElementById('curr-result');

    if (!inputEl || !resultEl) return;

    const input = parseFloat(inputEl.value);
    const from = fromEl.value;
    const to = toEl.value;

    if (isNaN(input) || Object.keys(exchangeRates).length === 0) {
        resultEl.innerText = '--.--';
        return;
    }

    const amountInUSD = input / exchangeRates[from];
    const amountInTarget = amountInUSD * exchangeRates[to];
    
    resultEl.innerText = amountInTarget.toFixed(2);
}

// Bind events after brief delay ensuring DOM is ready
setTimeout(() => {
    document.getElementById('curr-input')?.addEventListener('input', calculateCurrency);
    document.getElementById('curr-from')?.addEventListener('change', calculateCurrency);
    document.getElementById('curr-to')?.addEventListener('change', calculateCurrency);
    fetchExchangeRates();
}, 200);

// --- PHASE 11: MANAGER SANDBOX (PLAYER LEVEL SIMULATION) ---
let currentSandboxHomeRoster = [];
let currentSandboxAwayRoster = [];

async function openManagerSandbox(homeTeamId, awayTeamId, homeName, awayName) {
    document.getElementById('sandbox-home-name').textContent = homeName + ' (Home)';
    document.getElementById('sandbox-away-name').textContent = awayName + ' (Away)';
    document.getElementById('sandbox-home-id').value = homeTeamId;
    document.getElementById('sandbox-away-id').value = awayTeamId;
    
    document.getElementById('sandbox-baseline').textContent = 'Loading...';
    document.getElementById('sandbox-actual').textContent = 'Loading...';
    document.getElementById('sandbox-new-odds').textContent = '--';
    document.getElementById('sandbox-delta-val').textContent = '';
    
    document.getElementById('sandbox-modal').style.display = 'flex';
    
    try {
        const hostname = window.location.hostname || 'localhost';
        const [homeRes, awayRes] = await Promise.all([
            fetch(`http://${hostname}:3000/api/teams/${homeTeamId}/players`),
            fetch(`http://${hostname}:3000/api/teams/${awayTeamId}/players`)
        ]);
        
        currentSandboxHomeRoster = await homeRes.json();
        currentSandboxAwayRoster = await awayRes.json();
        
        renderRoster('sandbox-home-roster', currentSandboxHomeRoster, true);
        renderRoster('sandbox-away-roster', currentSandboxAwayRoster, false);
        
        triggerSandboxSimulation();
    } catch(e) {
        console.error('Error loading Sandbox rosters:', e);
    }
}

function renderRoster(containerId, players, isHome) {
    const container = document.getElementById(containerId);
    if (!players || players.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding: 2rem;">No player data available.</div>';
        return;
    }
    
    let html = '';
    players.forEach((p, index) => {
        const isStarting = index < 11;
        const color = isStarting ? (isHome ? 'var(--accent)' : '#ef4444') : 'var(--text-secondary)';
        const accentBg = isStarting ? (isHome ? 'rgba(0, 240, 255, 0.1)' : 'rgba(239, 68, 68, 0.1)') : 'rgba(255,255,255,0.02)';
        
        let statusBadge = '';
        if (p.status !== 'Active') {
            statusBadge = `<span style="background: rgba(255,0,0,0.2); color: #ff6b6b; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 8px;">${p.status}</span>`;
        }
        
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 0.8rem; background: ${accentBg}; border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; transition: all 0.2s;">
                <div style="display:flex; align-items:center; gap: 10px;">
                    <input type="checkbox" id="chk-${p.player_id}" class="roster-chk-${isHome ? 'home' : 'away'}" value="${p.player_id}" ${isStarting ? 'checked' : ''} style="width: 18px; height: 18px; cursor:pointer;" onchange="triggerSandboxSimulation()">
                    <div>
                        <div style="font-weight: 600; color: #fff;">${p.name} ${statusBadge}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${p.position} | WAR: <span style="color: ${color}; font-weight:bold;">${p.engine_rating.toFixed(1)}</span></div>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function triggerSandboxSimulation() {
    const btn = document.getElementById('btn-recalculate-sandbox');
    if(btn) {
        btn.innerHTML = '⏳ CALCULATING WAR...';
        btn.disabled = true;
    }
    
    const homeTeamId = document.getElementById('sandbox-home-id').value;
    const awayTeamId = document.getElementById('sandbox-away-id').value;
    
    const homeStartingIds = Array.from(document.querySelectorAll('.roster-chk-home:checked')).map(cb => cb.value);
    const awayStartingIds = Array.from(document.querySelectorAll('.roster-chk-away:checked')).map(cb => cb.value);
    
    try {
        const hostname = window.location.hostname || 'localhost';
        const res = await fetch(`http://${hostname}:3000/api/simulate-lineup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ homeTeamId, awayTeamId, homeStartingIds, awayStartingIds })
        });
        
        const data = await res.json();
        
        document.getElementById('sandbox-baseline').innerHTML = `<span style="color:var(--accent)">H: ${data.baseline.homeExpectedValue.toFixed(1)}</span><br><span style="color:#ef4444">A: ${data.baseline.awayExpectedValue.toFixed(1)}</span>`;
        document.getElementById('sandbox-actual').innerHTML = `<span style="color:var(--accent)">H: ${data.custom.homeActualValue.toFixed(1)}</span><br><span style="color:#ef4444">A: ${data.custom.awayActualValue.toFixed(1)}</span>`;
        
        const pHome = (data.probabilities.p_home_cal * 100).toFixed(1);
        document.getElementById('sandbox-new-odds').textContent = `${pHome}% WIN`;
        
        const deltaEdge = data.deltas.homeDelta - data.deltas.awayDelta;
        const deltaColor = deltaEdge > 0 ? 'var(--success)' : (deltaEdge < 0 ? 'var(--danger)' : 'var(--text-secondary)');
        const deltaText = deltaEdge > 0 ? '+' + deltaEdge.toFixed(1) : deltaEdge.toFixed(1);
        
        document.getElementById('sandbox-delta-val').innerHTML = `Net Positional Delta: <span style="color:${deltaColor}">${deltaText} WAR</span>`;
        
    } catch(e) {
        console.error('Simulation Error:', e);
    }
    
    if(btn) {
        btn.innerHTML = '🔄 RE-RUN LINEUP SIMULATION';
        btn.disabled = false;
    }
}

// --- PHASE 12: GLOBAL ENTITY MANAGEMENT DASHBOARD ---
document.addEventListener('DOMContentLoaded', () => {
    fetchGlobalTeams();
    
    const teamSelector = document.getElementById('global-team-selector');
    if (teamSelector) {
        teamSelector.addEventListener('change', (e) => {
            if (e.target.value) {
                renderGlobalRoster(e.target.value);
            } else {
                document.getElementById('rosters-grid').innerHTML = '<div style="color: var(--text-secondary); padding: 1rem;">Select a team to display evaluated personnel.</div>';
            }
        });
    }
});

async function fetchGlobalTeams() {
    try {
        const hostname = window.location.hostname || 'localhost';
        const res = await fetch(`http://${hostname}:3000/api/teams`);
        if (!res.ok) return;
        const teams = await res.json();
        
        const selector = document.getElementById('global-team-selector');
        if (!selector) return;
        
        let html = '<option value="">-- Choose a Franchise to Inspect --</option>';
        teams.forEach(t => {
            html += `<option value="${t.team_id}">${t.name} (ID: ${t.team_id})</option>`;
        });
        selector.innerHTML = html;
        
    } catch (e) {
        console.error('Failed to load global teams fetch:', e);
    }
}

async function renderGlobalRoster(teamId) {
    const grid = document.getElementById('rosters-grid');
    grid.innerHTML = '<div style="color:var(--text-secondary);">Loading Roster Database...</div>';
    
    try {
        const hostname = window.location.hostname || 'localhost';
        const res = await fetch(`http://${hostname}:3000/api/teams/${teamId}/players`);
        const players = await res.json();
        
        if (!players || players.length === 0) {
            grid.innerHTML = '<div style="color:#ef4444;">No player data returned. The API auto-seeder failed.</div>';
            return;
        }
        
        let html = `
            <div style="background: rgba(255, 215, 0, 0.05); border: 1px solid rgba(255, 215, 0, 0.2); padding: 1.5rem; border-radius: 8px; display: flex; flex-direction: column; gap: 0.8rem; grid-column: 1 / -1; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div style="font-weight: 700; font-size: 1.1rem; color: #ffd700;">Tactical Staff</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Role: <span style="color:#fff;">Head Coach / Manager</span></div>
                    </div>
                    <div style="background: rgba(0,0,0,0.5); padding: 0.3rem 0.6rem; border-radius: 4px; font-weight: bold; border: 1px solid rgba(255,215,0,0.3); color: #ffd700;">
                        System: 4-3-3 Attacking
                    </div>
                </div>
            </div>
        `;
        players.forEach(p => {
            const isActive = p.status === 'Active';
            const statusColor = isActive ? 'var(--success)' : '#ef4444';
            const bgClass = isActive ? 'rgba(0, 240, 255, 0.05)' : 'rgba(239, 68, 68, 0.05)';
            const invertedStatus = isActive ? 'Injured' : 'Active';
            
            html += `
                <div style="background: ${bgClass}; border: 1px solid rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 8px; display: flex; flex-direction: column; gap: 0.8rem; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="font-weight: 700; font-size: 1.1rem;">${p.name}</div>
                            <div style="color: var(--text-secondary); font-size: 0.85rem;">Position: <span style="color:#fff;">${p.position}</span></div>
                        </div>
                        <div style="background: rgba(0,0,0,0.5); padding: 0.3rem 0.6rem; border-radius: 4px; font-weight: bold; border: 1px solid rgba(255,255,255,0.1);">
                            WAR: <span style="color: var(--accent);">${p.engine_rating.toFixed(1)}</span>
                        </div>
                    </div>
                    
                    <div style="margin-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 0.85rem;">Status: <strong style="color: ${statusColor};">${p.status}</strong></div>
                        <button class="btn btn-secondary" style="padding: 0.3rem 0.8rem; font-size: 0.75rem;" onclick="togglePlayerGlobalStatus(${p.player_id}, '${invertedStatus}', ${teamId})">Mark ${invertedStatus}</button>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
    } catch(e) {
        console.error('Failed to load roster:', e);
        grid.innerHTML = '<div style="color:#ef4444;">Error fetching roster API.</div>';
    }
}

async function togglePlayerGlobalStatus(playerId, newStatus, teamId) {
    try {
        const hostname = window.location.hostname || 'localhost';
        const res = await fetch(`http://${hostname}:3000/api/players/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, status: newStatus })
        });
        
        if (res.ok) {
            // Re-render the grid instantly to show Wounded/Active mutation
            renderGlobalRoster(teamId);
        } else {
            alert('Failed to update underlying SQLite player record.');
        }
    } catch(e) {
        console.error('Update status error:', e);
    }
}
