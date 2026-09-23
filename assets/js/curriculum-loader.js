/* curriculum-loader.js — authenticated curriculum resolution with a fail-closed
   static fallback. The API payload is untrusted and is never persisted. */
(function (root, factory) {
  "use strict";
  var api = factory(root);
  root.FDE_CURRICULUM = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  var DOW = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  var AVAILABILITY = { available: true, missing: true };
  var SOURCES = { seed: true, assignment: true, override: true };
  var UNIT_KEY = /^w(0[1-9]|10)d([1-5])$/;
  var PHASE_KEY = /^[a-z][a-z0-9_-]{0,31}$/;
  var SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var COLOR = /^#[0-9a-fA-F]{6}$/;
  var HEX_32 = /^[0-9a-f]{32}$/;
  var MAX_UNITS = 50;
  var TIMEOUT_MS = 5000;

  function ownObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function exactKeys(value, keys) {
    if (!ownObject(value)) return false;
    var actual = Object.keys(value).sort();
    var expected = keys.slice().sort();
    return actual.length === expected.length && actual.every(function (key, index) { return key === expected[index]; });
  }

  function boundedString(value, min, max) {
    return typeof value === "string" && value.length >= min && value.length <= max;
  }

  function safeHref(value) {
    if (typeof value !== "string" || value.length < 1 || value.length > 240) return false;
    if (value[0] === "/" || value.indexOf("\\") !== -1 || value.indexOf("?") !== -1 ||
        value.indexOf("#") !== -1 || value.indexOf(":") !== -1 || value.indexOf("%") !== -1) return false;
    var segments = value.split("/");
    if (segments.some(function (segment) { return !segment || segment === "." || segment === ".."; })) return false;
    return segments.every(function (segment, index) {
      return index === segments.length - 1
        ? /^[A-Za-z0-9_-]+\.html$/.test(segment)
        : /^[A-Za-z0-9_-]+$/.test(segment);
    });
  }

  function validateResponse(payload) {
    if (!exactKeys(payload, ["ok", "curriculum", "provenance"]) || payload.ok !== true) return null;
    var curriculum = payload.curriculum;
    var provenance = payload.provenance;
    if (!exactKeys(curriculum, ["slug", "title", "phases", "units"]) ||
        !SLUG.test(curriculum.slug || "") || !boundedString(curriculum.title, 1, 200) ||
        !ownObject(curriculum.phases) || !Array.isArray(curriculum.units)) return null;

    if (!exactKeys(provenance, ["version_id", "version_no", "source_kind", "curriculum_slug", "effective_from", "resolved_at"]) ||
        !HEX_32.test(provenance.version_id || "") || !Number.isSafeInteger(provenance.version_no) || provenance.version_no < 1 ||
        !SOURCES[provenance.source_kind] || provenance.curriculum_slug !== curriculum.slug ||
        !Number.isSafeInteger(provenance.resolved_at) || provenance.resolved_at < 0) return null;
    if (provenance.source_kind === "seed") {
      if (provenance.effective_from !== null) return null;
    } else if (!Number.isSafeInteger(provenance.effective_from) || provenance.effective_from < 0) return null;

    var phaseKeys = Object.keys(curriculum.phases);
    if (phaseKeys.length < 1 || phaseKeys.length > 10) return null;
    var labels = Object.create(null);
    for (var p = 0; p < phaseKeys.length; p += 1) {
      var phaseKey = phaseKeys[p];
      var phase = curriculum.phases[phaseKey];
      if (!PHASE_KEY.test(phaseKey) || !exactKeys(phase, ["label", "color"]) ||
          !boundedString(phase.label, 1, 100) || !COLOR.test(phase.color || "") || labels[phase.label]) return null;
      labels[phase.label] = true;
    }

    if (curriculum.units.length !== MAX_UNITS) return null;
    var seenKeys = Object.create(null);
    var seenSlots = Object.create(null);
    var seenPositions = Object.create(null);
    var referencedPhases = Object.create(null);
    var weekMetadata = Object.create(null);
    var previousPosition = -1;
    var cleanUnits = [];

    for (var i = 0; i < curriculum.units.length; i += 1) {
      var unit = curriculum.units[i];
      if (!exactKeys(unit, ["unit_key", "week", "day", "phase_key", "phase_label", "phase_color", "week_title", "title", "subtitle", "href", "parts", "star", "availability", "position"]) ||
          !UNIT_KEY.test(unit.unit_key || "") || !Number.isSafeInteger(unit.week) || unit.week < 1 || unit.week > 10 ||
          !Number.isSafeInteger(unit.day) || unit.day < 1 || unit.day > 5 || !Number.isSafeInteger(unit.position) ||
          unit.position !== unit.week * 100 + unit.day || unit.position <= previousPosition ||
          !PHASE_KEY.test(unit.phase_key || "") || !Object.prototype.hasOwnProperty.call(curriculum.phases, unit.phase_key) ||
          !boundedString(unit.phase_label, 1, 100) || !COLOR.test(unit.phase_color || "") ||
          unit.phase_label !== curriculum.phases[unit.phase_key].label || unit.phase_color.toLowerCase() !== curriculum.phases[unit.phase_key].color.toLowerCase() ||
          !boundedString(unit.week_title, 1, 200) || !boundedString(unit.title, 1, 200) || !boundedString(unit.subtitle, 0, 500) ||
          (unit.href !== null && !safeHref(unit.href)) || !Array.isArray(unit.parts) || unit.parts.length > 10 ||
          typeof unit.star !== "boolean" || !AVAILABILITY[unit.availability]) return null;

      var expectedKey = "w" + String(unit.week).padStart(2, "0") + "d" + unit.day;
      var slot = unit.week + ":" + unit.day;
      if (unit.unit_key !== expectedKey || seenKeys[unit.unit_key] || seenSlots[slot] || seenPositions[unit.position]) return null;
      seenKeys[unit.unit_key] = true;
      seenSlots[slot] = true;
      seenPositions[unit.position] = true;
      referencedPhases[unit.phase_key] = true;
      var priorWeek = weekMetadata[unit.week];
      if (priorWeek && (priorWeek.phase_key !== unit.phase_key || priorWeek.week_title !== unit.week_title)) return null;
      weekMetadata[unit.week] = { phase_key: unit.phase_key, week_title: unit.week_title };
      previousPosition = unit.position;

      var partHrefs = Object.create(null);
      var cleanParts = [];
      for (var j = 0; j < unit.parts.length; j += 1) {
        var part = unit.parts[j];
        if (!exactKeys(part, ["t", "href"]) || !boundedString(part.t, 1, 160) || !safeHref(part.href) || partHrefs[part.href]) return null;
        partHrefs[part.href] = true;
        cleanParts.push({ t: part.t, href: part.href });
      }
      if (unit.href !== null && cleanParts.length) return null;
      cleanUnits.push({
        unit_key: unit.unit_key, week: unit.week, day: unit.day, phase_key: unit.phase_key,
        phase_label: unit.phase_label, phase_color: unit.phase_color, week_title: unit.week_title,
        title: unit.title, subtitle: unit.subtitle, href: unit.href, parts: cleanParts,
        star: unit.star, availability: unit.availability, position: unit.position,
      });
    }

    if (phaseKeys.some(function (key) { return !referencedPhases[key]; })) return null;
    return {
      slug: curriculum.slug,
      title: curriculum.title,
      phases: phaseKeys.reduce(function (result, key) {
        result[key] = { label: curriculum.phases[key].label, color: curriculum.phases[key].color };
        return result;
      }, {}),
      units: cleanUnits,
    };
  }

  function toCalendar(curriculum) {
    var phases = {};
    Object.keys(curriculum.phases).forEach(function (key) {
      phases[key] = { label: curriculum.phases[key].label, c: curriculum.phases[key].color };
    });
    var weeks = [];
    curriculum.units.forEach(function (unit) {
      var week = weeks[unit.week - 1];
      if (!week) {
        week = { w: unit.week, phase: unit.phase_key, title: unit.week_title, days: [] };
        weeks[unit.week - 1] = week;
      } else if (week.phase !== unit.phase_key || week.title !== unit.week_title) {
        throw new Error("validated curriculum has inconsistent week metadata");
      }
      week.days.push({
        unit_key: unit.unit_key, t: unit.title, s: unit.subtitle, href: unit.href,
        parts: unit.parts.map(function (part) { return { t: part.t, href: part.href }; }),
        star: unit.star, availability: unit.availability, position: unit.position,
      });
    });
    return { phases: phases, weeks: weeks };
  }

  function fallbackCalendar(phasesInput, weeksInput) {
    var phases = {};
    Object.keys(phasesInput || {}).forEach(function (key) {
      phases[key] = { label: String(phasesInput[key].label), c: String(phasesInput[key].c) };
    });
    var weeks = (weeksInput || []).map(function (week) {
      return {
        w: week.w, phase: week.phase, title: week.title,
        days: week.days.map(function (day, index) {
          return {
            unit_key: "w" + String(week.w).padStart(2, "0") + "d" + (index + 1),
            t: day.t, s: day.s || "", href: day.href || null,
            parts: (day.parts || []).map(function (part) { return { t: part.t, href: part.href }; }),
            star: day.star === true, availability: "available", position: week.w * 100 + index + 1,
          };
        }),
      };
    });
    return { phases: phases, weeks: weeks };
  }

  function element(doc, tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function appendLink(doc, parent, className, href, text, title) {
    var link = element(doc, "a", className, text);
    link.setAttribute("href", href);
    if (title) link.setAttribute("title", title);
    parent.appendChild(link);
    return link;
  }

  function appendRitual(doc, row, key, href, text, title) {
    var link = appendLink(doc, row, "ritual " + key, href, text, title);
    link.setAttribute("data-focus-role", "ritual-" + key);
    return link;
  }

  function appendRituals(doc, row, weekNumber, dayNumber) {
    var dayKey = "w" + String(weekNumber).padStart(2, "0") + "d" + dayNumber;
    if (!(weekNumber === 1 && dayNumber === 1)) appendRitual(doc, row, "iv", "gauntlet.html?day=" + dayKey, "🎤 AI Interview", "Daily AI Interview — do it before end of day");
    if (dayNumber === 1) appendRitual(doc, row, "cr", "client-delivery.html?w=" + weekNumber, "📋 Client request");
    if (weekNumber >= 2 && dayNumber === 4) {
      var fde = element(doc, "span", "ritual fde", "◆ FDE Situation");
      fde.setAttribute("title", "Weekly FDE Situation session — Thursday");
      row.appendChild(fde);
    }
    if (weekNumber <= 8 && dayNumber === 2) appendRitual(doc, row, "sd", "system-design.html?w=" + weekNumber, "🎯 Sys-design · start", "This week's System Design challenge — start pre-planning before Friday");
    if (weekNumber <= 8 && dayNumber === 3) appendRitual(doc, row, "ar", "alt-research.html?w=" + weekNumber, "🔬 Alt research");
    if (weekNumber <= 8 && dayNumber === 5) {
      appendRitual(doc, row, "sd", "system-design.html?w=" + weekNumber, "🎯 Sys-design · due", "System Design due — open this week's challenge");
      appendRitual(doc, row, "ar", "alt-research.html?w=" + weekNumber, "🔬 Alt research · due", "Alt Research presentation due — present this week's findings");
    }
  }

  function focusToken(doc, cal) {
    var active = doc.activeElement;
    if (!active || !cal.contains(active)) return null;
    var card = typeof active.closest === "function" ? active.closest("[data-unit-key]") : null;
    var role = active.getAttribute && active.getAttribute("data-focus-role");
    return card && role ? { key: card.getAttribute("data-unit-key"), role: role } : null;
  }

  function restoreFocus(doc, token) {
    if (!token) return;
    var target = doc.querySelector('[data-unit-key="' + token.key + '"] [data-focus-role="' + token.role + '"]');
    if (target && typeof target.focus === "function") target.focus({ preventScroll: true });
  }

  function renderCalendar(model, doc, hostRoot) {
    doc = doc || root.document;
    hostRoot = hostRoot || root;
    var legend = doc.querySelector(".legend");
    var cal = doc.getElementById("cal");
    if (!legend || !cal) return false;
    var token = focusToken(doc, cal);
    var legendFragment = doc.createDocumentFragment();
    var calFragment = doc.createDocumentFragment();

    Object.keys(model.phases).forEach(function (key) {
      var phase = model.phases[key];
      var item = element(doc, "span", "lg");
      var swatch = element(doc, "i");
      swatch.style.backgroundColor = phase.c;
      swatch.setAttribute("aria-hidden", "true");
      item.appendChild(swatch);
      item.appendChild(doc.createTextNode(phase.label));
      legendFragment.appendChild(item);
    });

    calFragment.appendChild(element(doc, "div", "cal-corner", ""));
    DOW.forEach(function (day) { calFragment.appendChild(element(doc, "div", "cal-dayhead", day)); });
    model.weeks.forEach(function (week) {
      var phase = model.phases[week.phase];
      var weekCell = element(doc, "div", "cal-week");
      weekCell.style.setProperty("--pc", phase.c);
      weekCell.appendChild(element(doc, "div", "ww", "Week " + week.w));
      weekCell.appendChild(element(doc, "div", "wt", week.title));
      weekCell.appendChild(element(doc, "div", "wp", phase.label));
      calFragment.appendChild(weekCell);

      week.days.forEach(function (day, index) {
        var available = day.availability === "available";
        var hasHref = available && !!day.href;
        var hasParts = available && day.parts.length > 0;
        var card = element(doc, "div", "cal-cell " + (!available ? "missing" : (hasHref ? "live" : (hasParts ? "parts" : "soon"))));
        card.style.setProperty("--pc", phase.c);
        card.setAttribute("data-unit-key", day.unit_key);
        if (!available) {
          card.setAttribute("role", "group");
          card.setAttribute("aria-disabled", "true");
          card.setAttribute("aria-label", day.t + " — curriculum content unavailable");
        }

        var title = element(doc, "div", "ct");
        if (hasHref) {
          var titleLink = appendLink(doc, title, "ct-link", day.href, day.t);
          titleLink.setAttribute("data-focus-role", "title");
        } else title.textContent = day.t;
        card.appendChild(title);
        card.appendChild(element(doc, "div", "cs", day.s));
        if (!available) {
          var badge = element(doc, "span", "availability-badge", "Unavailable");
          card.appendChild(badge);
        } else if (hasParts) {
          var parts = element(doc, "div", "cell-parts");
          day.parts.forEach(function (part, partIndex) {
            var partLink = appendLink(doc, parts, "", part.href, part.t);
            partLink.setAttribute("data-focus-role", "part-" + partIndex);
          });
          card.appendChild(parts);
        }

        var foot = element(doc, "div", "cell-foot");
        var firstHref = available ? (day.href || (day.parts[0] && day.parts[0].href) || null) : null;
        if (firstHref) {
          var actions = element(doc, "div", "day-actions");
          var status = hostRoot.FDE_PROGRESS ? hostRoot.FDE_PROGRESS.status(day.unit_key) : "none";
          var label = status === "completed" ? "✓ Completed" : (status === "started" ? "↻ Resume" : "▶ Start");
          var statusClass = status === "completed" ? "done" : (status === "started" ? "resume" : "start");
          var progress = appendLink(doc, actions, "day-prog day-prog--" + statusClass, firstHref, label);
          progress.setAttribute("data-focus-role", "progress");
          foot.appendChild(actions);
        }

        var tags = element(doc, "div", "ritual-row");
        if (day.star) tags.appendChild(element(doc, "span", "mk star", "★"));
        appendRituals(doc, tags, week.w, index + 1);
        if (tags.childNodes.length) foot.appendChild(tags);
        if (foot.childNodes.length) card.appendChild(foot);
        calFragment.appendChild(card);
      });
    });

    legend.replaceChildren(legendFragment);
    cal.replaceChildren(calFragment);
    restoreFocus(doc, token);
    return true;
  }

  function createLoader(options) {
    options = options || {};
    var hostRoot = options.root || root;
    var doc = options.document || hostRoot.document;
    var fetchFn = options.fetch || (typeof hostRoot.fetch === "function" ? hostRoot.fetch.bind(hostRoot) : null);
    var timeoutMs = Number.isSafeInteger(options.timeoutMs) ? options.timeoutMs : TIMEOUT_MS;
    var fallback = options.fallback || fallbackCalendar(hostRoot.PHASES, hostRoot.WEEKS);
    var active = fallback;
    var generation = 0;
    var state = "fallback";
    var renderFn = options.render || renderCalendar;

    function render() { return renderFn(active, doc, hostRoot); }
    function activateFallback() {
      active = fallback;
      hostRoot.PHASES = fallback.phases;
      hostRoot.WEEKS = fallback.weeks;
      render();
    }

    async function resolve() {
      var id = ++generation;
      var expired = false;
      var controller = typeof AbortController === "function" ? new AbortController() : null;
      state = "loading";
      activateFallback();

      var timeout;
      var timeoutPromise = new Promise(function (done) {
        timeout = setTimeout(function () {
          expired = true;
          if (controller) controller.abort();
          if (id === generation) state = "fallback";
          done(false);
        }, timeoutMs);
      });

      var work = (async function () {
        if (typeof hostRoot.FDE_ensureSession !== "function" || !fetchFn || !hostRoot.FDE_RUN_URL) return false;
        var token = await hostRoot.FDE_ensureSession(false);
        if (expired || id !== generation || !token) return false;

        async function request(bearer) {
          return fetchFn(String(hostRoot.FDE_RUN_URL).replace(/\/$/, "") + "/curriculum/resolved", {
            method: "GET",
            headers: { Authorization: "Bearer " + bearer },
            cache: "no-store",
            credentials: "omit",
            referrerPolicy: "no-referrer",
            signal: controller ? controller.signal : undefined,
          });
        }

        var response = await request(token);
        if (expired || id !== generation) return false;
        if (response && response.status === 401) {
          token = await hostRoot.FDE_ensureSession(true);
          if (expired || id !== generation || !token) return false;
          response = await request(token);
        }
        if (expired || id !== generation || !response || !response.ok) return false;
        var payload = await response.json();
        if (expired || id !== generation) return false;
        var curriculum = validateResponse(payload);
        if (!curriculum) return false;
        var next = toCalendar(curriculum);
        if (expired || id !== generation) return false;
        // Build and replace the complete legend/grid before publishing the new
        // globals. If rendering throws, the prior fallback data and DOM survive.
        renderFn(next, doc, hostRoot);
        if (expired || id !== generation) return false;
        active = next;
        hostRoot.PHASES = next.phases;
        hostRoot.WEEKS = next.weeks;
        state = "dynamic";
        // Existing calendar enhancements already remount on this signal after a
        // full grid replacement. Reuse it once; the loader's own listener only
        // renders and therefore cannot create an event loop.
        if (typeof hostRoot.dispatchEvent === "function" && typeof hostRoot.CustomEvent === "function") {
          try { hostRoot.dispatchEvent(new hostRoot.CustomEvent("fde-progress-sync")); } catch (eventError) { /* optional integration signal */ }
        }
        return true;
      })().catch(function () { return false; }).then(function (result) {
        if (!result && !expired && id === generation) state = "fallback";
        return result;
      });

      return Promise.race([work, timeoutPromise]).finally(function () { clearTimeout(timeout); });
    }

    return {
      render: render,
      resolve: resolve,
      cancel: function () { generation += 1; state = "fallback"; activateFallback(); },
      getState: function () { return state; },
      getGeneration: function () { return generation; },
    };
  }

  function boot() {
    if (!root.document || root.__FDE_CURRICULUM_LOADER__) return root.__FDE_CURRICULUM_LOADER__ || null;
    var loader = createLoader();
    root.__FDE_CURRICULUM_LOADER__ = loader;
    loader.render();
    root.addEventListener("fde-progress-sync", loader.render);
    loader.resolve();
    return loader;
  }

  var api = {
    safeHref: safeHref,
    validateResponse: validateResponse,
    toCalendar: toCalendar,
    fallbackCalendar: fallbackCalendar,
    renderCalendar: renderCalendar,
    createLoader: createLoader,
    boot: boot,
  };

  if (root.document && !root.__FDE_CURRICULUM_NO_AUTOBOOT__) boot();
  return api;
});
