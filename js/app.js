/* ─── SAFE STORAGE HELPER ───────────────────────────────────── */
window.safeSetItem = function(key, value) {
  try { localStorage.setItem(key, value); } catch(e) { console.warn('Storage full:', key); }
};

/* ─── DATA ──────────────────────────────────────────────────── */
const VIDEOS = {
    'bam-featured':    { title: 'What Makes Great Shooters, Great',        channel: 'By Any Means Basketball', id: 'nC2b_ZfAeZg' },
    'bam-1':           { title: 'How to Get Crazy Handles This Summer',    channel: 'By Any Means Basketball', id: 'yFC8qs5x_Z0' },
    'bam-2':           { title: 'How to MASTER the Floater Game',          channel: 'By Any Means Basketball', id: 'HMZPUFhDkN4' },
    'hoop-sage':       { title: 'Fix Your Shooting Form In 10 Minutes',    channel: 'The Hoop Sage',           id: 'eYvo-afyy98' },
    'pro-skills':      { title: 'PSB Drills — 2 Hand Form Shooting',       channel: 'Pro Skills Basketball',   id: '2uDihY7Hang' },
    'contact-shooting':{ title: 'Contact Shooting Drill',                  channel: 'Danny Cooper Basketball', id: 'G_GkQRmOfZo' },
    'common-mistakes': { title: 'Most Common Shooting Form Mistakes',      channel: 'Richards Skills',         id: 'zO2WtY1G98k' },
};

/* ─── TAB NAVIGATION ────────────────────────────────────────── */
function showTab(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    var screenEl = document.getElementById('screen-' + name);
    if (screenEl) screenEl.classList.add('active');
    var tabBtn = document.querySelector(`[data-tab="${name}"]`);
    if (tabBtn) tabBtn.classList.add('active');

    if (name === 'analyze') { analyzeInit = false; progressInit = false; initAnalyze(); }
    if (name === 'progress') { progressInit = false; initProgress(); }
}

/* ─── CAMERA ────────────────────────────────────────────────── */
let stream = null, recorder = null, isRec = false;
const videoEl   = document.getElementById('videoEl');
const overlay   = document.getElementById('cameraOverlay');
const recBadge  = document.getElementById('recIndicator');
const emptyView = document.getElementById('cameraEmpty');

async function startCamera() {
    try {
        setStatus('yellow', 'Starting camera…');
        var constraints = [
            { video: { facingMode:'environment', width:{ideal:1280}, height:{ideal:720} }, audio: true },
            { video: { facingMode:'user' }, audio: true },
            { video: true, audio: true }
        ];
        var lastErr;
        for (var ci = 0; ci < constraints.length; ci++) {
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints[ci]);
                break;
            } catch(err) { lastErr = err; }
        }
        if (!stream) throw lastErr;
        videoEl.srcObject = stream;
        videoEl.play().catch(function(){});
        emptyView.style.display = 'none';
        overlay.classList.add('visible');
        document.getElementById('btnStartCam').classList.add('hidden');
        document.getElementById('btnRecord').disabled = false;
        setStatus('green', 'Camera active — AI ready');
    } catch(e) {
        setStatus('', 'Camera unavailable: ' + (e.message || 'access denied'));
        if (emptyView) {
            emptyView.style.display = 'flex';
            emptyView.innerHTML = '<p style="color:var(--text-2);text-align:center;padding:1rem;">📷 Camera not available.<br>Check browser permissions.</p>';
        }
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(function(t){ t.stop(); });
        stream = null;
        videoEl.srcObject = null;
    }
}

function startRecording() {
    if (!stream) return;
    recorder = new MediaRecorder(stream);
    recorder.start();
    isRec = true;
    recBadge.classList.add('visible');
    document.getElementById('btnRecord').classList.add('hidden');
    document.getElementById('btnStop').classList.remove('hidden');
    setStatus('red', 'Recording shot…');

    let sec = 8;
    const t = setInterval(() => {
        sec--;
        setStatus('red', `Recording — ${sec}s`);
        if (sec <= 0) { clearInterval(t); if (isRec) stopRecording(); }
    }, 1000);
}

function stopRecording() {
    if (!recorder || !isRec) return;
    recorder.stop();
    isRec = false;
    recBadge.classList.remove('visible');
    document.getElementById('btnRecord').classList.remove('hidden');
    document.getElementById('btnStop').classList.add('hidden');
    setStatus('yellow', 'AI analyzing biomechanics…');
    setTimeout(() => {
        setStatus('green', '✨ Analysis complete! Check Analytics tab.');
        setTimeout(() => showTab('analyze'), 1800);
    }, 2800);
}

function setStatus(dot, msg) {
    const d = document.getElementById('statusDot');
    const t = document.getElementById('statusText');
    d.className = 'status-dot' + (dot ? ' ' + dot : '');
    t.textContent = msg;
}

/* ─── ANALYTICS INIT ────────────────────────────────────────── */
let analyzeInit = false;
function initAnalyze() {
    if (analyzeInit) return;
    analyzeInit = true;
    var stats = computeAnalytics();
    var emptyEl = document.getElementById('analyzeEmpty');
    var contentEl = document.getElementById('analyzeContent');
    if (stats.totalAttempts === 0) {
        if (emptyEl) emptyEl.classList.add('visible');
        if (contentEl) contentEl.classList.add('hidden');
        return;
    }
    if (emptyEl) emptyEl.classList.remove('visible');
    if (contentEl) contentEl.classList.remove('hidden');
    // Update score ring
    var ring = document.getElementById('scoreRing');
    var scoreEl = document.getElementById('scoreNum');
    scoreEl.textContent = stats.overall;
    setTimeout(function() {
        ring.style.strokeDashoffset = 283 - (283 * stats.overall / 100);
    }, 100);
    // Update score meta
    var titleEl = document.querySelector('.score-title');
    if (titleEl) titleEl.textContent = stats.tier;
    var badgeEl = document.querySelector('.score-badge');
    if (badgeEl) badgeEl.textContent = stats.trend;
    // Update metric tiles
    var metrics = [
        { id: 'm1', val: stats.shootingPct, label: 'Shooting %', width: stats.shootingPct },
        { id: 'm2', val: stats.consistency, label: 'Consistency', width: stats.consistency },
        { id: 'm3', val: stats.bestZonePct, label: 'Best Zone %', width: stats.bestZonePct },
        { id: 'm4', val: stats.sessionAvg, label: 'Avg Shots/Session', width: Math.min(stats.sessionAvg, 100) }
    ];
    metrics.forEach(function(m, i) {
        var el = document.getElementById(m.id);
        el.textContent = '0';
        var bar = el.parentElement.querySelector('.mini-bar-fill');
        if (bar) bar.dataset.width = m.width;
        var labelEl = el.parentElement.querySelector('.metric-tile-label');
        if (labelEl) labelEl.textContent = m.label;
        setTimeout(function() { animateNum(el, 0, m.val, 900); }, i * 150);
    });
    // Animate mini-bars
    setTimeout(function() {
        document.querySelectorAll('.mini-bar-fill').forEach(function(bar) {
            bar.style.width = bar.dataset.width + '%';
        });
    }, 200);
    // Update insights
    updateInsights(stats);
}

function computeAnalytics() {
    var hist = [];
    try { hist = JSON.parse(localStorage.getItem('hoopai_session_history') || '[]'); } catch(e) {}
    var totalMakes = 0, totalMisses = 0;
    hist.forEach(function(s) { totalMakes += (s.makes || 0); totalMisses += (s.misses || 0); });
    var totalAttempts = totalMakes + totalMisses;
    var shootingPct = totalAttempts > 0 ? Math.round(totalMakes / totalAttempts * 100) : 0;
    // Consistency: std dev of per-session shooting % (lower = better, inverted to 0-100)
    var sessionPcts = [];
    hist.forEach(function(s) {
        var a = (s.makes || 0) + (s.misses || 0);
        if (a > 0) sessionPcts.push(Math.round((s.makes || 0) / a * 100));
    });
    var consistency = 50;
    if (sessionPcts.length >= 2) {
        var mean = sessionPcts.reduce(function(a,b){return a+b;},0) / sessionPcts.length;
        var variance = sessionPcts.reduce(function(a,v){return a + (v-mean)*(v-mean);},0) / sessionPcts.length;
        var stdDev = Math.sqrt(variance);
        consistency = Math.max(0, Math.min(100, Math.round(100 - stdDev * 2)));
    }
    // Best zone
    var zones = ['paint','mid-left','mid-right','corner3-left','corner3-right'];
    var bestZone = 'paint', bestZonePct = 0;
    zones.forEach(function(z) {
        var m = parseInt(localStorage.getItem('hoopai_zone_makes_' + z) || '0');
        var mi = parseInt(localStorage.getItem('hoopai_zone_misses_' + z) || '0');
        var t = m + mi;
        if (t > 0) {
            var p = Math.round(m / t * 100);
            if (p > bestZonePct) { bestZonePct = p; bestZone = z; }
        }
    });
    // Avg shots per session
    var sessionAvg = hist.length > 0 ? Math.round(totalAttempts / hist.length) : 0;
    // Overall score: weighted combo
    var overall = totalAttempts > 0 ? Math.round(shootingPct * 0.4 + consistency * 0.3 + bestZonePct * 0.2 + Math.min(sessionAvg, 100) * 0.1) : 0;
    // Tier
    var tier = 'Beginner';
    if (overall >= 85) tier = 'Elite Shooter';
    else if (overall >= 70) tier = 'Sharpshooter';
    else if (overall >= 55) tier = 'Rising Star';
    else if (overall >= 40) tier = 'Developing';
    else if (overall > 0) tier = 'Beginner';
    else tier = 'No Data Yet';
    // Trend: compare last 3 sessions vs previous 3
    var trend = '';
    if (hist.length >= 6) {
        var recent = hist.slice(-3), prev = hist.slice(-6, -3);
        var rAvg = 0, pAvg = 0;
        recent.forEach(function(s) { var a = (s.makes||0)+(s.misses||0); if(a>0) rAvg += (s.makes||0)/a; });
        prev.forEach(function(s) { var a = (s.makes||0)+(s.misses||0); if(a>0) pAvg += (s.makes||0)/a; });
        rAvg = Math.round(rAvg/3*100); pAvg = Math.round(pAvg/3*100);
        var diff = rAvg - pAvg;
        trend = diff >= 0 ? '\u2191 +' + diff + ' vs prev 3 sessions' : '\u2193 ' + diff + ' vs prev 3 sessions';
    } else if (hist.length > 0) {
        trend = hist.length + ' session' + (hist.length > 1 ? 's' : '') + ' recorded';
    } else {
        trend = 'Record sessions to see trends';
    }
    return {
        overall: overall, tier: tier, trend: trend,
        shootingPct: shootingPct, consistency: consistency,
        bestZonePct: bestZonePct, bestZone: bestZone,
        sessionAvg: sessionAvg, totalMakes: totalMakes,
        totalAttempts: totalAttempts, sessionCount: hist.length,
        hist: hist
    };
}

function updateInsights(stats) {
    var container = document.querySelector('#screen-analyze .insight-card');
    if (!container) return;
    var wrap = container.parentElement;
    wrap.innerHTML = '';
    var insights = [];
    if (stats.totalAttempts === 0) {
        insights.push({ icon: '\ud83c\udfa5', title: 'Get Started', body: 'Record your first session to unlock AI-powered shooting insights!' });
    } else {
        if (stats.shootingPct >= 60) {
            insights.push({ icon: '\ud83c\udfaf', title: 'Sharp Shooter', body: 'Your <strong>' + stats.shootingPct + '%</strong> shooting is excellent! Keep it up and push for consistency across all zones.' });
        } else if (stats.shootingPct >= 40) {
            insights.push({ icon: '\ud83c\udfaf', title: 'Shooting Accuracy', body: 'You\'re at <strong>' + stats.shootingPct + '%</strong> overall. Focus on form fundamentals — feet set, elbow aligned, smooth follow-through.' });
        } else {
            insights.push({ icon: '\ud83c\udfaf', title: 'Building Foundation', body: 'At <strong>' + stats.shootingPct + '%</strong>, focus on close-range shots first. Master the paint before moving to mid-range.' });
        }
        if (stats.bestZonePct > 0) {
            insights.push({ icon: '\ud83d\udccd', title: 'Hot Zone: ' + stats.bestZone.replace(/-/g,' ').replace(/\b\w/g, function(l){return l.toUpperCase();}), body: 'You shoot <strong>' + stats.bestZonePct + '%</strong> from ' + stats.bestZone.replace(/-/g,' ') + ' — your best zone. Work on weaker zones to become unpredictable.' });
        }
        if (stats.consistency >= 80) {
            insights.push({ icon: '\u26a1', title: 'Machine-Like Consistency', body: 'Your consistency score of <strong>' + stats.consistency + '</strong> means your performance barely varies. Elite trait!' });
        } else if (stats.consistency < 50) {
            insights.push({ icon: '\u26a1', title: 'Consistency Opportunity', body: 'Your sessions vary a lot (score: <strong>' + stats.consistency + '</strong>). Try a pre-shot routine to stabilize your form.' });
        }
        if (stats.sessionCount >= 5) {
            insights.push({ icon: '\ud83d\udcc8', title: 'Dedicated Trainer', body: 'With <strong>' + stats.sessionCount + ' sessions</strong> and <strong>' + stats.totalAttempts + ' shots</strong>, your commitment is paying off!' });
        }
    }
    if (insights.length === 0) {
        insights.push({ icon: '\ud83d\udcca', title: 'Keep Going', body: 'Record more sessions to unlock deeper insights about your game.' });
    }
    insights.forEach(function(ins) {
        var card = document.createElement('div');
        card.className = 'insight-card';
        card.innerHTML = '<div class="insight-icon-wrap">' + ins.icon + '</div><div><div class="insight-title">' + ins.title + '</div><div class="insight-body">' + ins.body + '</div></div>';
        wrap.appendChild(card);
    });
}

function animateNum(el, from, to, dur) {
    const start = performance.now();
    function step(now) {
        const t = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(from + (to - from) * ease);
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

/* ─── PROGRESS INIT ─────────────────────────────────────────── */
let progressInit = false;
function initProgress() {
    if (progressInit) return;
    progressInit = true;
    drawWeeklyChart();
    drawShotChart();
}

var _weeklyChartInstance = null;
function drawWeeklyChart() {
    if (_weeklyChartInstance) { _weeklyChartInstance.destroy(); _weeklyChartInstance = null; }
    var ctx = document.getElementById('weeklyChart').getContext('2d');
    var grad = ctx.createLinearGradient(0,0,0,140);
    grad.addColorStop(0, 'rgba(255,107,53,0.25)');
    grad.addColorStop(1, 'rgba(255,107,53,0.0)');
    // Build last 7 days of shooting % from real session history
    var hist = [];
    try { hist = JSON.parse(localStorage.getItem('hoopai_session_history') || '[]'); } catch(e) {}
    var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var labels = [], data = [];
    for (var d = 6; d >= 0; d--) {
        var date = new Date(); date.setDate(date.getDate() - d);
        var dayStr = date.toISOString().split('T')[0];
        labels.push(dayNames[date.getDay()]);
        var dayMakes = 0, dayAttempts = 0;
        hist.forEach(function(s) {
            var sDate = (s.date || '').split('T')[0];
            if (sDate === dayStr) {
                dayMakes += (s.makes || 0);
                dayAttempts += (s.makes || 0) + (s.misses || 0);
            }
        });
        data.push(dayAttempts > 0 ? Math.round(dayMakes / dayAttempts * 100) : null);
    }
    _weeklyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                fill: true,
                backgroundColor: grad,
                borderColor: '#FF6B35',
                borderWidth: 2.5,
                tension: 0.45,
                pointBackgroundColor: '#FF6B35',
                pointBorderColor: '#0A0A0A',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                spanGaps: true,
            }]
        },
        options: {
            responsive: true,
            plugins: { legend:{ display:false }, tooltip:{
                backgroundColor:'rgba(20,20,20,0.95)',
                borderColor:'rgba(255,107,53,0.3)',
                borderWidth:1,
                titleColor:'#FF6B35',
                bodyColor:'rgba(255,255,255,0.7)',
                padding:10,
                cornerRadius:10,
                callbacks: { label: function(ctx) { return ctx.parsed.y !== null ? ctx.parsed.y + '%' : 'No data'; } }
            }},
            scales: {
                x: { grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'rgba(255,255,255,0.35)',font:{size:11}} },
                y: {
                    min:0, max:100,
                    grid:{color:'rgba(255,255,255,0.05)'},
                    ticks:{color:'rgba(255,255,255,0.35)',font:{size:11}, callback: function(v){return v+'%';} }
                }
            }
        }
    });
}

function drawShotChart() {
    var g = document.getElementById('shotMarkers');
    g.innerHTML = '';
    // Use real zone data to place dots in approximate court regions
    var zoneRegions = {
        'paint': { xMin:100, xMax:190, yMin:150, yMax:220 },
        'mid-left': { xMin:50, xMax:110, yMin:100, yMax:200 },
        'mid-right': { xMin:180, xMax:240, yMin:100, yMax:200 },
        'corner3-left': { xMin:40, xMax:80, yMin:230, yMax:300 },
        'corner3-right': { xMin:210, xMax:250, yMin:230, yMax:300 }
    };
    var zones = ['paint','mid-left','mid-right','corner3-left','corner3-right'];
    var allMade = [], allMissed = [];
    zones.forEach(function(z) {
        var makes = parseInt(localStorage.getItem('hoopai_zone_makes_' + z) || '0');
        var misses = parseInt(localStorage.getItem('hoopai_zone_misses_' + z) || '0');
        var r = zoneRegions[z];
        // Cap dots per zone at 10 for readability, scale proportionally
        var maxDots = 10;
        var total = makes + misses;
        var scale = total > maxDots ? maxDots / total : 1;
        var mCount = Math.round(makes * scale);
        var miCount = Math.round(misses * scale);
        for (var i = 0; i < mCount; i++) {
            allMade.push({ x: r.xMin + Math.random()*(r.xMax-r.xMin), y: r.yMin + Math.random()*(r.yMax-r.yMin) });
        }
        for (var i = 0; i < miCount; i++) {
            allMissed.push({ x: r.xMin + Math.random()*(r.xMax-r.xMin), y: r.yMin + Math.random()*(r.yMax-r.yMin) });
        }
    });
    // If no real data, show a "no data" message
    if (allMade.length === 0 && allMissed.length === 0) {
        var txt = document.createElementNS('http://www.w3.org/2000/svg','text');
        txt.setAttribute('x','145'); txt.setAttribute('y','175');
        txt.setAttribute('text-anchor','middle'); txt.setAttribute('fill','rgba(255,255,255,0.3)');
        txt.setAttribute('font-size','14'); txt.textContent = 'Record zone shots to see your chart';
        g.appendChild(txt);
        return;
    }
    allMade.forEach(function(s, i) {
        g.appendChild(makeShotDot(s.x, s.y, '#30D158', i * 60));
    });
    allMissed.forEach(function(s, i) {
        g.appendChild(makeShotDot(s.x, s.y, '#FF453A', allMade.length * 60 + i * 60));
    });
}

function makeShotDot(x, y, color, delay) {
    const ns = 'http://www.w3.org/2000/svg';
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', x);
    c.setAttribute('cy', y);
    c.setAttribute('r', '5');
    c.setAttribute('fill', color);
    c.setAttribute('opacity', '0');
    c.setAttribute('stroke', 'rgba(0,0,0,0.4)');
    c.setAttribute('stroke-width', '1.5');
    setTimeout(() => {
        c.setAttribute('opacity', '0.85');
        c.style.transition = 'opacity 0.4s ease';
    }, delay);
    return c;
}

function generateShots() {
    const made = [], missed = [];
    for (let i = 0; i < 22; i++) {
        const type = Math.random();
        let x, y;
        if (type < 0.35) {          // Paint
            x = rand(40, 150); y = rand(140, 210);
        } else if (type < 0.65) {   // Mid-range
            x = rand(80, 210); y = rand(90, 260);
        } else {                    // 3-point
            x = rand(165, 280); y = rand(80, 270);
        }
        x = clamp(x, 40, 285); y = clamp(y, 25, 325);
        const dist = Math.hypot(x-35, y-175);
        const pct  = Math.max(0.2, 0.82 - dist * 0.0014);
        if (Math.random() < pct) made.push({x,y});
        else missed.push({x,y});
    }
    return { made, missed };
}

const rand  = (a,b) => a + Math.random()*(b-a);
const clamp = (v,a,b) => Math.min(Math.max(v,a),b);

/* ─── VIDEO MODAL ────────────────────────────────────────────── */
function openVideo(key) {
    const v = VIDEOS[key];
    if (!v) return;
    document.getElementById('videoModalTitle').textContent   = v.title;
    document.getElementById('videoModalChannel').textContent = v.channel;
    document.getElementById('videoFrame').src =
        `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1&color=white`;
    document.getElementById('videoModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeVideo() {
    document.getElementById('videoFrame').src = '';
    document.getElementById('videoModal').classList.remove('open');
    document.body.style.overflow = '';
}

function closeVideoOutside(e) {
    if (e.target === document.getElementById('videoModal')) closeVideo();
}

function markComplete() {
    closeVideo();
    showTab('progress');
}

/* ─── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
});

    /* ─── ONBOARDING JS (Feature #1) ─────────────────────── */
    (function() {
        const STORAGE_KEY = 'hoopai_onboarded';
        let obStep = 1;
        let selectedSkill = null;
        let selectedGoal = null;

        function checkOnboarding() {
            if (localStorage.getItem(STORAGE_KEY)) {
                document.getElementById('onboarding').classList.add('hidden');
            }
        }

        function obNext(from) {
            const cur = document.getElementById('ob-s' + from);
            const next = document.getElementById('ob-s' + (from + 1));
            cur.classList.remove('active');
            cur.classList.add('exit-left');
            setTimeout(() => { cur.classList.remove('exit-left'); }, 400);
            next.classList.add('active');
            obStep = from + 1;
            updateDots();
        }

        function updateDots() {
            for (let i = 0; i < 3; i++) {
                document.getElementById('od' + i).classList.toggle('active', i === obStep - 1);
            }
        }

        function selectSkill(el, skill) {
            document.querySelectorAll('.ob-skill-card').forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
            selectedSkill = skill;
            document.getElementById('ob-skill-btn').disabled = false;
        }

        function selectGoal(el, goal) {
            document.querySelectorAll('.ob-goal-card').forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
            selectedGoal = goal;
            document.getElementById('ob-goal-btn').disabled = false;
        }

        function finishOnboarding() {
            localStorage.setItem(STORAGE_KEY, '1');
            localStorage.setItem('hoopai_skill', selectedSkill || 'beginner');
            localStorage.setItem('hoopai_goal', selectedGoal || 'form');
            const ob = document.getElementById('onboarding');
            ob.style.transition = 'opacity 0.5s ease';
            ob.style.opacity = '0';
            setTimeout(() => ob.classList.add('hidden'), 500);
        }

        function skipOnboarding() {
            localStorage.setItem(STORAGE_KEY, '1');
            const ob = document.getElementById('onboarding');
            ob.style.transition = 'opacity 0.3s ease';
            ob.style.opacity = '0';
            setTimeout(() => ob.classList.add('hidden'), 300);
        }

        // Expose to global
        window.obNext = obNext;
        window.selectSkill = selectSkill;
        window.selectGoal = selectGoal;
        window.finishOnboarding = finishOnboarding;
        window.skipOnboarding = skipOnboarding;

        // Run on load
        document.addEventListener('DOMContentLoaded', checkOnboarding);
    })();


    /* ─── PLAYER PROFILE JS (Feature #2) ─────────────────── */
    (function() {
        const KEYS = {
            name: 'hoopai_name', position: 'hoopai_position',
            height: 'hoopai_height', hand: 'hoopai_hand',
            skill: 'hoopai_skill', goal: 'hoopai_goal',
            sessions: 'hoopai_sessions', shots: 'hoopai_shots', streak: 'hoopai_streak'
        };
        const goalLabels = { form: 'Fix My Form', volume: 'Build Volume', game: 'Game Readiness' };
        const skillLabels = { beginner: 'Beginner', intermediate: 'Intermediate', elite: 'Elite' };

        function getInitials(name) {
            if (!name || name === 'Athlete') return '🏀';
            return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
        }

        function loadProfile() {
            const name = localStorage.getItem(KEYS.name) || 'Athlete';
            const skill = localStorage.getItem(KEYS.skill) || 'beginner';
            const goal = localStorage.getItem(KEYS.goal) || 'form';
            const initials = getInitials(name);

            // Header avatar
            const ha = document.getElementById('headerAvatar');
            if (ha) ha.textContent = initials;

            // Hero greeting
            const hg = document.getElementById('heroGreeting');
            if (hg) {
                const hour = new Date().getHours();
                const tod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
                hg.textContent = 'Good ' + tod + (name !== 'Athlete' ? ', ' + name.split(' ')[0] : ', Athlete');
            }

            // Profile modal view
            const nd = document.getElementById('profileNameDisplay');
            if (nd) nd.textContent = name;
            const lb = document.getElementById('profileLevelBadge');
            if (lb) lb.textContent = skillLabels[skill] || 'Beginner';
            const pal = document.getElementById('profileAvatarLg');
            if (pal) pal.textContent = initials;

            const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
            set('pFieldPosition', localStorage.getItem(KEYS.position));
            set('pFieldHeight', localStorage.getItem(KEYS.height));
            set('pFieldHand', localStorage.getItem(KEYS.hand));
            set('pFieldGoal', goalLabels[goal] || 'Fix My Form');

            const si = parseInt(localStorage.getItem(KEYS.sessions) || '0');
            const sh = parseInt(localStorage.getItem(KEYS.shots) || '0');
            const st = parseInt(localStorage.getItem(KEYS.streak) || '0');
            set('pStatSessions', si); set('pStatShots', sh); set('pStatStreak', st);
        }

        function openProfile() {
            loadProfile();
            document.getElementById('profileModal').classList.add('open');
        }
        function closeProfile() {
            document.getElementById('profileModal').classList.remove('open');
        }
        function closeProfileOnBackdrop(e) {
            if (e.target === document.getElementById('profileModal')) closeProfile();
        }
        function showEditForm() {
            document.getElementById('profileView').classList.add('hidden');
            document.getElementById('profileEditForm').classList.add('active');
            // Pre-fill
            document.getElementById('editName').value = localStorage.getItem(KEYS.name) || '';
            document.getElementById('editPosition').value = localStorage.getItem(KEYS.position) || '';
            document.getElementById('editHeight').value = localStorage.getItem(KEYS.height) || '';
            document.getElementById('editHand').value = localStorage.getItem(KEYS.hand) || '';
            document.getElementById('editSkill').value = localStorage.getItem(KEYS.skill) || 'beginner';
        }
        function cancelEdit() {
            document.getElementById('profileView').classList.remove('hidden');
            document.getElementById('profileEditForm').classList.remove('active');
        }
        function saveProfile() {
            const name = document.getElementById('editName').value.trim() || 'Athlete';
            localStorage.setItem(KEYS.name, name);
            localStorage.setItem(KEYS.position, document.getElementById('editPosition').value);
            localStorage.setItem(KEYS.height, document.getElementById('editHeight').value);
            localStorage.setItem(KEYS.hand, document.getElementById('editHand').value);
            localStorage.setItem(KEYS.skill, document.getElementById('editSkill').value);
            cancelEdit();
            loadProfile();
        }

        window.openProfile = openProfile;
        window.closeProfile = closeProfile;
        window.closeProfileOnBackdrop = closeProfileOnBackdrop;
        window.showEditForm = showEditForm;
        window.cancelEdit = cancelEdit;
        window.saveProfile = saveProfile;

        document.addEventListener('DOMContentLoaded', loadProfile);
    })();


    /* ─── SHOT TYPE SELECTOR JS (Feature #3) ────────────── */
    window.currentShotType = 'layup';
    const shotTypeLabels = {
        layup: 'Layup', midrange: 'Mid-Range', three: '3-Pointer', freethrow: 'Free Throw'
    };
    window.selectShotType = function(el, type) {
        document.querySelectorAll('.shot-pill').forEach(p => p.classList.remove('active'));
        el.classList.add('active');
        window.currentShotType = type;
        // Update status bar hint
        const hints = {
            layup: 'Layup selected — focus on angles and touch',
            midrange: 'Mid-range selected — nail the form',
            three: '3-Pointer selected — arc is everything',
            freethrow: 'Free throw selected — consistency mode'
        };
        const st = document.getElementById('statusText');
        if (st) st.textContent = hints[type] || 'Ready to analyze your shot';
    };


// ── Feature #4: Real-Time Shot Counter ──
(function() {
  window.sessionMakes = 0;
  window.sessionAttempts = 0;

  function updateDisplay() {
    document.getElementById('scoreMakes').textContent = window.sessionMakes;
    document.getElementById('scoreAttempts').textContent = window.sessionAttempts;
    var pct = window.sessionAttempts > 0 ? Math.round((window.sessionMakes / window.sessionAttempts) * 100) : '--';
    document.getElementById('scorePct').textContent = pct === '--' ? '--%' : pct + '%';
  }

  function flashBtn(el) {
    if (!el || !el.classList) return;
    el.classList.remove('flashing');
    void el.offsetWidth;
    el.classList.add('flashing');
    setTimeout(function() { el.classList.remove('flashing'); }, 350);
  }

  window.recordMake = function(el) {
    window.sessionMakes++;
    window.sessionAttempts++;
    updateDisplay();
    flashBtn(el);
    var st = document.getElementById('statusText');
    if (st) st.textContent = '🔥 Nice make! Keep it going.';
  };

  window.recordMiss = function(el) {
    window.sessionAttempts++;
    updateDisplay();
    flashBtn(el);
    var st = document.getElementById('statusText');
    if (st) st.textContent = '💪 Stay focused — next one goes in.';
  };

  window.resetCounter = function() {
    window.sessionMakes = 0;
    window.sessionAttempts = 0;
    updateDisplay();
    var st = document.getElementById('statusText');
    if (st) st.textContent = 'Session reset — ready to go!';
  };
})();


// ── Feature #5: Session Summary ──
(function() {
  var sessionStart = Date.now();

  function spawnConfetti() {
    var container = document.getElementById('confettiContainer');
    if (!container) return;
    container.innerHTML = '';
    var colors = ['#FF6B35','#4CAF50','#2196F3','#FFB347','#E91E63','#9C27B0','#00BCD4'];
    for (var i = 0; i < 30; i++) {
      var piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 1.2) + 's';
      piece.style.animationDuration = (1.8 + Math.random() * 1.2) + 's';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      container.appendChild(piece);
    }
  }

  window.openSummary = function() {
    var makes = window.sessionMakes || 0;
    var attempts = window.sessionAttempts || 0;
    var misses = attempts - makes;
    var pct = attempts > 0 ? Math.round((makes / attempts) * 100) : 0;
    var shotTypeLabels = { layup: 'Layup', midrange: 'Mid-Range', three: '3-Pointer', freethrow: 'Free Throw' };
    var shotType = shotTypeLabels[window.currentShotType] || '--';
    var name = localStorage.getItem('hoopai_name') || 'Athlete';

    document.getElementById('summaryHeadline').textContent = pct >= 50 ? 'Great session, ' + name + '! 🔥' : 'Keep grinding, ' + name + '! 💪';
    document.getElementById('summaryDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    document.getElementById('summaryPct').textContent = attempts > 0 ? pct + '%' : '--%';
    document.getElementById('summaryMakes').textContent = makes;
    document.getElementById('summaryAttempts').textContent = attempts;
    document.getElementById('summaryMisses').textContent = misses;
    document.getElementById('summaryShotType').textContent = shotType;

    document.getElementById('summaryModal').classList.add('open');
    if (attempts > 0) spawnConfetti();
    sessionStart = Date.now();
  };

  window.saveSummary = function() {
    var makes = window.sessionMakes || 0;
    var attempts = window.sessionAttempts || 0;
    var prevSessions = parseInt(localStorage.getItem('hoopai_sessions') || '0');
    var prevShots = parseInt(localStorage.getItem('hoopai_shots') || '0');
    safeSetItem('hoopai_sessions', prevSessions + 1);
    safeSetItem('hoopai_shots', prevShots + attempts);
    // Persist to session history so Analyze tab, profile stats, and share card have real data
    var hist = [];
    try { hist = JSON.parse(localStorage.getItem('hoopai_session_history') || '[]'); } catch(e) {}
    hist.push({
      date: new Date().toISOString(),
      makes: makes,
      misses: attempts - makes,
      shotType: window.currentShotType || 'layup',
      streak: parseInt(localStorage.getItem('hoopai_streak') || '0')
    });
    if (hist.length > 200) hist = hist.slice(-200);
    safeSetItem('hoopai_session_history', JSON.stringify(hist));
    var today = new Date().toDateString();
    safeSetItem('hoopai_last_session', today);
    newSession();
    var st = document.getElementById('statusText');
    if (st) st.textContent = '✅ Session saved! Great work.';
  };

  window.newSession = function() {
    document.getElementById('summaryModal').classList.remove('open');
    window.sessionMakes = 0;
    window.sessionAttempts = 0;
    if (window.resetCounter) window.resetCounter();
  };
})();


// ── Feature #13: Weekly Stats Bar Chart ──
(function() {
  var DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var KEY_PREFIX = 'hoopai_daily_shots_';

  function dateKey(d) {
    return KEY_PREFIX + d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
  }

  function getLast7() {
    var days = [];
    var today = new Date();
    for (var i = 6; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(today.getDate() - i);
      var shots = parseInt(localStorage.getItem(dateKey(d)) || '0');
      days.push({ label: DAY_NAMES[d.getDay()], shots: shots, isToday: i === 0, dateObj: d });
    }
    return days;
  }

  function renderWeeklyChart() {
    var wrap = document.getElementById('weeklyBarsWrap');
    if (!wrap) return;
    var days = getLast7();
    var maxShots = Math.max.apply(null, days.map(function(d){ return d.shots; }));
    if (maxShots === 0) maxShots = 10; // prevent divide-by-zero, show empty state

    wrap.innerHTML = '';
    days.forEach(function(day) {
      var col = document.createElement('div');
      col.className = 'weekly-bar-col';

      var val = document.createElement('div');
      val.className = 'weekly-bar-val';
      val.textContent = day.shots > 0 ? day.shots : '';

      var bar = document.createElement('div');
      var heightPct = Math.max((day.shots / maxShots) * 100, day.shots > 0 ? 4 : 2);
      bar.className = 'weekly-bar' + (day.isToday ? ' today' : '') + (day.shots > 0 ? ' has-data' : '');
      bar.style.height = '0%';
      bar.style.transition = 'height 0.5s cubic-bezier(0.34,1.56,0.64,1)';

      var label = document.createElement('div');
      label.className = 'weekly-bar-day' + (day.isToday ? ' today' : '');
      label.textContent = day.isToday ? 'Today' : day.label;

      col.appendChild(val);
      col.appendChild(bar);
      col.appendChild(label);
      wrap.appendChild(col);

      // Animate in
      setTimeout(function(b, h){ b.style.height = h + '%'; }, 50, bar, heightPct);
    });

    // Footer stats
    var total = days.reduce(function(s, d){ return s + d.shots; }, 0);
    var daysWithData = days.filter(function(d){ return d.shots > 0; }).length;
    var best = Math.max.apply(null, days.map(function(d){ return d.shots; }));
    var avg = daysWithData > 0 ? Math.round(total / daysWithData) : 0;

    var elTotal = document.getElementById('weeklyTotal');
    var elAvg = document.getElementById('weeklyAvg');
    var elBest = document.getElementById('weeklyBest');
    if (elTotal) elTotal.textContent = total || '0';
    if (elAvg) elAvg.textContent = avg || '0';
    if (elBest) elBest.textContent = best || '0';
  }

  // Hook into saveSummary to record today's shots
  var _origSaveWeekly = window.saveSummary;
  window.saveSummary = function() {
    if (_origSaveWeekly) _origSaveWeekly();
    // Record today's daily shots
    var today = new Date();
    var key = dateKey(today);
    var prev = parseInt(localStorage.getItem(key) || '0');
    safeSetItem(key, prev + (window.sessionAttempts || 0));
  };

  // Expose render for tab init
  window.renderWeeklyChart = renderWeeklyChart;

  // Hook into initProgress to render chart when Progress tab opens
  var _origInitProgress = window.initProgress;
  window.initProgress = function() {
    if (_origInitProgress) _origInitProgress();
    renderWeeklyChart();
  };

})();


// ── Feature #14: Workout Timer ──
(function() {
  var timerTotal = 5 * 60;
  var timerRemaining = 5 * 60;
  var timerInterval = null;
  var timerRunning = false;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function formatTime(s) {
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  }

  function updateDisplay() {
    var el = document.getElementById('timerDigits');
    var btn = document.getElementById('timerStartBtn');
    if (!el) return;
    el.textContent = formatTime(timerRemaining);
    el.className = 'timer-digits';
    if (timerRemaining <= 10 && timerRemaining > 0) el.classList.add('timer-low');
    if (timerRemaining === 0) el.classList.add('timer-done');
    if (btn) {
      btn.textContent = timerRunning ? '⏸ Pause' : (timerRemaining === 0 ? '✓ Done' : '▶ Start');
      btn.className = 'timer-btn ' + (timerRunning ? 'timer-btn-pause' : 'timer-btn-start');
    }
    // Show active drill name
    var nameEl = document.getElementById('timerDrillName');
    if (nameEl) nameEl.textContent = window.activeDrillName ? '🏀 ' + window.activeDrillName : '';
  }

  window.timerToggle = function() {
    if (timerRemaining === 0) { timerReset(); return; }
    if (timerRunning) {
      clearInterval(timerInterval);
      timerRunning = false;
    } else {
      timerRunning = true;
      timerInterval = setInterval(function() {
        if (timerRemaining > 0) {
          timerRemaining--;
          updateDisplay();
          if (timerRemaining <= 10 && timerRemaining > 0 && window.sfx) window.sfx.buzzer();
          if (timerRemaining === 0) {
            clearInterval(timerInterval);
            timerRunning = false;
            updateDisplay();
            if (window.sfx) window.sfx.cheer();
          }
        }
      }, 1000);
    }
    updateDisplay();
  };

  window.timerReset = function() {
    clearInterval(timerInterval);
    timerRunning = false;
    timerRemaining = timerTotal;
    updateDisplay();
  };

  window.timerSetPreset = function(btn, seconds) {
    clearInterval(timerInterval);
    timerRunning = false;
    timerTotal = seconds;
    timerRemaining = seconds;
    // Update active preset button
    var presets = document.querySelectorAll('.timer-preset');
    presets.forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    updateDisplay();
  };

  // Init display on load
  document.addEventListener('DOMContentLoaded', function() { updateDisplay(); });
  // Also update when Record tab becomes active
  var _origShowTab = window.showTab;
  window.showTab = function(name) {
    if (_origShowTab) _origShowTab(name);
    if (name === 'record') { setTimeout(updateDisplay, 50); }
  };

})();


// ── Feature #15: Personal Records & Milestones ──
(function() {
  var KEYS = {
    bestMakePct: 'hoopai_pr_best_make_pct',
    bestMakePctSessions: 'hoopai_pr_best_make_pct_sessions',
    mostShots: 'hoopai_pr_most_shots',
    bestStreak: 'hoopai_best_streak',
    totalShots: 'hoopai_shots'
  };

  var MILESTONES = [
    { id: 'first_shot',   icon: '🏀', name: 'First Shot',        desc: 'Record your first shot',              check: function(s){ return s.totalShots >= 1; } },
    { id: 'sharp',        icon: '🎯', name: 'Sharp Shooter',     desc: 'Hit 50%+ in a session (min 10 shots)', check: function(s){ return parseFloat(s.bestMakePct) >= 50; } },
    { id: 'century',      icon: '💯', name: 'Century Club',      desc: 'Take 100 total shots',                 check: function(s){ return s.totalShots >= 100; } },
    { id: 'thousand',     icon: '🚀', name: 'The Thousand',      desc: 'Take 1,000 total shots',               check: function(s){ return s.totalShots >= 1000; } },
    { id: 'streak3',      icon: '🔥', name: 'Hat Trick',         desc: '3-day training streak',                check: function(s){ return s.bestStreak >= 3; } },
    { id: 'streak7',      icon: '🗓', name: 'Week Warrior',      desc: '7-day training streak',                check: function(s){ return s.bestStreak >= 7; } },
    { id: 'streak30',     icon: '🏆', name: 'Iron Hooper',       desc: '30-day training streak',               check: function(s){ return s.bestStreak >= 30; } },
    { id: 'volume',       icon: '💪', name: 'Volume Shooter',    desc: '50+ shots in one session',             check: function(s){ return s.mostShots >= 50; } },
    { id: 'sniper',       icon: '⭐', name: 'Sniper',            desc: '60%+ make rate in a session',          check: function(s){ return parseFloat(s.bestMakePct) >= 60; } },
  ];

  function getStats() {
    return {
      bestMakePct: parseFloat(localStorage.getItem(KEYS.bestMakePct) || '0'),
      mostShots: parseInt(localStorage.getItem(KEYS.mostShots) || '0'),
      bestStreak: parseInt(localStorage.getItem(KEYS.bestStreak) || '0'),
      totalShots: parseInt(localStorage.getItem(KEYS.totalShots) || '0')
    };
  }

  function renderPRs() {
    var s = getStats();
    var el = function(id){ return document.getElementById(id); };

    if (el('prMakePctVal')) el('prMakePctVal').textContent = s.bestMakePct > 0 ? s.bestMakePct.toFixed(1) + '%' : '--%';
    if (el('prMostShotsVal')) el('prMostShotsVal').textContent = s.mostShots;
    if (el('prStreakVal')) el('prStreakVal').textContent = s.bestStreak;
    if (el('prTotalShotsVal')) el('prTotalShotsVal').textContent = s.totalShots;

    // Milestones
    var list = el('milestoneList');
    if (!list) return;
    list.innerHTML = '';
    MILESTONES.forEach(function(m) {
      var unlocked = m.check(s);
      var item = document.createElement('div');
      item.className = 'milestone-item' + (unlocked ? ' unlocked' : '');
      item.innerHTML = '<div class="milestone-icon">' + (unlocked ? m.icon : '🔒') + '</div>' +
        '<div class="milestone-info"><div class="milestone-name">' + m.name + '</div>' +
        '<div class="milestone-desc">' + m.desc + '</div></div>' +
        (unlocked ? '<div class="milestone-badge">✓ Earned</div>' : '');
      list.appendChild(item);
    });
  }

  function checkAndUpdatePRs() {
    var s = getStats();
    var attempts = window.sessionAttempts || 0;
    var makes = window.sessionMakes || 0;
    var pct = attempts >= 5 ? (makes / attempts * 100) : 0;
    var isNew = false;

    // Best make pct (min 5 attempts)
    if (attempts >= 5 && pct > s.bestMakePct) {
      localStorage.setItem(KEYS.bestMakePct, pct.toFixed(1));
      isNew = true;
      popCard('prMakePct');
    }
    // Most shots in session
    if (attempts > s.mostShots) {
      localStorage.setItem(KEYS.mostShots, attempts);
      isNew = true;
      popCard('prMostShots');
    }
    return isNew;
  }

  function popCard(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add('pr-new', 'pr-pop');
    setTimeout(function(){ el.classList.remove('pr-pop'); }, 500);
  }

  // Hook into saveSummary
  var _origSavePR = window.saveSummary;
  window.saveSummary = function() {
    if (_origSavePR) _origSavePR();
    checkAndUpdatePRs();
  };

  // Hook into initProgress
  var _origInitProgressPR = window.initProgress;
  window.initProgress = function() {
    if (_origInitProgressPR) _origInitProgressPR();
    renderPRs();
  };

  window.renderPRs = renderPRs;
})();


// ── Feature #16: Form Tips Overlay ──
(function() {
  var FORM_CATEGORIES = [
    {
      title: '👣 Stance & Footwork',
      items: [
        { id: 'f1', label: 'Athletic stance', desc: 'Feet shoulder-width apart, knees slightly bent, weight on balls of feet.' },
        { id: 'f2', label: 'Shooting foot forward', desc: 'Dominant foot slightly ahead, toes pointing toward basket.' },
        { id: 'f3', label: 'Square to basket', desc: 'Hips and shoulders aligned with target before shooting.' },
      ]
    },
    {
      title: '🤲 Hand Position',
      items: [
        { id: 'f4', label: 'Ball on fingertips', desc: 'No palm contact — hold with fingerpads for control and spin.' },
        { id: 'f5', label: 'Guide hand off side', desc: 'Non-dominant hand on side of ball, not pushing.' },
        { id: 'f6', label: 'Shooting hand L-shape', desc: 'Wrist cocked back, elbow under ball forming an "L".' },
      ]
    },
    {
      title: '💪 Shot Mechanics',
      items: [
        { id: 'f7', label: 'Elbow in', desc: 'Shooting elbow stays under the ball, not flaring out.' },
        { id: 'f8', label: 'Full extension', desc: 'Extend arm fully toward basket on release.' },
        { id: 'f9', label: 'High arc (45–55°)', desc: 'Aim for a rainbow arc — not flat, not too high.' },
        { id: 'f10', label: 'Backspin', desc: 'Ball spins backward off fingertips — use the rim to your advantage.' },
      ]
    },
    {
      title: '🎯 Follow-Through',
      items: [
        { id: 'f11', label: 'Goose neck finish', desc: 'Wrist snaps forward and down — hold the follow-through.' },
        { id: 'f12', label: 'Eyes on target', desc: 'Focus on the front of the rim throughout the shot.' },
        { id: 'f13', label: 'Hold finish until swish', desc: 'Keep pose until the ball hits — builds muscle memory.' },
      ]
    }
  ];

  var checked = {};

  function saveChecked() { localStorage.setItem('hoopai_form_checked', JSON.stringify(checked)); }
  function loadChecked() {
    try { checked = JSON.parse(localStorage.getItem('hoopai_form_checked') || '{}'); } catch(e) { checked = {}; }
  }

  function renderChecklist() {
    loadChecked();
    var body = document.getElementById('formChecklistBody');
    if (!body) return;
    body.innerHTML = '';
    var total = 0, done = 0;
    FORM_CATEGORIES.forEach(function(cat) {
      var catDiv = document.createElement('div');
      catDiv.className = 'form-category';
      var title = document.createElement('div');
      title.className = 'form-category-title';
      title.textContent = cat.title;
      catDiv.appendChild(title);
      var list = document.createElement('div');
      list.className = 'form-checklist';
      cat.items.forEach(function(item) {
        total++;
        if (checked[item.id]) done++;
        var el = document.createElement('div');
        el.className = 'form-check-item' + (checked[item.id] ? ' checked' : '');
        el.onclick = function() { toggleCheck(item.id); };
        el.innerHTML = '<div class="form-check-box">' + (checked[item.id] ? '✓' : '') + '</div>' +
          '<div class="form-check-text"><div class="form-check-label">' + item.label + '</div>' +
          '<div class="form-check-desc">' + item.desc + '</div></div>';
        list.appendChild(el);
      });
      catDiv.appendChild(list);
      body.appendChild(catDiv);
    });
    // Update progress
    var fill = document.getElementById('formProgressFill');
    var lbl = document.getElementById('formScoreLabel');
    if (fill) fill.style.width = (total > 0 ? (done/total*100) : 0) + '%';
    if (lbl) lbl.textContent = done + ' / ' + total;
  }

  function toggleCheck(id) {
    checked[id] = !checked[id];
    saveChecked();
    renderChecklist();
  }

  window.openFormTips = function() {
    renderChecklist();
    var sheet = document.getElementById('formSheet');
    if (sheet) { sheet.classList.add('open'); document.body.style.overflow = 'hidden'; }
  };

  window.closeFormTips = function() {
    var sheet = document.getElementById('formSheet');
    if (sheet) { sheet.classList.remove('open'); document.body.style.overflow = ''; }
  };

  window.resetFormChecklist = function() {
    checked = {};
    saveChecked();
    renderChecklist();
  };
})();


// ── Feature #17: Share Stats Card ──
(function() {
  function drawCard() {
    var canvas = document.getElementById('shareCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;

    // Background gradient
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#1A1A2E');
    bg.addColorStop(1, '#16213E');
    ctx.fillStyle = bg;
    ctx.roundRect(0, 0, W, H, 20);
    ctx.fill();

    // Brand accent bar
    var accent = ctx.createLinearGradient(0, 0, W, 0);
    accent.addColorStop(0, '#FF6B35');
    accent.addColorStop(1, '#FFB347');
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, W, 6);

    // Logo / app name
    ctx.fillStyle = '#FF6B35';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('🏀 HoopAI', 30, 48);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('My Training Stats', 30, 68);

    // Date
    var today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(today, W - 30, 48);
    ctx.textAlign = 'left';

    // Pull stats
    var totalShots = parseInt(localStorage.getItem('hoopai_shots') || '0');
    var sessions = parseInt(localStorage.getItem('hoopai_sessions') || '0');
    var streak = parseInt(localStorage.getItem('hoopai_streak') || '0');
    var bestPct = parseFloat(localStorage.getItem('hoopai_pr_best_make_pct') || '0');
    var bestStreak = parseInt(localStorage.getItem('hoopai_best_streak') || '0');

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(30, 82); ctx.lineTo(W-30, 82); ctx.stroke();

    // Stat boxes
    var stats = [
      { label: 'Total Shots', value: totalShots.toLocaleString(), icon: '🏀' },
      { label: 'Sessions', value: sessions, icon: '📅' },
      { label: 'Streak', value: streak + 'd', icon: '🔥' },
      { label: 'Best Make%', value: bestPct > 0 ? bestPct.toFixed(1) + '%' : '--', icon: '🎯' },
      { label: 'Best Streak', value: bestStreak + 'd', icon: '⭐' },
    ];

    var cols = stats.length;
    var boxW = (W - 60) / cols;
    var boxY = 100;

    stats.forEach(function(s, i) {
      var x = 30 + i * boxW;
      // Box bg
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.roundRect(x + 4, boxY, boxW - 8, 140, 12);
      ctx.fill();

      ctx.font = '24px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(s.icon, x + boxW/2, boxY + 36);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillText(s.value, x + boxW/2, boxY + 78);

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(s.label, x + boxW/2, boxY + 100);
    });

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,107,53,0.8)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('itsababseh.github.io/hoopai-basketball-trainer', W/2, H - 18);
    ctx.textAlign = 'left';
  }

  window.openShareCard = function() {
    drawCard();
    var wrap = document.getElementById('shareCanvasWrap');
    if (wrap) wrap.classList.add('open');
  };

  window.closeShareCard = function() {
    var wrap = document.getElementById('shareCanvasWrap');
    if (wrap) wrap.classList.remove('open');
  };

  window.saveShareCard = function() {
    var canvas = document.getElementById('shareCanvas');
    if (!canvas) return;
    var link = document.createElement('a');
    link.download = 'hoopai-stats-' + new Date().toISOString().slice(0,10) + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    // Also try Web Share API
    if (navigator.share && canvas.toBlob) {
      canvas.toBlob(function(blob) {
        var file = new File([blob], 'hoopai-stats.png', { type: 'image/png' });
        navigator.share({ title: 'My HoopAI Stats', files: [file] }).catch(function(){});
      });
    }
  };
})();


// ── Feature #18: Practice Reminder Nudge ──
(function() {
  var SNOOZE_KEY = 'hoopai_reminder_snoozed_until';
  var LAST_KEY   = 'hoopai_last_session';

  var MESSAGES = [
    { title: "Time to practice! 🏀", sub: "Keep your streak alive — every rep counts." },
    { title: "Your court awaits 🔥", sub: "Yesterday's effort deserves today's follow-through." },
    { title: "Consistency builds champions 🎯", sub: "Tap Train Now to log a quick session." },
    { title: "Don't break the streak! 📅", sub: "A few makes is all it takes to stay on track." },
    { title: "Shoot your shot 💪", sub: "The best players show up every day — be one." },
  ];

  function todayStr() { return new Date().toDateString(); }

  function shouldShow() {
    // Don't show if already trained today
    if (localStorage.getItem(LAST_KEY) === todayStr()) return false;
    // Don't show if snoozed
    var snoozeUntil = parseInt(localStorage.getItem(SNOOZE_KEY) || '0');
    if (Date.now() < snoozeUntil) return false;
    return true;
  }

  function showBanner() {
    if (!shouldShow()) return;
    var msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    var title = document.getElementById('reminderTitle');
    var sub = document.getElementById('reminderSub');
    if (title) title.textContent = msg.title;
    if (sub) sub.textContent = msg.sub;
    var banner = document.getElementById('reminderBanner');
    if (banner) {
      setTimeout(function(){ banner.classList.add('show'); }, 800);
      // Auto-dismiss after 8 seconds
      setTimeout(function(){ banner.classList.remove('show'); }, 8800);
    }
  }

  window.dismissReminder = function(goTrain) {
    var banner = document.getElementById('reminderBanner');
    if (banner) banner.classList.remove('show');
    // Snooze for 2 hours
    localStorage.setItem(SNOOZE_KEY, Date.now() + 2 * 60 * 60 * 1000);
    if (goTrain && window.showTab) window.showTab('record');
  };

  // Re-hide banner when user completes a session
  var _origSaveReminder = window.saveSummary;
  window.saveSummary = function() {
    if (_origSaveReminder) _origSaveReminder();
    var banner = document.getElementById('reminderBanner');
    if (banner) banner.classList.remove('show');
  };

  // Show on load
  document.addEventListener('DOMContentLoaded', showBanner);
})();


// ── Feature #19: Animated Onboarding Tips ──
(function() {
  var DONE_KEY = 'hoopai_onboard_done';

  var STEPS = [
    {
      title: 'Welcome to HoopAI! 🏀',
      desc: "Your personal basketball training coach. Let's take a quick tour — it only takes 20 seconds.",
      target: null,
      position: 'center'
    },
    {
      title: 'Record Your Shots 🎯',
      desc: 'Tap MAKE or MISS after each shot attempt. Your stats update in real-time.',
      target: '.shot-btn-row',
      position: 'above'
    },
    {
      title: 'Drill Library 📚',
      desc: 'Browse 13 drills by category. Tap "Start Drill" to activate the workout timer.',
      target: '.nav-bar',
      position: 'above'
    },
    {
      title: 'Track Your Progress 📊',
      desc: 'The Progress tab shows your streak, weekly shot volume, personal records, and milestones.',
      target: '.nav-bar',
      position: 'above'
    },
    {
      title: "You're all set! 🚀",
      desc: 'Start your first session — hit Make or Miss on every shot and let HoopAI coach you to the next level.',
      target: null,
      position: 'center'
    }
  ];

  var currentStep = 0;

  function positionTooltip(target, position) {
    var tooltip = document.getElementById('onboardTooltip');
    var highlight = document.getElementById('onboardHighlight');
    if (!tooltip) return;

    highlight.style.display = 'none';

    if (!target || position === 'center') {
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%) scale(1)';
      tooltip.style.right = 'auto';
      tooltip.style.bottom = 'auto';
      return;
    }

    var el = document.querySelector(target);
    if (!el) {
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%) scale(1)';
      return;
    }

    var rect = el.getBoundingClientRect();
    // Highlight element
    highlight.style.display = 'block';
    highlight.style.top = (rect.top + window.scrollY - 4) + 'px';
    highlight.style.left = (rect.left - 4) + 'px';
    highlight.style.width = (rect.width + 8) + 'px';
    highlight.style.height = (rect.height + 8) + 'px';

    // Position tooltip above element
    tooltip.style.transform = 'scale(1)';
    tooltip.style.right = 'auto';
    tooltip.style.bottom = 'auto';
    var tipH = 190;
    var tipW = 280;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var leftPos = Math.max(16, Math.min(rect.left + rect.width / 2 - tipW / 2, vw - tipW - 16));
    var topPos;
    if (position === 'above') {
      topPos = rect.top - tipH - 16;
      if (topPos < 8) { topPos = rect.bottom + 16; } // flip below if off top
    } else {
      topPos = rect.bottom + 16;
      if (topPos + tipH > vh - 8) { topPos = rect.top - tipH - 16; } // flip above if off bottom
    }
    topPos = Math.max(8, Math.min(topPos, vh - tipH - 8));
    tooltip.style.top = topPos + 'px';
    tooltip.style.left = leftPos + 'px';
  }

  function renderStep(idx) {
    var step = STEPS[idx];
    if (!step) return;
    var el = function(id){ return document.getElementById(id); };
    if (el('onboardStep')) el('onboardStep').textContent = 'Step ' + (idx+1) + ' of ' + STEPS.length;
    if (el('onboardTitle')) el('onboardTitle').textContent = step.title;
    if (el('onboardDesc')) el('onboardDesc').textContent = step.desc;

    // Dots
    var dots = el('onboardDots');
    if (dots) {
      dots.innerHTML = '';
      STEPS.forEach(function(_, i) {
        var d = document.createElement('div');
        d.className = 'onboard-dot' + (i === idx ? ' active' : '');
        dots.appendChild(d);
      });
    }

    // Next button label
    var btn = document.querySelector('.onboard-next-btn');
    if (btn) btn.textContent = idx === STEPS.length - 1 ? "Let's Go! 🚀" : 'Next →';

    positionTooltip(step.target, step.position);
  }

  window.nextOnboardStep = function() {
    currentStep++;
    if (currentStep >= STEPS.length) {
      skipOnboardTour();
      return;
    }
    renderStep(currentStep);
  };

  window.skipOnboardTour = function() {
    var overlay = document.getElementById('onboardOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.style.pointerEvents = 'none';
      setTimeout(function() {
        overlay.style.display = 'none';
      }, 400);
    }
    localStorage.setItem(DONE_KEY, '1');
  };

  function startOnboarding() {
    if (localStorage.getItem(DONE_KEY)) return;
    currentStep = 0;
    var overlay = document.getElementById('onboardOverlay');
    if (!overlay) return;
    overlay.classList.add('active');
    renderStep(0);
  }

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(startOnboarding, 1200);
  });

  // Dev reset hook
  /* ── Feature #25: Drill Timer Audio Cues ───────────────────── */
  (function() {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    var ctx = null;
    function getCtx() {
      if (!ctx) { try { ctx = new AudioCtx(); } catch(e) {} }
      return ctx;
    }

    function beep(freq, duration, type, vol) {
      var ac = getCtx(); if (!ac) return;
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      gain.gain.setValueAtTime(vol || 0.25, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + duration);
    }

    function doubleBeep() {
      beep(880, 0.12, 'sine', 0.3);
      setTimeout(function(){ beep(880, 0.12, 'sine', 0.3); }, 160);
    }

    function victoryTone() {
      beep(523, 0.15, 'sine', 0.3);
      setTimeout(function(){ beep(659, 0.15, 'sine', 0.3); }, 170);
      setTimeout(function(){ beep(784, 0.3, 'sine', 0.4); }, 340);
    }

    function countdownBeep() { beep(660, 0.1, 'square', 0.2); }

    // Override sfx with richer versions
    var _origSfx = window.sfx || {};
    window.sfx = {
      swish: _origSfx.swish || function(){},
      buzzer: function() { countdownBeep(); if (_origSfx.buzzer) _origSfx.buzzer(); },
      cheer: function() { victoryTone(); if (_origSfx.cheer) _origSfx.cheer(); },
      doubleBeep: doubleBeep,
      countdownBeep: countdownBeep,
      victoryTone: victoryTone
    };

    // Hook timerToggle to add 5s double-beep (patch the interval tick)
    // We patch by overriding sfx.buzzer to detect remaining=5
    var _origBuzzer = window.sfx.buzzer;
    window.sfx.buzzer = function() {
      // timerRemaining is in outer scope of Feature #14's IIFE — read from display
      var disp = document.getElementById('timerDigits');
      var rem = disp ? disp.textContent : '';
      // parse mm:ss
      var parts = rem.split(':');
      var secs = parts.length === 2 ? parseInt(parts[0])*60 + parseInt(parts[1]) : 99;
      if (secs === 5) { doubleBeep(); } else { countdownBeep(); }
    };

    // Hook startDrill to announce drill name
    var _origStartDrill = window.startDrill;
    window.startDrill = function(name) {
      if (_origStartDrill) _origStartDrill(name);
      // Unlock AudioContext on user gesture
      var ac = getCtx();
      if (ac && ac.state === 'suspended') ac.resume();
      // Voice announcement
      if (window.speechSynthesis) {
        var u = new SpeechSynthesisUtterance("Starting drill: " + name);
        u.rate = 1.1; u.pitch = 1.0; u.volume = 0.9;
        window.speechSynthesis.speak(u);
      }
      // Start beep
      setTimeout(function(){ beep(440, 0.2, 'sine', 0.35); }, 300);
    };

    // Unlock AudioContext on first user interaction
    document.addEventListener('click', function unlock() {
      var ac = getCtx();
      if (ac && ac.state === 'suspended') ac.resume();
      document.removeEventListener('click', unlock);
    }, { once: true });
  })();
  /* ── End Feature #25 ────────────────────────────────────────── */

  /* ── Feature #24: Daily Streak Fire Calendar ───────────────── */
  (function() {
    var DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var LAST_KEY = 'hoopai_last_session';
    var STREAK_KEY = 'hoopai_streak';
    var BEST_STREAK_KEY = 'hoopai_best_streak';
    var MILESTONES = [3, 7, 14, 30, 50, 100];

    function todayStr() {
      var d = new Date();
      return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
    }
    function dateStr(d) {
      return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
    }

    function getPracticedDays() {
      // Returns Set of date strings practiced (from daily shots keys)
      var keys = Object.keys(localStorage);
      var practiced = {};
      keys.forEach(function(k) {
        if (k.indexOf('hoopai_daily_shots_') === 0) {
          var val = parseInt(localStorage.getItem(k) || '0');
          if (val > 0) practiced[k.replace('hoopai_daily_shots_', '')] = true;
        }
      });
      return practiced;
    }

    window.renderFireCalendar = function() {
      var cal = document.getElementById('fireCalendar');
      if (!cal) return;
      var practiced = getPracticedDays();
      var today = new Date();
      var cells = '';
      for (var i = 6; i >= 0; i--) {
        var d = new Date(today);
        d.setDate(today.getDate() - i);
        var key = dateStr(d);
        var hasPractice = !!practiced[key];
        var isToday = (i === 0);
        var icon = hasPractice ? '🔥' : (isToday ? '⭕' : '○');
        cells += '<div class="fire-day' + (isToday ? ' today' : '') + '">' +
          '<span class="fire-day-icon">' + icon + '</span>' +
          '<span class="fire-day-label">' + DAY_NAMES[d.getDay()] + '</span>' +
          '</div>';
      }
      cal.innerHTML = cells;
    };

    function showStreakToast(streak) {
      var toast = document.getElementById('streakToast');
      if (!toast) return;
      toast.textContent = '🔥 ' + streak + '-Day Streak! Keep it up!';
      toast.classList.add('show');
      setTimeout(function() { toast.classList.remove('show'); }, 3000);
    }

    // Hook saveSummary to check milestones
    var _origSaveStreak = window.saveSummary;
    window.saveSummary = function() {
      if (_origSaveStreak) _origSaveStreak();
      setTimeout(function() {
        var streak = parseInt(localStorage.getItem(STREAK_KEY) || '0');
        if (MILESTONES.indexOf(streak) !== -1) showStreakToast(streak);
        window.renderFireCalendar();
      }, 200);
    };

    // Hook showTab
    var _origShowFire = window.showTab;
    window.showTab = function(tab) {
      if (_origShowFire) _origShowFire(tab);
      if (tab === 'progress') setTimeout(window.renderFireCalendar, 60);
    };

    document.addEventListener('DOMContentLoaded', window.renderFireCalendar);
  })();
  /* ── End Feature #24 ────────────────────────────────────────── */

  /* ── Feature #23: Session Notes / Journal ──────────────────── */
  (function() {
    var JOURNAL_KEY = 'hoopai_journal';

    function getJournal() {
      try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]'); } catch(e) { return []; }
    }
    function saveJournal(entries) {
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
    }

    window.renderJournal = function() {
      var list = document.getElementById('journalList');
      if (!list) return;
      var entries = getJournal();
      if (!entries.length) {
        list.innerHTML = '<div class="journal-empty">No sessions logged yet. End a session to add notes.</div>';
        return;
      }
      list.innerHTML = entries.slice().reverse().slice(0, 20).map(function(e) {
        var noteHtml = e.note ? '<div class="journal-entry-note">' + e.note.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>' : '';
        return '<div class="journal-entry">' +
          '<div class="journal-entry-header">' +
            '<span class="journal-entry-date">' + e.date + '</span>' +
            '<span class="journal-entry-stats">' + e.makes + '/' + e.attempts + ' (' + e.pct + '%) ' + e.shotType + '</span>' +
          '</div>' + noteHtml + '</div>';
      }).join('');
    };

    // Hook saveSummary to capture note + stats
    var _origSaveNotes = window.saveSummary;
    window.saveSummary = function() {
      var noteEl = document.getElementById('sessionNotesInput');
      var note = noteEl ? noteEl.value.trim() : '';
      var makes = window.sessionMakes || 0;
      var attempts = window.sessionAttempts || 0;
      var misses = attempts - makes;
      var pct = attempts > 0 ? Math.round(makes / attempts * 100) : 0;
      var shotTypeEl = document.getElementById('summaryShotType');
      var shotType = shotTypeEl ? shotTypeEl.textContent : '--';
      var entry = {
        date: new Date().toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}),
        makes: makes, misses: misses, attempts: attempts, pct: pct,
        shotType: shotType, note: note, ts: Date.now()
      };
      var entries = getJournal();
      entries.push(entry);
      if (entries.length > 100) entries = entries.slice(-100);
      saveJournal(entries);
      if (noteEl) noteEl.value = '';
      if (_origSaveNotes) _origSaveNotes();
    };

    // Hook showTab to render journal when Progress opens
    var _origShowJournal = window.showTab;
    window.showTab = function(tab) {
      if (_origShowJournal) _origShowJournal(tab);
      if (tab === 'progress') setTimeout(window.renderJournal, 50);
    };

    document.addEventListener('DOMContentLoaded', window.renderJournal);
  })();
  /* ── End Feature #23 ────────────────────────────────────────── */

  /* ── Feature #22: Voice Feedback ───────────────────────────── */
  (function() {
    var VOICE_KEY = 'hoopai_voice_enabled';
    var synth = window.speechSynthesis || null;
    var voiceEnabled = localStorage.getItem(VOICE_KEY) === '1';

    function initToggle() {
      var chk = document.getElementById('voiceToggle');
      if (chk) chk.checked = voiceEnabled;
    }

    window.voiceToggleChanged = function(chk) {
      voiceEnabled = chk.checked;
      localStorage.setItem(VOICE_KEY, voiceEnabled ? '1' : '0');
      if (voiceEnabled && synth) {
        var u = new SpeechSynthesisUtterance("Voice feedback on");
        u.rate = 1.1; u.pitch = 1.1; u.volume = 0.8;
        synth.speak(u);
      }
    };

    function speak(text) {
      if (!voiceEnabled || !synth) return;
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.2; u.pitch = 1.0; u.volume = 1.0;
      synth.speak(u);
    }

    var MAKE_PHRASES = [
      "Nice shot!", "Money!", "Buckets!", "That's a make!", "Cash!",
      "Good shot!", "Splash!", "Nothing but net!", "Yes!"
    ];
    var MISS_PHRASES = [
      "Miss.", "Brick.", "No good.", "Off the mark.", "Keep shooting!",
      "Shake it off.", "Next one.", "Close!"
    ];
    function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    // Hook recordMake
    var _origMakeVoice = window.recordMake;
    window.recordMake = function(el) {
      if (_origMakeVoice) _origMakeVoice(el);
      speak(rand(MAKE_PHRASES));
    };

    // Hook recordMiss
    var _origMissVoice = window.recordMiss;
    window.recordMiss = function(el) {
      if (_origMissVoice) _origMissVoice(el);
      speak(rand(MISS_PHRASES));
    };

    document.addEventListener('DOMContentLoaded', initToggle);
  })();
  /* ── End Feature #22 ────────────────────────────────────────── */

  /* ── Feature #21: Shot Zone Heatmap ─────────────────────────── */
  (function() {
    var heatmapActive = false;
    var ZONE_IDS = ['paint','mid-left','mid-right','corner3-left','corner3-right'];
    // stat chip element IDs
    var ZONE_CENTERS = {
      'paint':         {x:'150', y:'70'},
      'mid-left':      {x:'67',  y:'50'},
      'mid-right':     {x:'233', y:'50'},
      'corner3-left':  {x:'25',  y:'45'},
      'corner3-right': {x:'275', y:'45'}
    };
    // heatmap color from cold→hot based on make%
    function heatColor(pct) {
      if (pct === null) return 'rgba(100,100,100,0.18)';
      if (pct >= 60) return 'rgba(244,67,54,0.72)';   // hot red
      if (pct >= 45) return 'rgba(255,152,0,0.65)';   // orange
      if (pct >= 30) return 'rgba(255,235,59,0.55)';  // yellow
      return 'rgba(33,150,243,0.45)';                  // cold blue
    }
    function getZoneStats() {
      var stats = {};
      ZONE_IDS.forEach(function(z) {
        var makes = parseInt(localStorage.getItem('hoopai_zone_makes_' + z) || '0');
        var misses = parseInt(localStorage.getItem('hoopai_zone_misses_' + z) || '0');
        var total = makes + misses;
        stats[z] = total > 0 ? { makes: makes, total: total, pct: Math.round(makes/total*100) } : null;
      });
      return stats;
    }
    function applyHeatmap() {
      var stats = getZoneStats();
      var svg = document.querySelector('#zonesCourt svg');
      if (!svg) return;
      // Remove old chips
      svg.querySelectorAll('.zone-stat-chip').forEach(function(el){ el.remove(); });
      ZONE_IDS.forEach(function(z) {
        var el = document.getElementById('zone-' + z);
        if (!el) return;
        var s = stats[z];
        el.style.fill = heatColor(s ? s.pct : null);
        el.style.opacity = '0.85';
        // Add % chip
        var c = ZONE_CENTERS[z];
        if (s && c) {
          var txt = document.createElementNS('http://www.w3.org/2000/svg','text');
          txt.setAttribute('x', c.x);
          txt.setAttribute('y', c.y);
          txt.setAttribute('text-anchor','middle');
          txt.setAttribute('dominant-baseline','middle');
          txt.setAttribute('font-size','10');
          txt.setAttribute('font-weight','800');
          txt.setAttribute('fill','#fff');
          txt.setAttribute('class','zone-stat-chip');
          txt.style.pointerEvents = 'none';
          txt.style.textShadow = '0 1px 3px rgba(0,0,0,0.9)';
          txt.textContent = s.pct + '%';
          svg.appendChild(txt);
        }
      });
    }
    function removeHeatmap() {
      var svg = document.querySelector('#zonesCourt svg');
      if (!svg) return;
      svg.querySelectorAll('.zone-stat-chip').forEach(function(el){ el.remove(); });
      ZONE_IDS.forEach(function(z) {
        var el = document.getElementById('zone-' + z);
        if (el) { el.style.fill = ''; el.style.opacity = ''; }
      });
    }
    window.toggleHeatmap = function() {
      heatmapActive = !heatmapActive;
      var btn = document.getElementById('heatmapToggleBtn');
      if (btn) {
        btn.textContent = heatmapActive ? 'Hide Heatmap' : 'Show Heatmap';
        btn.classList.toggle('active', heatmapActive);
      }
      if (heatmapActive) applyHeatmap(); else removeHeatmap();
    };
    window.refreshHeatmap = function() { if (heatmapActive) applyHeatmap(); };
    // Hook into showTab to refresh when Progress opens
    var _origShowHeat = window.showTab;
    window.showTab = function(tab) {
      if (_origShowHeat) _origShowHeat(tab);
      if (tab === 'progress' && heatmapActive) setTimeout(applyHeatmap, 50);
    };
  })();
  /* ── End Feature #21 ────────────────────────────────────────── */

  window.resetOnboarding = function() {
    localStorage.removeItem(DONE_KEY);
    currentStep = 0;
    var overlay = document.getElementById('onboardOverlay');
    if (overlay) overlay.classList.add('active');
    renderStep(0);
  };
})();


// ── Feature #6: Shooting Zones Heat Map ──
(function() {
  var ZONE_NAMES = { 'paint': 'Paint', 'mid-left': 'Mid-Left', 'mid-right': 'Mid-Right', 'corner3-left': 'Corner 3 Left', 'corner3-right': 'Corner 3 Right' };
  var ZONE_KEYS = { 'paint': 'hoopai_zone_paint', 'mid-left': 'hoopai_zone_midl', 'mid-right': 'hoopai_zone_midr', 'corner3-left': 'hoopai_zone_c3l', 'corner3-right': 'hoopai_zone_c3r' };
  var activeZone = null;

  function getZoneData(zone) {
    try { return JSON.parse(localStorage.getItem(ZONE_KEYS[zone])) || { makes: 0, attempts: 0 }; }
    catch(e) { return { makes: 0, attempts: 0 }; }
  }

  function saveZoneData(zone, data) {
    localStorage.setItem(ZONE_KEYS[zone], JSON.stringify(data));
  }

  function pctToColor(pct, attempts) {
    if (attempts === 0) return '#2196F3';
    if (pct >= 60) return '#F44336';
    if (pct >= 45) return '#FF6B35';
    if (pct >= 30) return '#4CAF50';
    return '#2196F3';
  }

  function refreshZoneColors() {
    Object.keys(ZONE_KEYS).forEach(function(zone) {
      var el = document.getElementById('zone-' + zone);
      if (!el) return;
      var d = getZoneData(zone);
      var pct = d.attempts > 0 ? Math.round((d.makes / d.attempts) * 100) : 0;
      el.setAttribute('fill', pctToColor(pct, d.attempts));
    });
  }

  window.zoneClick = function(zone, event) {
    activeZone = zone;
    var d = getZoneData(zone);
    var pct = d.attempts > 0 ? Math.round((d.makes / d.attempts) * 100) : '--';
    var label = ZONE_NAMES[zone] + ': ' + d.makes + '/' + d.attempts + ' (' + pct + '%)';
    document.getElementById('zoneTapLabel').textContent = label;
    document.getElementById('zoneTapModal').classList.add('visible');
    // Tooltip
    var tooltip = document.getElementById('zoneTooltip');
    if (tooltip) { tooltip.textContent = label; tooltip.classList.add('visible'); setTimeout(function(){ tooltip.classList.remove('visible'); }, 2000); }
  };

  window.zoneRecord = function(result) {
    if (!activeZone) return;
    var d = getZoneData(activeZone);
    d.attempts++;
    if (result === 'make') d.makes++;
    saveZoneData(activeZone, d);
    // Sync to flat keys read by computeAnalytics, drawShotChart, and the heatmap overlay
    var mkKey = 'hoopai_zone_makes_' + activeZone;
    var miKey = 'hoopai_zone_misses_' + activeZone;
    if (result === 'make') {
      localStorage.setItem(mkKey, parseInt(localStorage.getItem(mkKey) || '0') + 1);
    } else {
      localStorage.setItem(miKey, parseInt(localStorage.getItem(miKey) || '0') + 1);
    }
    if (window.refreshHeatmap) window.refreshHeatmap();
    refreshZoneColors();
    document.getElementById('zoneTapModal').classList.remove('visible');
    activeZone = null;
  };

  window.zoneCancel = function() {
    document.getElementById('zoneTapModal').classList.remove('visible');
    activeZone = null;
  };

  document.addEventListener('DOMContentLoaded', refreshZoneColors);
})();


// ── Feature #7: Daily Goal Setter ──
(function() {
  var CIRCUMFERENCE = 2 * Math.PI * 68; // ~427

  function getTodayKey() { return 'hoopai_goal_shots_' + new Date().toDateString(); }

  function getGoal() { return parseInt(localStorage.getItem('hoopai_daily_goal') || '50'); }

  function getTodayShots() { return parseInt(localStorage.getItem(getTodayKey()) || '0'); }

  function updateRing(shots, goal) {
    var pct = Math.min(shots / goal, 1);
    var offset = CIRCUMFERENCE * (1 - pct);
    var fill = document.getElementById('goalRingFill');
    var num = document.getElementById('goalRingNum');
    var label = document.getElementById('goalRingLabel');
    var msg = document.getElementById('goalCompleteMsg');
    if (!fill) return;
    fill.style.strokeDasharray = CIRCUMFERENCE;
    fill.style.strokeDashoffset = offset;
    if (pct >= 1) {
      fill.classList.add('complete');
      if (msg) msg.classList.add('visible');
    } else {
      fill.classList.remove('complete');
      if (msg) msg.classList.remove('visible');
    }
    if (num) num.textContent = shots;
    if (label) label.textContent = '/ ' + goal + ' shots';
    // Update preset active state
    document.querySelectorAll('.goal-preset-btn').forEach(function(btn) {
      btn.classList.toggle('active', parseInt(btn.textContent) === goal);
    });
  }

  window.setGoalPreset = function(n) {
    localStorage.setItem('hoopai_daily_goal', n);
    updateRing(getTodayShots(), n);
  };

  window.setGoalCustom = function() {
    var val = parseInt(document.getElementById('goalCustomInput').value);
    if (val > 0) { localStorage.setItem('hoopai_daily_goal', val); updateRing(getTodayShots(), val); }
  };

  // Hook into saveSummary to add today's shots
  var _origSave = window.saveSummary;
  window.saveSummary = function() {
    var todayKey = getTodayKey();
    var prev = parseInt(localStorage.getItem(todayKey) || '0');
    safeSetItem(todayKey, prev + (window.sessionAttempts || 0));
    updateRing(getTodayShots(), getGoal());
    if (_origSave) _origSave();
  };

  document.addEventListener('DOMContentLoaded', function() {
    updateRing(getTodayShots(), getGoal());
  });
})();


// ── Feature #8: Streak Tracker ──
(function() {
  function getStreak() { return parseInt(localStorage.getItem('hoopai_streak') || '0'); }
  function getBestStreak() { return parseInt(localStorage.getItem('hoopai_best_streak') || '0'); }
  function getLastSession() { return localStorage.getItem('hoopai_last_session') || ''; }

  function refreshStreakUI() {
    var streak = getStreak();
    var best = getBestStreak();
    var lastSession = getLastSession();
    var today = new Date().toDateString();
    var yesterday = new Date(Date.now() - 86400000).toDateString();

    var numEl = document.getElementById('streakNum');
    var bestEl = document.getElementById('streakBestNum');
    var card = document.getElementById('streakCard');
    var warning = document.getElementById('streakWarning');

    if (numEl) numEl.textContent = streak;
    if (bestEl) bestEl.textContent = best;

    // Active flame animation if streak > 0
    if (card) {
      card.classList.toggle('streak-active', streak > 0);
    }

    // Warning if last session was not today
    if (warning) {
      var atRisk = streak > 0 && lastSession !== today;
      warning.classList.toggle('visible', atRisk);
    }
  }

  function updateStreak() {
    var today = new Date().toDateString();
    var yesterday = new Date(Date.now() - 86400000).toDateString();
    var lastSession = getLastSession();
    var streak = getStreak();

    if (lastSession === today) {
      // Already saved today — no change
    } else if (lastSession === yesterday) {
      // Consecutive day — increment
      streak = streak + 1;
      safeSetItem('hoopai_streak', streak);
    } else if (lastSession === '') {
      // First ever session
      streak = 1;
      safeSetItem('hoopai_streak', streak);
    } else {
      // Missed a day — reset
      streak = 1;
      safeSetItem('hoopai_streak', streak);
    }

    var best = getBestStreak();
    if (streak > best) {
      safeSetItem('hoopai_best_streak', streak);
    }

    safeSetItem('hoopai_last_session', today);
    refreshStreakUI();
  }

  // Hook into saveSummary
  var _origSave2 = window.saveSummary;
  window.saveSummary = function() {
    if (_origSave2) _origSave2();
    updateStreak();
  };

  document.addEventListener('DOMContentLoaded', refreshStreakUI);
})();



// ── Feature #10: Sound Effects (Web Audio API) ──
(function() {
  var _audioCtx = null;
  function getCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
  }

  function isMuted() { return localStorage.getItem('hoopai_sound') === 'off'; }

  function playSwish() {
    if (isMuted()) return;
    try {
      var ctx = getCtx();
      var buf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3000;
      filter.Q.value = 0.8;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      src.start();
    } catch(e) {}
  }

  function playBuzzer() {
    if (isMuted()) return;
    try {
      var ctx = getCtx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } catch(e) {}
  }

  function playCheer() {
    if (isMuted()) return;
    try {
      var ctx = getCtx();
      [261, 329, 392, 523].forEach(function(freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.06);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.06 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.4);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.06);
        osc.stop(ctx.currentTime + i * 0.06 + 0.4);
      });
    } catch(e) {}
  }

  window.toggleSound = function() {
    var muted = isMuted();
    localStorage.setItem('hoopai_sound', muted ? 'on' : 'off');
    var btn = document.getElementById('soundToggle');
    if (btn) btn.textContent = muted ? '🔊' : '🔇';
    if (muted) playSwish(); // preview sound on unmute
  };

  // Expose for other features — patch existing sfx, preserve enhanced buzzer/cheer
  if (!window.sfx) window.sfx = {};
  window.sfx.swish = playSwish;
  window.sfx.buzzer = window.sfx.buzzer || playBuzzer;
  window.sfx.cheer = window.sfx.cheer || playCheer;

  // Hook into make/miss buttons (sound removed — Feature #38 handles sounds)
  var _origMake = window.recordMake;
  window.recordMake = function(el) { if (_origMake) _origMake(el); };

  var _origMiss = window.recordMiss;
  window.recordMiss = function(el) { if (_origMiss) _origMiss(el); };

  // Hook into goal completion cheer
  var _origUpdateRing = window.setGoalPreset;
  // Cheer fires when saveSummary triggers updateRing at 100%
  var _origSaveForSfx = window.saveSummary;
  window.saveSummary = function() {
    if (_origSaveForSfx) _origSaveForSfx();
    // Check if goal reached after save
    setTimeout(function() {
      var msg = document.getElementById('goalCompleteMsg');
      if (msg && msg.classList.contains('visible')) playCheer();
    }, 200);
  };

  document.addEventListener('DOMContentLoaded', function() {
    var muted = isMuted();
    var btn = document.getElementById('soundToggle');
    if (btn) btn.textContent = muted ? '🔇' : '🔊';
  });
})();


// ── Feature #11: AI Coach Tip Engine ──
(function() {
  var tips = [
    // Low make% tips
    { condition: function(m,a,t) { return a>=5 && (m/a)<0.35; }, text: "Your make rate is below 35% — slow down and focus on your follow-through. Hold your shooting hand up until the ball hits the rim.", label: "Make rate < 35%" },
    { condition: function(m,a,t) { return a>=5 && (m/a)<0.35; }, text: "When you're cold, shorten the distance. Move 2 feet closer and rebuild confidence before going back to your spot.", label: "Struggling session" },
    // Good make% tips
    { condition: function(m,a,t) { return a>=5 && (m/a)>=0.6; }, text: "You're shooting over 60%! 🔥 Now challenge yourself — take one step back on each made basket.", label: "Hot streak" },
    { condition: function(m,a,t) { return a>=5 && (m/a)>=0.5; }, text: "Great make rate! Add a dribble pull-up before shooting to simulate game situations.", label: "50%+ make rate" },
    // Shot type specific
    { condition: function(m,a,t) { return t==='three'; }, text: "On 3-pointers: your arc needs to be at least 45°. Think 'up' not 'out'. Aim for the top of the backboard square.", label: "3-Pointer selected" },
    { condition: function(m,a,t) { return t==='freethrow'; }, text: "Free throws are 100% routine. Same grip, same breath, same release every time. Repetition builds auto-pilot.", label: "Free Throw selected" },
    { condition: function(m,a,t) { return t==='layup'; }, text: "On layups: attack the basket at an angle, use the backboard, and release off the finger pads — not your palm.", label: "Layup selected" },
    { condition: function(m,a,t) { return t==='midrange'; }, text: "Mid-range kings win championships. Focus on a consistent landing spot — feet shoulder-width, land where you jumped.", label: "Mid-range selected" },
    // Volume tips
    { condition: function(m,a,t) { return a>=20; }, text: "20+ attempts — your legs might be getting tired. Check your base: bend your knees before every shot.", label: "High volume session" },
    { condition: function(m,a,t) { return a>=10 && a<20; }, text: "Good volume! Mix up your spots — try 3 makes from each zone before moving on to build consistency.", label: "10+ attempts" },
    // Early session
    { condition: function(m,a,t) { return a<5; }, text: "Warm up with layups and free throws first. Your shot gets 15% more accurate after a proper warm-up.", label: "Early session" },
    { condition: function(m,a,t) { return a===0; }, text: "Start close to the basket and work your way out. Build confidence before shooting deep.", label: "Session start" },
    // Always-on tips
    { condition: function() { return true; }, text: "Elite shooters take 500+ shots per week. Consistency over perfection — show up every day.", label: "Daily habit" },
    { condition: function() { return true; }, text: "Visualization works: before each shot, picture it going in. Studies show mental reps count as practice.", label: "Mental game" },
    { condition: function() { return true; }, text: "Film yourself shooting once a week. It takes 5 minutes and reveals problems you can't feel in the moment.", label: "Film study" },
    { condition: function() { return true; }, text: "Shooting is 60% legs. If your shot is short, your legs gave out — not your arm.", label: "Mechanics" },
    { condition: function() { return true; }, text: "The best free throw shooters use the same pre-shot routine every time. Build yours: bounce, breath, shoot.", label: "Routine" },
    { condition: function() { return true; }, text: "Practice at game speed. Slow practice creates slow game decisions. Attack each shot with intention.", label: "Game speed" },
    { condition: function() { return true; }, text: "Your shooting hand should be directly behind and under the ball. Your guide hand only steadies — it never pushes.", label: "Hand placement" },
    { condition: function() { return true; }, text: "Aim for the back of the rim, not the front. Back-rim aim gives you more room for error and better bank-in chances.", label: "Aim point" }
  ];

  var shownTipIdx = -1;
  var tipCycleIdx = 0;

  function getRelevantTips() {
    var m = window.sessionMakes || 0;
    var a = window.sessionAttempts || 0;
    var t = window.currentShotType || 'layup';
    return tips.filter(function(tip) { return tip.condition(m, a, t); });
  }

  function showTip(tip) {
    var el = document.getElementById('coachTipText');
    var cond = document.getElementById('coachCondition');
    if (!el) return;
    el.classList.remove('tip-animate');
    void el.offsetWidth;
    el.classList.add('tip-animate');
    el.textContent = tip.text;
    if (cond) cond.textContent = tip.label;
  }

  function refreshCoachTip() {
    var relevant = getRelevantTips();
    if (!relevant.length) return;
    tipCycleIdx = tipCycleIdx % relevant.length;
    showTip(relevant[tipCycleIdx]);
  }

  window.nextCoachTip = function() {
    var relevant = getRelevantTips();
    if (!relevant.length) return;
    tipCycleIdx = (tipCycleIdx + 1) % relevant.length;
    showTip(relevant[tipCycleIdx]);
  };

  // Auto-refresh every 5 shots
  var lastRefreshAt = 0;
  var _origMake3 = window.recordMake;
  window.recordMake = function(el) { if (_origMake3) _origMake3(el); checkAutoRefresh(); };
  var _origMiss3 = window.recordMiss;
  window.recordMiss = function(el) { if (_origMiss3) _origMiss3(el); checkAutoRefresh(); };

  function checkAutoRefresh() {
    var a = window.sessionAttempts || 0;
    if (a - lastRefreshAt >= 5) { lastRefreshAt = a; tipCycleIdx = 0; refreshCoachTip(); }
  }

  // Refresh on shot type change
  var _origSelectShot = window.selectShotType;
  window.selectShotType = function(el, type) { if (_origSelectShot) _origSelectShot(el, type); tipCycleIdx = 0; refreshCoachTip(); };

  document.addEventListener('DOMContentLoaded', refreshCoachTip);
})();


// ── Feature #12: Drill Library ──
(function() {
  window.toggleDrill = function(card) {
    var isOpen = card.classList.contains('open');
    document.querySelectorAll('.drill-card.open').forEach(function(c) { c.classList.remove('open'); });
    if (!isOpen) card.classList.add('open');
  };

  window.filterDrills = function(btn, cat) {
    document.querySelectorAll('.drill-filter-chip').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('.drill-card').forEach(function(card) {
      var cardCat = card.getAttribute('data-cat');
      card.style.display = (cat === 'all' || cardCat === cat) ? 'block' : 'none';
    });
  };

  var _origStartDrillLib = window.startDrill;
  window.startDrill = function(name) {
    if (_origStartDrillLib) _origStartDrillLib(name);
    var st = document.getElementById('statusText');
    if (st) st.textContent = '▶ Drill started: ' + name + ' — switch to Record tab to track shots!';
    // Store active drill name for timer feature
    window.activeDrillName = name;
    // Switch to record tab
    var recordTab = document.querySelector('[data-tab="record"]');
    if (recordTab) recordTab.click();
  };
})();


/* ─── FEATURE #26: DARK/LIGHT THEME TOGGLE ──────────────── */
(function() {
    var THEME_KEY = 'hoopai_theme';
    var btn = document.getElementById('themeToggle');

    function applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            if (btn) btn.textContent = '\u2600\ufe0f';
        } else {
            document.documentElement.removeAttribute('data-theme');
            if (btn) btn.textContent = '\ud83c\udf19';
        }
        localStorage.setItem(THEME_KEY, theme);
    }

    window.toggleTheme = function() {
        var current = localStorage.getItem(THEME_KEY) || 'dark';
        var btn = document.getElementById('themeToggle');
        if (btn) {
            btn.classList.remove('spinning');
            void btn.offsetWidth;
            btn.classList.add('spinning');
            setTimeout(function() { btn.classList.remove('spinning'); }, 450);
        }
        applyTheme(current === 'dark' ? 'light' : 'dark');
    };

    var saved = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(saved);
})();


/* ─── FEATURE #27: CONFETTI & CELEBRATION ANIMATIONS ────── */
(function() {
    var canvas = document.getElementById('confettiCanvas');
    var ctx = canvas ? canvas.getContext('2d') : null;
    var particles = [];
    var animId = null;
    var COLORS = ['#FF6B35','#FF8A5B','#FFD60A','#30D158','#0A84FF','#BF5AF2','#FF453A','#FFFFFF'];

    function resize() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    function Particle(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = Math.random() * -12 - 4;
        this.gravity = 0.4;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.w = Math.random() * 10 + 5;
        this.h = Math.random() * 6 + 3;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.3;
        this.alpha = 1;
        this.decay = Math.random() * 0.012 + 0.006;
    }

    function step() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles = particles.filter(function(p) { return p.alpha > 0.01; });
        particles.forEach(function(p) {
            p.x += p.vx;
            p.vy += p.gravity;
            p.y += p.vy;
            p.angle += p.spin;
            p.alpha -= p.decay;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });
        if (particles.length > 0) {
            animId = requestAnimationFrame(step);
        } else {
            canvas.style.display = 'none';
        }
    }

    function burst(x, y, count) {
        if (!canvas) return;
        canvas.style.display = 'block';
        for (var i = 0; i < count; i++) {
            particles.push(new Particle(x, y));
        }
        if (animId) cancelAnimationFrame(animId);
        step();
    }

    function showCelebToast(msg) {
        var t = document.getElementById('celebToast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(function() { t.classList.remove('show'); }, 2800);
    }

    window.triggerConfetti = function(msg) {
        var cx = window.innerWidth / 2;
        var cy = window.innerHeight * 0.4;
        burst(cx, cy, 120);
        if (msg) showCelebToast(msg);
    };

    // Hook: celebrate on milestone makes (every 5 makes in a session)
    var _origRecordMakeC = window.recordMake;
    window.recordMake = function() {
        if (_origRecordMakeC) _origRecordMakeC.apply(this, arguments);
        var makes = (window.sessionMakes || 0);
        if (makes > 0 && makes % 5 === 0) {
            var msgs = ['\uD83D\uDD25 ' + makes + ' makes! On fire!', '\uD83C\uDFC0 ' + makes + ' buckets! Keep going!', '\u2B50 ' + makes + ' makes! You\'re locked in!'];
            window.triggerConfetti(msgs[Math.floor(Math.random() * msgs.length)]);
        }
    };

    // Hook: celebrate session end with good accuracy
    var _origSaveSummaryC = window.saveSummary;
    window.saveSummary = function() {
        var makes = (window.sessionMakes || 0);
        var total = (window.sessionAttempts || 0);
        var pct = total > 0 ? Math.round(makes / total * 100) : 0;
        if (_origSaveSummaryC) _origSaveSummaryC.apply(this, arguments);
        if (makes >= 5 && pct >= 50) {
            setTimeout(function() {
                window.triggerConfetti('\uD83C\uDFC6 ' + pct + '% shooting — Great session!');
            }, 500);
        }
    };
})();


/* ─── FEATURE #28: OPPONENT SCOUTING NOTES ──────────────── */
(function() {
    var SCOUT_KEY = 'hoopai_scouts';

    function getScouts() {
        try { return JSON.parse(localStorage.getItem(SCOUT_KEY) || '[]'); } catch(e) { return []; }
    }
    function saveScouts(arr) { localStorage.setItem(SCOUT_KEY, JSON.stringify(arr)); }

    function renderScouts() {
        var list = document.getElementById('scoutList');
        if (!list) return;
        var scouts = getScouts();
        if (!scouts.length) {
            list.innerHTML = '<div class="journal-empty">No scouting reports yet.</div>';
            return;
        }
        list.innerHTML = scouts.slice().reverse().map(function(s, i) {
            var realIdx = scouts.length - 1 - i;
            return '<div class="scout-card">' +
                '<button class="scout-card-del" onclick="window.deleteScout(' + realIdx + ')">✕</button>' +
                '<div class="scout-card-name">🕵️ ' + s.name + '</div>' +
                '<div class="scout-card-notes">' + s.notes.replace(/</g,'&lt;') + '</div>' +
                '<div class="scout-card-date">' + new Date(s.ts).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) + '</div>' +
                '</div>';
        }).join('');
    }

    window.saveScout = function() {
        var nameEl = document.getElementById('scoutName');
        var notesEl = document.getElementById('scoutNotes');
        var name = (nameEl ? nameEl.value.trim() : '');
        var notes = (notesEl ? notesEl.value.trim() : '');
        if (!name) { if (nameEl) nameEl.focus(); return; }
        var scouts = getScouts();
        scouts.push({ name: name, notes: notes, ts: Date.now() });
        saveScouts(scouts);
        if (nameEl) nameEl.value = '';
        if (notesEl) notesEl.value = '';
        renderScouts();
    };

    window.deleteScout = function(idx) {
        var scouts = getScouts();
        scouts.splice(idx, 1);
        saveScouts(scouts);
        renderScouts();
    };

    // Render on load
    renderScouts();
})();


/* ─── FEATURE #29: WEEKLY GOAL SETTER ───────────────────── */
(function() {
    var WG_KEY = 'hoopai_weekly_goals';
    var GOALS = [
        { id: 'sessions', label: '📅 Sessions', key: 'hoopai_total_sessions', defaultTarget: 5 },
        { id: 'makes',    label: '🏀 Total Makes', key: 'hoopai_total_makes', defaultTarget: 200 },
        { id: 'streak',   label: '🔥 Day Streak', key: 'hoopai_streak', defaultTarget: 5 },
        { id: 'accuracy', label: '🎯 Avg Accuracy %', key: null, defaultTarget: 50 },
        { id: 'drills',   label: '⏱ Drills Done', key: 'hoopai_drills_done', defaultTarget: 10 }
    ];

    function getWG() {
        try { return JSON.parse(localStorage.getItem(WG_KEY) || '{}'); } catch(e) { return {}; }
    }
    function saveWG(obj) { localStorage.setItem(WG_KEY, JSON.stringify(obj)); }

    function getCurrentValue(goal) {
        if (goal.id === 'accuracy') {
            var makes = parseInt(localStorage.getItem('hoopai_total_makes') || '0');
            var atts  = parseInt(localStorage.getItem('hoopai_total_attempts') || '0');
            return atts > 0 ? Math.round(makes / atts * 100) : 0;
        }
        return parseInt(localStorage.getItem(goal.key) || '0');
    }

    function getWeekLabel() {
        var now = new Date();
        var day = now.getDay();
        var monday = new Date(now);
        monday.setDate(now.getDate() - ((day + 6) % 7));
        var sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        var fmt = function(d) { return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
        return 'Week of ' + fmt(monday) + ' – ' + fmt(sunday);
    }

    function renderWG() {
        var grid = document.getElementById('weeklyGoalGrid');
        var lbl  = document.getElementById('wgWeekLabel');
        if (!grid) return;
        if (lbl) lbl.textContent = getWeekLabel();
        var wg = getWG();
        grid.innerHTML = GOALS.map(function(g) {
            var target = parseInt(wg[g.id + '_target'] || g.defaultTarget);
            var val    = getCurrentValue(g);
            var pct    = Math.min(100, Math.round(val / target * 100));
            return '<div class="wg-item">' +
                '<div class="wg-item-header">' +
                    '<span class="wg-item-label">' + g.label + '</span>' +
                    '<span class="wg-item-count">' + val + ' / ' + target + '</span>' +
                '</div>' +
                '<div class="wg-bar-bg"><div class="wg-bar-fill" style="width:' + pct + '%"></div></div>' +
                '<div class="wg-item-target">' +
                    '<input class="wg-target-input" type="number" min="1" max="9999" value="' + target + '" ' +
                        'data-wgid="' + g.id + '" onchange="window.setWGTarget(this.dataset.wgid, this.value)" />' +
                    '<span class="wg-target-label">target</span>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    window.setWGTarget = function(id, val) {
        var wg = getWG();
        wg[id + '_target'] = Math.max(1, parseInt(val) || 1);
        saveWG(wg);
        renderWG();
    };

    window.resetWeeklyGoals = function() {
        saveWG({});
        renderWG();
    };

    renderWG();

    // Re-render weekly goals when tab becomes visible
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) renderWG();
    });

    // ── Weekly goal accumulators: write totals on session save ──
    var _origSaveWGAccum = window.saveSummary;
    window.saveSummary = function() {
        if (_origSaveWGAccum) _origSaveWGAccum();
        try {
            var hist = JSON.parse(localStorage.getItem('hoopai_session_history') || '[]');
            var totalMakes = 0, totalAttempts = 0;
            hist.forEach(function(s) {
                var m = s.makes || 0;
                var miss = s.misses || 0;
                totalMakes += m;
                totalAttempts += m + miss;
            });
            safeSetItem('hoopai_total_makes', totalMakes);
            safeSetItem('hoopai_total_attempts', totalAttempts);
            safeSetItem('hoopai_total_sessions', hist.length);
        } catch(e) {}
    };

    // Increment drills_done counter when a drill starts
    var _origStartDrillWG = window.startDrill;
    window.startDrill = function(name) {
        if (_origStartDrillWG) _origStartDrillWG(name);
        var done = parseInt(localStorage.getItem('hoopai_drills_done') || '0');
        safeSetItem('hoopai_drills_done', done + 1);
    };
})();


/* ─── FEATURE #30: OFFLINE SYNC INDICATOR ───────────────── */
(function() {
    var banner  = document.getElementById('offlineBanner');
    var bannerTxt = document.getElementById('offlineBannerText');
    var pill    = document.getElementById('offlinePill');
    var pillTxt = document.getElementById('offlinePillText');
    var bannerTimer = null;

    function showBanner(msg, isOnline) {
        if (!banner) return;
        if (bannerTimer) clearTimeout(bannerTimer);
        if (bannerTxt) bannerTxt.textContent = msg;
        banner.classList.toggle('online', !!isOnline);
        banner.classList.add('show');
        bannerTimer = setTimeout(function() {
            banner.classList.remove('show');
        }, 3000);
    }

    function updatePill(online) {
        if (!pill) return;
        if (online) {
            pill.classList.remove('offline-mode');
            pill.classList.remove('visible');
            if (pillTxt) pillTxt.textContent = 'Online';
        } else {
            pill.classList.add('offline-mode', 'visible');
            if (pillTxt) pillTxt.textContent = 'Offline';
        }
    }

    function handleOffline() {
        updatePill(false);
        showBanner('\u26a0\ufe0f  You\u2019re offline \u2014 data saved locally', false);
    }

    function handleOnline() {
        updatePill(true);
        showBanner('\u2705  Back online \u2014 all data synced', true);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);

    // Set initial state silently (no banner on load if online)
    if (!navigator.onLine) {
        updatePill(false);
    }
})();


/* ─── FEATURE #31: SHOT ACCURACY TRENDS ─────────────────── */
(function() {
    var HISTORY_KEY = 'hoopai_session_history';
    var chart = null;

    function getHistory() {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch(e) { return []; }
    }

    function renderTrend() {
        var canvas = document.getElementById('accuracyTrendCanvas');
        if (!canvas) return;
        var history = getHistory().slice(-30);
        if (!history.length) {
            document.getElementById('atBest').textContent = '—';
            document.getElementById('atAvg').textContent = '—';
            document.getElementById('atLatest').textContent = '—';
            return;
        }

        var labels = history.map(function(s, i) {
            if (s.date) {
                var d = new Date(s.date);
                return (d.getMonth()+1) + '/' + d.getDate();
            }
            return '#' + (i+1);
        });
        var data = history.map(function(s) {
            var total = (s.makes || 0) + (s.misses || 0);
            return total > 0 ? Math.round(s.makes / total * 100) : 0;
        });

        var best = Math.max.apply(null, data);
        var avg  = Math.round(data.reduce(function(a,b){return a+b;}, 0) / data.length);
        var latest = data[data.length - 1];

        var bestEl = document.getElementById('atBest');
        var avgEl = document.getElementById('atAvg');
        var latestEl = document.getElementById('atLatest');
        if (bestEl) bestEl.textContent = best + '%';
        if (avgEl) avgEl.textContent = avg + '%';
        if (latestEl) latestEl.textContent = latest + '%';

        if (typeof Chart === 'undefined') return;

        if (chart) chart.destroy();

        var ctx = canvas.getContext('2d');
        var brandColor = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#FF6B35';

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Accuracy %',
                    data: data,
                    borderColor: brandColor,
                    backgroundColor: 'rgba(255,107,53,0.1)',
                    borderWidth: 2.5,
                    pointRadius: data.length > 15 ? 0 : 3,
                    pointBackgroundColor: brandColor,
                    tension: 0.35,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) { return ctx.parsed.y + '%'; }
                        }
                    }
                },
                scales: {
                    y: {
                        min: 0, max: 100,
                        ticks: { callback: function(v) { return v + '%'; }, color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
                        grid: { color: 'rgba(255,255,255,0.06)' }
                    },
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 9 }, maxRotation: 0 },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Hook saveSummary to store session history for trend
    var _origSaveSummaryTrend = window.saveSummary;
    window.saveSummary = function() {
        var makes = (window.sessionMakes || 0);
        var misses = (window.sessionAttempts || 0) - (window.sessionMakes || 0);
        var history = getHistory();
        history.push({ makes: makes, misses: misses, date: Date.now() });
        if (history.length > 100) history = history.slice(-100);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        if (_origSaveSummaryTrend) _origSaveSummaryTrend.apply(this, arguments);
        renderTrend();
    };

    renderTrend();
    document.addEventListener('visibilitychange', function() { if (!document.hidden) renderTrend(); });
})();