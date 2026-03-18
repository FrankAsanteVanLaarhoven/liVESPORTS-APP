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

    return `
        <div class="match-card today-card" data-sport="${match.sport_key ? match.sport_key.toLowerCase() : ''}">
            <div class="poster-bg" style="background-image: url('${getPosterForSport(match.sport_title)}')"></div>
            <div class="match-header">
                <div class="league-sport">
                    <span class="sport-tag">${match.sport_title}</span>
                </div>
                <div class="teams">
                    <span class="team">${match.home_team}</span>
                    <span class="vs">VS</span>
                    <span class="team">${match.away_team}</span>
                </div>
                <div class="match-meta">
                    <span class="time">Today @ ${timeFormatted}</span>
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

    return `
        <div class="forecast-card" data-sport="${event.sport_key ? event.sport_key.toLowerCase() : ''}">
            <div class="poster-bg" style="background-image: url('${getPosterForSport(event.sport_title)}')"></div>
            <div class="f-date">
                <span class="f-day">${dayDate}</span>
                <span class="f-time">${timeFormatted}</span>
            </div>
            <div class="f-details">
                <div class="f-sport">${event.sport_title}</div>
                <div class="f-matchup">
                    ${event.home_team} ${event.away_team ? 'vs ' + event.away_team : ''}
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

    if (todayContainer) {
        if (data.today && data.today.length > 0) {
            todayContainer.innerHTML = data.today.map(createTodayCard).join('');
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
    initWebGL();
    initWebRTC();
    initBetVerifier();
    renderDashboard();
    initEphemeralUI();
});

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
            if (card.textContent.toLowerCase().includes(intent) || dataSport.includes(intent.replace('football', 'american football'))) {
                card.style.display = '';
            } else if (intent === 'football' && dataSport.includes('american football')) {
                // handle the 'football' button triggering American Football
                card.style.display = '';
            } else if (intent === 'football' && dataSport.includes('soccer') && window.location.hostname.includes('uk')) {
                card.style.display = '';
            } else if (intent === 'soccer' && dataSport.includes('soccer')) {
                card.style.display = '';
            } else if (dataSport.includes(intent)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
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
