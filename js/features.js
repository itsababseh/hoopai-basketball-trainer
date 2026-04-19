// ── Feature #32: Social Share Cards ──
(function() {
  function getLastSession() {
    try {
      var hist = JSON.parse(localStorage.getItem('hoopai_session_history') || '[]');
      if (hist.length > 0) return hist[hist.length - 1];
    } catch(e) {}
    return null;
  }

  function updateShareCard() {
    var session = getLastSession();
    var titleEl = document.getElementById('shareCardTitle');
    var dateEl = document.getElementById('shareCardDate');
    var makesEl = document.getElementById('shareStatMakes');
    var accEl = document.getElementById('shareStatAcc');
    var streakEl = document.getElementById('shareStatStreak');
    if (!titleEl) return;

    if (session) {
      var total = (session.makes || 0) + (session.misses || 0);
      var acc = total > 0 ? Math.round((session.makes / total) * 100) : 0;
      titleEl.textContent = 'Practice Session';
      dateEl.textContent = session.date || new Date().toLocaleDateString();
      makesEl.textContent = session.makes || 0;
      accEl.textContent = acc + '%';
      streakEl.textContent = session.streak || '-';
    } else {
      titleEl.textContent = 'No Session Yet';
      dateEl.textContent = 'Complete a session to share';
      makesEl.textContent = '0';
      accEl.textContent = '0%';
      streakEl.textContent = '0';
    }
  }

  function drawShareCard() {
    var canvas = document.getElementById('shareCanvas');
    if (!canvas) return null;
    var ctx = canvas.getContext('2d');
    var w = 600, h = 400;
    canvas.width = w;
    canvas.height = h;

    // Background gradient
    var grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Decorative circle
    ctx.beginPath();
    ctx.arc(w - 30, 30, 60, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,107,53,0.15)';
    ctx.fill();

    // Basketball emoji
    ctx.font = '48px serif';
    ctx.globalAlpha = 0.3;
    ctx.fillText('🏀', w - 70, 60);
    ctx.globalAlpha = 1;

    // Brand
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.letterSpacing = '2px';
    ctx.fillText('HOOPAI BASKETBALL', 30, 40);

    // Title
    var session = getLastSession();
    ctx.font = '800 32px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(session ? 'Practice Session' : 'No Session Yet', 30, 85);

    // Date
    ctx.font = '400 14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    var dateStr = session ? (session.date || new Date().toLocaleDateString()) : '';
    ctx.fillText(dateStr, 30, 110);

    // Stats
    var makes = session ? (session.makes || 0) : 0;
    var total = session ? (makes + (session.misses || 0)) : 0;
    var acc = total > 0 ? Math.round((makes / total) * 100) : 0;
    var streak = session ? (session.streak || '-') : '0';

    var stats = [
      { val: '' + makes, label: 'MAKES' },
      { val: acc + '%', label: 'ACCURACY' },
      { val: '' + streak, label: 'BEST STREAK' }
    ];

    var sx = 30;
    var colW = (w - 60) / 3;
    for (var i = 0; i < stats.length; i++) {
      var cx = sx + colW * i + colW / 2;
      ctx.font = '800 42px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(stats[i].val, cx, 200);
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(stats[i].label, cx, 225);
    }
    ctx.textAlign = 'left';

    // Footer
    ctx.font = '400 12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('hoopai.app • train smarter 🏀', w / 2, h - 25);
    ctx.textAlign = 'left';

    return canvas;
  }

  window.downloadShareCard = function() {
    var canvas = drawShareCard();
    if (!canvas) return;
    var link = document.createElement('a');
    link.download = 'hoopai-session.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  window.shareShareCard = function() {
    var canvas = drawShareCard();
    if (!canvas) return;
    canvas.toBlob(function(blob) {
      if (navigator.share && blob) {
        var file = new File([blob], 'hoopai-session.png', { type: 'image/png' });
        navigator.share({ title: 'My HoopAI Session', files: [file] }).catch(function() {});
      } else {
        // Fallback: download
        var link = document.createElement('a');
        link.download = 'hoopai-session.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }, 'image/png');
  };

  // Hook saveSummary to update share card
  var _origSaveSummaryShare = window.saveSummary;
  window.saveSummary = function() {
    if (_origSaveSummaryShare) _origSaveSummaryShare.apply(this, arguments);
    setTimeout(updateShareCard, 100);
  };

  // Initial render
  updateShareCard();
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) updateShareCard();
  });
})();


// ── Feature #33: Workout Plans ──
(function() {
  var PLANS = [
    {
      id: 'warmup-basics', name: '🔥 Warm-Up Basics', level: 'beginner',
      desc: 'Quick 10-minute warm-up to get your shot going.',
      drills: [
        { name: 'Form Shooting', detail: '10 shots from 5ft', reps: 10 },
        { name: 'Free Throws', detail: '10 free throws', reps: 10 },
        { name: 'Elbow Jumpers', detail: '5 from each elbow', reps: 10 },
        { name: 'Layup Lines', detail: '5 each side', reps: 10 }
      ]
    },
    {
      id: 'catch-and-shoot', name: '🎯 Catch & Shoot', level: 'intermediate',
      desc: 'Simulate game-speed catch-and-shoot situations.',
      drills: [
        { name: 'Corner 3s (Left)', detail: '10 shots', reps: 10 },
        { name: 'Corner 3s (Right)', detail: '10 shots', reps: 10 },
        { name: 'Wing 3s (Left)', detail: '10 shots', reps: 10 },
        { name: 'Wing 3s (Right)', detail: '10 shots', reps: 10 },
        { name: 'Top of Key 3s', detail: '10 shots', reps: 10 }
      ]
    },
    {
      id: 'mid-range-master', name: '🏀 Mid-Range Master', level: 'intermediate',
      desc: 'Develop a deadly mid-range game from all spots.',
      drills: [
        { name: 'Baseline Pull-Up', detail: '8 shots each side', reps: 16 },
        { name: 'Free Throw Line Extended', detail: '10 shots', reps: 10 },
        { name: 'Elbow Fadeaway', detail: '5 each elbow', reps: 10 },
        { name: 'High Post Turnaround', detail: '10 shots', reps: 10 }
      ]
    },
    {
      id: 'full-court-grind', name: '💪 Full Court Grind', level: 'advanced',
      desc: 'Intense 30-minute full workout covering all zones.',
      drills: [
        { name: 'Layups (both hands)', detail: '10 each hand', reps: 20 },
        { name: 'Free Throws', detail: '15 shots', reps: 15 },
        { name: 'Mid-Range Circuit', detail: '5 spots x 4 shots', reps: 20 },
        { name: '3-Point Circuit', detail: '5 spots x 4 shots', reps: 20 },
        { name: 'Pressure Free Throws', detail: '10 shots (must make 8)', reps: 10 },
        { name: 'Game Winners', detail: '5 clutch shots', reps: 5 }
      ]
    }
  ];

  var progressKey = 'hoopai_workout_progress';

  function getProgress() {
    try { return JSON.parse(localStorage.getItem(progressKey) || '{}'); } catch(e) { return {}; }
  }

  function saveProgress(p) {
    localStorage.setItem(progressKey, JSON.stringify(p));
  }

  function renderPlans() {
    var container = document.getElementById('workoutPlansList');
    if (!container) return;
    var progress = getProgress();
    var h = '';
    for (var i = 0; i < PLANS.length; i++) {
      var p = PLANS[i];
      var pp = progress[p.id] || {};
      var doneCount = 0;
      for (var j = 0; j < p.drills.length; j++) {
        if (pp['d' + j]) doneCount++;
      }
      var allDone = doneCount === p.drills.length;
      var chips = '';
      for (var k = 0; k < p.drills.length; k++) {
        chips += '<span class="workout-drill-chip">' + p.drills[k].name + '</span>';
      }
      var steps = '';
      for (var s = 0; s < p.drills.length; s++) {
        var checked = pp['d' + s] ? ' checked' : '';
        steps += '<div class="workout-step">' +
          '<div class="workout-step-num">' + (s + 1) + '</div>' +
          '<div class="workout-step-info"><div class="workout-step-name">' + p.drills[s].name + '</div>' +
          '<div class="workout-step-detail">' + p.drills[s].detail + ' (' + p.drills[s].reps + ' reps)</div></div>' +
          '<div class="workout-step-done' + checked + '" data-plan="' + p.id + '" data-drill="' + s + '" onclick="window.toggleWorkoutDrill(this)"></div>' +
          '</div>';
      }
      h += '<div class="workout-plan-card" data-plan-id="' + p.id + '" onclick="window.togglePlanExpand(this)">' +
        '<div class="workout-plan-header"><span class="workout-plan-name">' + p.name + (allDone ? ' ✅' : '') + '</span>' +
        '<span class="workout-plan-badge ' + p.level + '">' + p.level + '</span></div>' +
        '<div class="workout-plan-desc">' + p.desc + '</div>' +
        '<div class="workout-plan-drills">' + chips + '</div>' +
        '<div class="workout-plan-expanded" onclick="event.stopPropagation()">' + steps +
        '<button class="workout-start-btn" onclick="event.stopPropagation(); window.resetWorkoutPlan(\'' + p.id + '\')">🔄 Reset Plan</button>' +
        '</div></div>';
    }
    container.innerHTML = h;
  }

  window.togglePlanExpand = function(card) {
    var wasExpanded = card.classList.contains('expanded');
    var all = document.querySelectorAll('.workout-plan-card');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('expanded');
    if (!wasExpanded) card.classList.add('expanded');
  };

  window.toggleWorkoutDrill = function(el) {
    el.classList.toggle('checked');
    var planId = el.getAttribute('data-plan');
    var drillIdx = el.getAttribute('data-drill');
    var progress = getProgress();
    if (!progress[planId]) progress[planId] = {};
    progress[planId]['d' + drillIdx] = el.classList.contains('checked');
    saveProgress(progress);
    // Re-render to update completion badge
    setTimeout(renderPlans, 50);
  };

  window.resetWorkoutPlan = function(planId) {
    var progress = getProgress();
    delete progress[planId];
    saveProgress(progress);
    renderPlans();
  };

  renderPlans();
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) renderPlans();
  });
})();


// ── Feature #34: Practice Reminders ──
(function() {
  var STORE_KEY = 'hoopai_reminders';
  var DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function getReminders() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch(e) { return []; }
  }

  function saveReminders(r) {
    localStorage.setItem(STORE_KEY, JSON.stringify(r));
  }

  function formatDay(d) {
    if (d === 'daily') return 'Every Day';
    if (d === 'weekdays') return 'Weekdays';
    if (d === 'weekends') return 'Weekends';
    return DAY_NAMES[parseInt(d)] || d;
  }

  function formatTime(t) {
    var parts = t.split(':');
    var h = parseInt(parts[0]);
    var m = parts[1];
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ampm;
  }

  function renderReminders() {
    var list = document.getElementById('reminderList');
    if (!list) return;
    var reminders = getReminders();
    if (reminders.length === 0) {
      list.innerHTML = '<div class="reminder-empty">No reminders set. Add one above!</div>';
      return;
    }
    var h = '';
    for (var i = 0; i < reminders.length; i++) {
      var r = reminders[i];
      var onClass = r.enabled ? ' on' : '';
      h += '<div class="reminder-item">' +
        '<div class="reminder-item-icon">🏀</div>' +
        '<div class="reminder-item-info">' +
          '<div class="reminder-item-day">' + formatDay(r.day) + '</div>' +
          '<div class="reminder-item-time">' + formatTime(r.time) + '</div>' +
        '</div>' +
        '<button class="reminder-item-toggle' + onClass + '" onclick="event.stopPropagation(); window.toggleReminder(' + i + ')"></button>' +
        '<button class="reminder-item-del" onclick="window.deleteReminder(' + i + ')">✕</button>' +
        '</div>';
    }
    list.innerHTML = h;
  }

  window.addReminder = function() {
    var dayEl = document.getElementById('reminderDay');
    var timeEl = document.getElementById('reminderTime');
    if (!dayEl || !timeEl) return;
    var reminders = getReminders();
    reminders.push({ day: dayEl.value, time: timeEl.value, enabled: true });
    saveReminders(reminders);
    renderReminders();
  };

  window.toggleReminder = function(idx) {
    var reminders = getReminders();
    if (reminders[idx]) {
      reminders[idx].enabled = !reminders[idx].enabled;
      saveReminders(reminders);
      renderReminders();
    }
  };

  window.deleteReminder = function(idx) {
    var reminders = getReminders();
    reminders.splice(idx, 1);
    saveReminders(reminders);
    renderReminders();
  };

  function showNotification(msg) {
    var el = document.getElementById('reminderNotif');
    if (!el) return;
    el.textContent = msg || '🏀 Time to practice!';
    el.classList.add('show');
    setTimeout(function() { el.classList.remove('show'); }, 5000);
    // Also try browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('HoopAI', { body: msg || 'Time to practice! 🏀', icon: '🏀' });
    }
  }

  // Check reminders every 30 seconds
  function checkReminders() {
    var reminders = getReminders();
    var now = new Date();
    var day = now.getDay();
    var hhmm = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
    for (var i = 0; i < reminders.length; i++) {
      var r = reminders[i];
      if (!r.enabled) continue;
      if (r.time !== hhmm) continue;
      var match = false;
      if (r.day === 'daily') match = true;
      else if (r.day === 'weekdays' && day >= 1 && day <= 5) match = true;
      else if (r.day === 'weekends' && (day === 0 || day === 6)) match = true;
      else if (parseInt(r.day) === day) match = true;
      if (match && !r._fired) {
        showNotification('🏀 Time to practice! (' + formatDay(r.day) + ' ' + formatTime(r.time) + ')');
        r._fired = hhmm;
      }
    }
  }

  var _reminderInterval = setInterval(checkReminders, 30000);
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) { clearInterval(_reminderInterval); }
    else { _reminderInterval = setInterval(checkReminders, 30000); }
  });

  // Request notification permission on first interaction
  document.addEventListener('click', function reqPerm() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    document.removeEventListener('click', reqPerm);
  }, { once: true });

  renderReminders();
})();


// ── Feature #35: Player Profiles ──
(function() {
  var STORE_KEY = 'hoopai_player_profile';

  function getProfile() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch(e) { return {}; }
  }

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  function getCareerStats() {
    var sessions = 0, totalMakes = 0, totalShots = 0;
    try {
      var hist = JSON.parse(localStorage.getItem('hoopai_session_history') || '[]');
      sessions = hist.length;
      for (var i = 0; i < hist.length; i++) {
        totalMakes += hist[i].makes || 0;
        totalShots += (hist[i].makes || 0) + (hist[i].misses || 0);
      }
    } catch(e) {}
    var avgAcc = totalShots > 0 ? Math.round((totalMakes / totalShots) * 100) : 0;
    return { sessions: sessions, makes: totalMakes, avgAcc: avgAcc };
  }

  function renderProfile() {
    var profile = getProfile();
    var avatarEl = document.getElementById('playerAvatar');
    var nameEl = document.getElementById('playerNameDisplay');
    var posEl = document.getElementById('playerPositionDisplay');
    var nameInput = document.getElementById('ppName');
    var posInput = document.getElementById('ppPosition');
    var jerseyInput = document.getElementById('ppJersey');
    var sessEl = document.getElementById('ppTotalSessions');
    var makesEl = document.getElementById('ppTotalMakes');
    var accEl = document.getElementById('ppAvgAcc');

    if (!avatarEl) return;

    if (profile.name) {
      avatarEl.textContent = getInitials(profile.name);
      nameEl.textContent = profile.name + (profile.jersey ? ' #' + profile.jersey : '');
      var posNames = { PG: 'Point Guard', SG: 'Shooting Guard', SF: 'Small Forward', PF: 'Power Forward', C: 'Center' };
      posEl.textContent = posNames[profile.position] || 'Basketball Player';
    } else {
      avatarEl.textContent = '?';
      nameEl.textContent = 'Set Up Your Profile';
      posEl.textContent = 'Tap save to get started';
    }

    if (nameInput) nameInput.value = profile.name || '';
    if (posInput) posInput.value = profile.position || '';
    if (jerseyInput) jerseyInput.value = profile.jersey || '';

    var stats = getCareerStats();
    if (sessEl) sessEl.textContent = stats.sessions;
    if (makesEl) makesEl.textContent = stats.makes;
    if (accEl) accEl.textContent = stats.avgAcc + '%';
  }

  window.savePlayerProfile = function() {
    var name = (document.getElementById('ppName') || {}).value || '';
    var position = (document.getElementById('ppPosition') || {}).value || '';
    var jersey = (document.getElementById('ppJersey') || {}).value || '';
    localStorage.setItem(STORE_KEY, JSON.stringify({ name: name.trim(), position: position, jersey: jersey.trim() }));
    renderProfile();
  };

  // Hook saveSummary to refresh stats
  var _origSaveSummaryProfile = window.saveSummary;
  window.saveSummary = function() {
    if (_origSaveSummaryProfile) _origSaveSummaryProfile.apply(this, arguments);
    setTimeout(renderProfile, 150);
  };

  renderProfile();
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) renderProfile();
  });
})();


// ── Feature #36: Per-Zone Accuracy Trends ──
(function() {
  var STORE_KEY = 'hoopai_zone_history';
  var ZONES = [
    { id: 'paint', name: 'Paint' },
    { id: 'midLeft', name: 'Mid Left' },
    { id: 'midRight', name: 'Mid Right' },
    { id: 'freeThrow', name: 'Free Throw' },
    { id: 'three_left', name: '3PT Left' },
    { id: 'three_right', name: '3PT Right' },
    { id: 'three_top', name: '3PT Top' },
    { id: 'corner_left', name: 'Corner L' },
    { id: 'corner_right', name: 'Corner R' }
  ];

  var activeZone = ZONES[0].id;
  var chartInstance = null;

  function getZoneHistory() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch(e) { return {}; }
  }

  function saveZoneHistory(h) {
    localStorage.setItem(STORE_KEY, JSON.stringify(h));
  }

  function renderTabs() {
    var container = document.getElementById('zoneTrendTabs');
    if (!container) return;
    var h = '';
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      var cls = z.id === activeZone ? ' active' : '';
      h += '<div class="zone-trend-tab' + cls + '" data-zone="' + z.id + '" onclick="window.selectZoneTrend(\'' + z.id + '\')">' + z.name + '</div>';
    }
    container.innerHTML = h;
  }

  function renderChart() {
    var canvas = document.getElementById('zoneTrendChart');
    if (!canvas) return;
    var history = getZoneHistory();
    var zoneData = history[activeZone] || [];
    var summaryEl = document.getElementById('zoneTrendSummary');

    if (zoneData.length === 0) {
      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
      canvas.style.display = 'none';
      if (summaryEl) summaryEl.innerHTML = '<div class="zone-trend-empty" style="grid-column:1/-1">No data for this zone yet. Start shooting!</div>';
      return;
    }

    canvas.style.display = 'block';
    var last20 = zoneData.slice(-20);
    var labels = [];
    var values = [];
    for (var i = 0; i < last20.length; i++) {
      labels.push('S' + (i + 1));
      var total = (last20[i].makes || 0) + (last20[i].misses || 0);
      values.push(total > 0 ? Math.round((last20[i].makes / total) * 100) : 0);
    }

    var best = Math.max.apply(null, values);
    var avg = Math.round(values.reduce(function(a, b) { return a + b; }, 0) / values.length);
    var latest = values[values.length - 1];

    if (summaryEl) {
      summaryEl.innerHTML =
        '<div class="zone-trend-stat"><div class="zone-trend-stat-val">' + best + '%</div><div class="zone-trend-stat-label">Best</div></div>' +
        '<div class="zone-trend-stat"><div class="zone-trend-stat-val">' + avg + '%</div><div class="zone-trend-stat-label">Average</div></div>' +
        '<div class="zone-trend-stat"><div class="zone-trend-stat-val">' + latest + '%</div><div class="zone-trend-stat-label">Latest</div></div>';
    }

    if (chartInstance) chartInstance.destroy();

    var ctx = canvas.getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Accuracy %',
          data: values,
          borderColor: '#FF6B35',
          backgroundColor: 'rgba(255,107,53,0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#FF6B35'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100, ticks: { color: 'rgba(255,255,255,0.4)', callback: function(v) { return v + '%'; } }, grid: { color: 'rgba(255,255,255,0.06)' } },
          x: { ticks: { color: 'rgba(255,255,255,0.4)' }, grid: { display: false } }
        }
      }
    });
  }

  window.selectZoneTrend = function(zoneId) {
    activeZone = zoneId;
    renderTabs();
    renderChart();
  };

  // Hook recordMake and recordMiss to track zone data
  window.recordZoneShot = function(zoneId, made) {
    if (!zoneId) return;
    var history = getZoneHistory();
    if (!history[zoneId]) history[zoneId] = [];
    var entries = history[zoneId];
    var today = new Date().toLocaleDateString();
    var last = entries.length > 0 ? entries[entries.length - 1] : null;
    if (last && last.date === today) {
      if (made) last.makes = (last.makes || 0) + 1;
      else last.misses = (last.misses || 0) + 1;
    } else {
      var entry = { date: today, makes: 0, misses: 0 };
      if (made) entry.makes = 1; else entry.misses = 1;
      entries.push(entry);
    }
    if (entries.length > 50) entries.splice(0, entries.length - 50);
    saveZoneHistory(history);
  };

  // Hook into existing zone tap if available
  var _origRecordMakeZT = window.recordMake;
  window.recordMake = function(zone) {
    if (_origRecordMakeZT) _origRecordMakeZT.apply(this, arguments);
    if (zone && typeof zone === 'string') window.recordZoneShot(zone, true);
  };

  var _origRecordMissZT = window.recordMiss;
  window.recordMiss = function(zone) {
    if (_origRecordMissZT) _origRecordMissZT.apply(this, arguments);
    if (zone && typeof zone === 'string') window.recordZoneShot(zone, false);
  };

  renderTabs();
  renderChart();
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) renderChart();
  });
})();


// ── Feature #37: Video Clip Bookmarks ──
(function() {
  var STORE_KEY = 'hoopai_video_bookmarks';

  function getBookmarks() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch(e) { return []; }
  }

  function saveBookmarks(b) {
    localStorage.setItem(STORE_KEY, JSON.stringify(b));
  }

  function getYouTubeId(url) {
    var match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  function renderBookmarks() {
    var container = document.getElementById('videoBookmarkList');
    if (!container) return;
    var bookmarks = getBookmarks();
    if (bookmarks.length === 0) {
      container.innerHTML = '<div class="video-bm-empty">No bookmarks yet. Save a video clip above!</div>';
      return;
    }
    var h = '';
    for (var i = bookmarks.length - 1; i >= 0; i--) {
      var b = bookmarks[i];
      var ytId = getYouTubeId(b.url || '');
      var thumbStyle = '';
      var thumbContent = '<div class="video-bm-thumb-icon">▶️</div>';
      if (ytId) {
        thumbStyle = ' style="background-image:url(https://img.youtube.com/vi/' + ytId + '/mqdefault.jpg);background-size:cover;background-position:center;"';
        thumbContent = '<div class="video-bm-thumb-icon" style="text-shadow:0 2px 8px rgba(0,0,0,0.5)">▶️</div>';
      }
      var tags = '';
      if (b.tags && b.tags.length) {
        for (var t = 0; t < b.tags.length; t++) {
          tags += '<span class="video-bm-tag">' + b.tags[t] + '</span>';
        }
      }
      h += '<div class="video-bm-card">' +
        '<div class="video-bm-thumb" onclick="window.playVideoBookmark(' + i + ')"' + thumbStyle + '>' +
        thumbContent +
        (b.timestamp ? '<div class="video-bm-thumb-time">' + b.timestamp + '</div>' : '') +
        '</div>' +
        '<div class="video-bm-info">' +
          '<div class="video-bm-title">' + (b.title || 'Untitled Clip') + '</div>' +
          '<div class="video-bm-meta"><span class="video-bm-date">' + (b.date || '') + '</span><div class="video-bm-tags">' + tags + '</div></div>' +
        '</div>' +
        '<div class="video-bm-actions">' +
          '<button class="video-bm-play" onclick="window.playVideoBookmark(' + i + ')">▶ Play</button>' +
          '<button class="video-bm-del" onclick="window.deleteVideoBookmark(' + i + ')">✕ Delete</button>' +
        '</div>' +
        '</div>';
    }
    container.innerHTML = h;
  }

  window.addVideoBookmark = function() {
    var url = (document.getElementById('vbmUrl') || {}).value || '';
    var title = (document.getElementById('vbmTitle') || {}).value || '';
    var timestamp = (document.getElementById('vbmTimestamp') || {}).value || '';
    var tagsRaw = (document.getElementById('vbmTags') || {}).value || '';
    if (!url.trim()) return;
    var tags = tagsRaw.split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t.length > 0; });
    var bookmarks = getBookmarks();
    bookmarks.push({
      url: url.trim(),
      title: title.trim() || 'Untitled Clip',
      timestamp: timestamp.trim(),
      tags: tags,
      date: new Date().toLocaleDateString()
    });
    saveBookmarks(bookmarks);
    // Clear form
    if (document.getElementById('vbmUrl')) document.getElementById('vbmUrl').value = '';
    if (document.getElementById('vbmTitle')) document.getElementById('vbmTitle').value = '';
    if (document.getElementById('vbmTimestamp')) document.getElementById('vbmTimestamp').value = '';
    if (document.getElementById('vbmTags')) document.getElementById('vbmTags').value = '';
    renderBookmarks();
  };

  window.playVideoBookmark = function(idx) {
    var bookmarks = getBookmarks();
    var b = bookmarks[idx];
    if (!b || !b.url) return;
    var url = b.url;
    // Append YouTube timestamp if present
    if (b.timestamp) {
      var parts = b.timestamp.split(':');
      var secs = 0;
      for (var i = 0; i < parts.length; i++) {
        secs = secs * 60 + parseInt(parts[i] || 0);
      }
      if (url.indexOf('youtube') > -1 || url.indexOf('youtu.be') > -1) {
        url += (url.indexOf('?') > -1 ? '&' : '?') + 't=' + secs;
      }
    }
    window.open(url, '_blank');
  };

  window.deleteVideoBookmark = function(idx) {
    var bookmarks = getBookmarks();
    bookmarks.splice(idx, 1);
    saveBookmarks(bookmarks);
    renderBookmarks();
  };

  renderBookmarks();
})();


// ── Feature #38: Custom Sound Pack ──
(function() {
  var STORE_KEY = 'hoopai_sound_settings';
  var audioCtx = null;

  var PACKS = [
    { id: 'classic', icon: '🏀', name: 'Classic', desc: 'Traditional gym sounds',
      make: { freq: 800, type: 'sine', dur: 0.15 },
      miss: { freq: 300, type: 'square', dur: 0.2 },
      streak: { freq: [523, 659, 784], type: 'sine', dur: 0.12 } },
    { id: 'arcade', icon: '🕹️', name: 'Arcade', desc: 'Retro game sounds',
      make: { freq: 1200, type: 'square', dur: 0.08 },
      miss: { freq: 200, type: 'sawtooth', dur: 0.25 },
      streak: { freq: [660, 880, 1100, 1320], type: 'square', dur: 0.08 } },
    { id: 'minimal', icon: '🔔', name: 'Minimal', desc: 'Soft clean tones',
      make: { freq: 660, type: 'sine', dur: 0.1 },
      miss: { freq: 220, type: 'sine', dur: 0.15 },
      streak: { freq: [440, 554, 660], type: 'sine', dur: 0.15 } },
    { id: 'hype', icon: '🔥', name: 'Hype', desc: 'Energy-packed sounds',
      make: { freq: 1000, type: 'sawtooth', dur: 0.1 },
      miss: { freq: 150, type: 'triangle', dur: 0.3 },
      streak: { freq: [523, 784, 1047, 1318], type: 'sawtooth', dur: 0.07 } }
  ];

  function getSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return { pack: s.pack || 'classic', enabled: s.enabled !== false, volume: s.volume != null ? s.volume : 70 };
    } catch(e) { return { pack: 'classic', enabled: true, volume: 70 }; }
  }

  function saveSettings(s) {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  }

  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playTone(freq, type, duration, vol) {
    try {
      var ctx = getAudioCtx();
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      gain.connect(ctx.destination);
      var osc = ctx.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.connect(gain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch(e) {}
  }

  function playSound(soundType) {
    var settings = getSettings();
    if (!settings.enabled) return;
    var pack = null;
    for (var i = 0; i < PACKS.length; i++) {
      if (PACKS[i].id === settings.pack) { pack = PACKS[i]; break; }
    }
    if (!pack) return;
    var vol = (settings.volume / 100) * 0.3;
    var sound = pack[soundType];
    if (!sound) return;
    if (Array.isArray(sound.freq)) {
      for (var j = 0; j < sound.freq.length; j++) {
        (function(f, delay) {
          setTimeout(function() { playTone(f, sound.type, sound.dur, vol); }, delay);
        })(sound.freq[j], j * 100);
      }
    } else {
      playTone(sound.freq, sound.type, sound.dur, vol);
    }
  }

  function renderPacks() {
    var container = document.getElementById('soundPackGrid');
    if (!container) return;
    var settings = getSettings();
    var h = '';
    for (var i = 0; i < PACKS.length; i++) {
      var p = PACKS[i];
      var sel = p.id === settings.pack ? ' selected' : '';
      h += '<div class="sound-pack-card' + sel + '" onclick="window.selectSoundPack(\'' + p.id + '\')">' +
        '<div class="sound-pack-icon">' + p.icon + '</div>' +
        '<div class="sound-pack-name">' + p.name + '</div>' +
        '<div class="sound-pack-desc">' + p.desc + '</div>' +
        '<div class="sound-pack-check">✓ Selected</div>' +
        '</div>';
    }
    container.innerHTML = h;
    // Update toggle
    var toggle = document.getElementById('soundEnabledToggle');
    if (toggle) { if (settings.enabled) toggle.classList.add('on'); else toggle.classList.remove('on'); }
    var slider = document.getElementById('soundVolume');
    if (slider) slider.value = settings.volume;
    var label = document.getElementById('soundVolumeLabel');
    if (label) label.textContent = settings.volume + '%';
  }

  window.selectSoundPack = function(packId) {
    var s = getSettings(); s.pack = packId; saveSettings(s);
    renderPacks();
    playSound('make');
  };

  window.toggleSoundEnabled = function() {
    var s = getSettings(); s.enabled = !s.enabled; saveSettings(s);
    renderPacks();
  };

  window.setSoundVolume = function(val) {
    var s = getSettings(); s.volume = parseInt(val); saveSettings(s);
    var label = document.getElementById('soundVolumeLabel');
    if (label) label.textContent = val + '%';
  };

  window.testSound = function(type) {
    playSound(type);
  };

  // Expose global for other features to use
  window.hoopPlaySound = playSound;

  // Hook recordMake / recordMiss
  var _origRecordMakeSnd = window.recordMake;
  window.recordMake = function() {
    if (_origRecordMakeSnd) _origRecordMakeSnd.apply(this, arguments);
    playSound('make');
    if (window.refreshHeatmap) window.refreshHeatmap();
  };

  var _origRecordMissSnd = window.recordMiss;
  window.recordMiss = function() {
    if (_origRecordMissSnd) _origRecordMissSnd.apply(this, arguments);
    playSound('miss');
    if (window.refreshHeatmap) window.refreshHeatmap();
  };

  renderPacks();
})();


// ── Feature #39: Data Backup & Restore ──
(function() {
  function getHoopAIKeys() {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf('hoopai_') === 0) keys.push(key);
    }
    return keys;
  }

  function showBackupStatus(msg, type) {
    var el = document.getElementById('backupStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = 'backup-status ' + type;
    setTimeout(function() { el.className = 'backup-status'; }, 3000);
  }

  function updateBackupInfo() {
    var container = document.getElementById('backupInfoChips');
    if (!container) return;
    var count = 0; var totalSize = 0;
    getHoopAIKeys().forEach(function(key) {
      var val = localStorage.getItem(key);
      if (val) { count++; totalSize += val.length * 2; }
    });
    var sizeStr = totalSize < 1024 ? totalSize + ' B' :
                  totalSize < 1048576 ? (totalSize / 1024).toFixed(1) + ' KB' :
                  (totalSize / 1048576).toFixed(1) + ' MB';
    container.innerHTML =
      '<span class="backup-info-chip">📊 ' + count + ' data keys</span>' +
      '<span class="backup-info-chip">💾 ' + sizeStr + '</span>';
  }

  window.exportBackup = function() {
    try {
      var data = {};
      getHoopAIKeys().forEach(function(key) {
        var val = localStorage.getItem(key);
        if (val !== null) data[key] = val;
      });
      data._hoopai_backup = true;
      data._exported_at = new Date().toISOString();
      data._version = '1.0';
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'hoopai-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showBackupStatus('✅ Backup downloaded!', 'success');
    } catch (e) {
      showBackupStatus('❌ Export failed: ' + e.message, 'error');
    }
  };

  window.importBackup = function(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!data._hoopai_backup) {
          showBackupStatus('❌ Not a valid HoopAI backup file', 'error');
          return;
        }
        if (!confirm('This will overwrite your current data with the backup. Continue?')) return;
        var restored = 0;
        Object.keys(data).forEach(function(key) {
          if (key.indexOf('hoopai_') === 0) {
            localStorage.setItem(key, data[key]);
            restored++;
          }
        });
        showBackupStatus('✅ Restored ' + restored + ' data keys!', 'success');
        updateBackupInfo();
        setTimeout(function() { location.reload(); }, 1500);
      } catch (err) {
        showBackupStatus('❌ Invalid backup file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  window.clearAllData = function() {
    if (!confirm('⚠️ Delete ALL HoopAI data? This cannot be undone!')) return;
    if (!confirm('Are you absolutely sure? All sessions, stats, and settings will be lost.')) return;
    getHoopAIKeys().forEach(function(key) { localStorage.removeItem(key); });
    showBackupStatus('🗑️ All data cleared!', 'success');
    updateBackupInfo();
    setTimeout(function() { location.reload(); }, 1500);
  };

  updateBackupInfo();

})();

// ── Feature #40: PWA Install Banner ──
(function() {
  var _deferredPrompt = null;
  var _promptFired = false;
  var DISMISS_KEY = 'hoopai_pwa_dismiss';
  var DISMISS_DAYS = 7;

  function isDismissed() {
    var ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    var diff = Date.now() - parseInt(ts, 10);
    return diff < DISMISS_DAYS * 86400000;
  }

  function showBanner() {
    var banner = document.getElementById('pwaInstallBanner');
    if (banner) banner.classList.add('visible');
  }

  function hideBanner() {
    var banner = document.getElementById('pwaInstallBanner');
    if (banner) banner.classList.remove('visible');
  }

  window.addEventListener('beforeinstallprompt', function(e) {
    _promptFired = true;
    e.preventDefault();
    _deferredPrompt = e;
    if (!isDismissed()) {
      setTimeout(showBanner, 2000);
    }
  });

  window.installPWA = function() {
    if (!_deferredPrompt) {
      // Fallback: show manual instructions
      var ua = navigator.userAgent.toLowerCase();
      if (ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1) {
        alert('To install HoopAI:\n\n1. Tap the Share button (box with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"');
      } else {
        alert('To install HoopAI:\n\n1. Tap the browser menu (three dots)\n2. Tap "Add to Home Screen" or "Install App"\n3. Confirm the installation');
      }
      hideBanner();
      return;
    }
    _deferredPrompt.prompt();
    _deferredPrompt.userChoice.then(function(result) {
      if (result.outcome === 'accepted') {
        hideBanner();
      }
      _deferredPrompt = null;
    });
  };

  window.dismissInstallBanner = function() {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    hideBanner();
  };

  window.addEventListener('appinstalled', function() {
    hideBanner();
    _deferredPrompt = null;
  });

  // For iOS / browsers without beforeinstallprompt — show after 3 sessions
  window.addEventListener('load', function() { setTimeout(function() {
    if (!window.matchMedia('(display-mode: standalone)').matches && !window.navigator.standalone) {
      var visits = parseInt(localStorage.getItem('hoopai_visit_count') || '0', 10) + 1;
      localStorage.setItem('hoopai_visit_count', visits.toString());
      if (visits >= 3 && !isDismissed() && !_promptFired) {
        var ua = navigator.userAgent.toLowerCase();
        if (ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('safari') > -1) {
          setTimeout(showBanner, 3000);
        }
      }
    }
  }, 2000); });

})();