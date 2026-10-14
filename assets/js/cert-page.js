/* cert-page.js — renders certifications.html from cert-objectives.js + cloud-map.js.
   buildModel() is pure (tested); render() only turns the model into DOM.
   Certificates without published exam weights render course-level, unweighted. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FDECertPage = api;
  if (typeof document !== "undefined" && document.addEventListener) {
    var run = function () { api.render(document, root.FDE_CERT_OBJECTIVES, root.FDE_CLOUD_MAP); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
    else run();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* "w01/d4b" → "Week 1 · Day 4 (Part 2)"; "w02/w02d3" → "Week 2 · Day 3". */
  function lessonLabel(page) {
    var match = /^w(\d+)\/(?:w\d+)?d(\d)([ab])?$/.exec(page);
    if (!match) return page;
    var label = "Week " + Number(match[1]) + " · Day " + match[2];
    if (match[3]) label += " (Part " + (match[3] === "a" ? 1 : 2) + ")";
    return label;
  }

  function anchorsFor(map, certId, objectiveId) {
    var list = ((map.objectives || {})[certId] || {})[objectiveId] || [];
    var seen = {};
    return list.filter(function (a) {
      var key = a.page + "|" + a.via;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).map(function (a) {
      return { page: a.page, href: "weeks/" + a.page + ".html", label: lessonLabel(a.page), via: a.via };
    });
  }

  function certModel(data, map, certId) {
    var cert = data.certs[certId];
    var domains = cert.domains.map(function (domain) {
      var objectives = domain.objectives.length
        ? domain.objectives.map(function (o) {
          return { id: o.id, title: o.title, anchors: anchorsFor(map, certId, o.id) };
        })
        : [{ id: domain.id, title: domain.title, anchors: anchorsFor(map, certId, domain.id), domainLevel: true }];
      return { id: domain.id, title: domain.title, weight: domain.weight, objectives: objectives };
    });
    var covered = 0, total = 0;
    domains.forEach(function (d) {
      d.objectives.forEach(function (o) { total += 1; if (o.anchors.length) covered += 1; });
    });
    return {
      id: certId, name: cert.name, code: cert.code, level: cert.level, status: cert.status,
      statusNote: cert.statusNote || "", weightsPublished: !!cert.weightsPublished,
      page: cert.page, guide: cert.guide, learningPath: cert.learningPath, format: cert.format,
      domains: domains, coverage: { covered: covered, total: total }
    };
  }

  function buildModel(data, map) {
    var aws = data.paths.aws;
    var gcp = data.paths.gcp;
    return {
      accessed: data.accessed,
      aws: { target: aws.target, cert: certModel(data, map, aws.target) },
      gcp: { target: gcp.target, cert: certModel(data, map, gcp.target) },
      providerPages: Object.keys(map.providerPages || {}).map(function (page) {
        return { page: page, href: "weeks/" + page + ".html", label: lessonLabel(page), title: map.providerPages[page].title, ltm: map.providerPages[page].ltm };
      }),
      adjacent: data.adjacent.slice()
    };
  }

  // ---- DOM ----------------------------------------------------------------
  function el(doc, tag, attrs, text) {
    var node = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text != null) node.textContent = text;
    return node;
  }

  function link(doc, href, text, external) {
    var a = el(doc, "a", external ? { href: href, target: "_blank", rel: "noopener" } : { href: href }, text);
    return a;
  }

  function certCard(doc, cert, role) {
    var card = el(doc, "article", { class: "cert-card", "data-cert": cert.id });
    var head = el(doc, "div", { class: "cert-head" });
    head.appendChild(el(doc, "span", { class: "cert-role" }, role));
    head.appendChild(el(doc, "h3", {}, cert.code ? cert.name + " (" + cert.code + ")" : cert.name));
    var badges = el(doc, "div", { class: "cert-badges" });
    badges.appendChild(el(doc, "span", { class: "cert-badge" }, cert.level));
    var STATUS = { ga: "Generally available", beta: "Beta", available: "Open for enrollment" };
    badges.appendChild(el(doc, "span", { class: "cert-badge is-" + cert.status }, STATUS[cert.status] || cert.status));
    head.appendChild(badges);
    card.appendChild(head);
    if (cert.statusNote) card.appendChild(el(doc, "p", { class: "cert-note" }, cert.statusNote));
    card.appendChild(el(doc, "p", { class: "cert-format" }, cert.format));
    var links = el(doc, "p", { class: "cert-links" });
    [[cert.page, "Certificate page"], [cert.guide, "Official exam guide"], [cert.learningPath, "Official learning path"]]
      .filter(function (pair) { return pair[0]; })
      .forEach(function (pair, i) {
        if (i) links.appendChild(doc.createTextNode(" · "));
        links.appendChild(link(doc, pair[0], pair[1], true));
      });
    card.appendChild(links);
    var unit = cert.domains.every(function (d) { return d.objectives.every(function (o) { return o.domainLevel; }); }) ? "courses" : "objectives";
    card.appendChild(el(doc, "p", { class: "cert-coverage" },
      cert.coverage.covered + " of " + cert.coverage.total + " " + unit + " are taught in a live lesson today" +
      (cert.weightsPublished ? " · official weights" : " · no weights are published")));

    cert.domains.forEach(function (domain) {
      var section = el(doc, "section", { class: "cert-domain" });
      var h = el(doc, "h4", {});
      if (domain.weight != null) h.appendChild(el(doc, "span", { class: "cert-weight" }, domain.weight + "%"));
      h.appendChild(doc.createTextNode((domain.weight != null ? " " : "") + domain.id + " · " + domain.title));
      section.appendChild(h);
      var list = el(doc, "ul", { class: "cert-objectives" });
      domain.objectives.forEach(function (objective) {
        var item = el(doc, "li", { "data-objective": cert.id + ":" + objective.id });
        if (!objective.domainLevel) item.appendChild(el(doc, "span", { class: "cert-oid" }, objective.id));
        if (!objective.domainLevel) item.appendChild(doc.createTextNode(" " + objective.title));
        var where = el(doc, "span", { class: "cert-anchors" });
        if (!objective.anchors.length) {
          where.appendChild(el(doc, "span", { class: "cert-gap" }, "Not taught in a live lesson yet"));
        }
        objective.anchors.forEach(function (anchor) {
          var a = link(doc, anchor.href, anchor.label + (anchor.via === "provider" ? " · provider block" : ""));
          a.className = "cert-anchor" + (anchor.via === "provider" ? " is-provider" : "");
          where.appendChild(a);
        });
        item.appendChild(where);
        list.appendChild(item);
      });
      section.appendChild(list);
      card.appendChild(section);
    });
    return card;
  }

  function render(doc, data, map) {
    if (!doc || !data || !map) return null;
    var model = buildModel(data, map);
    var aws = doc.getElementById("cert-aws");
    if (aws) {
      aws.replaceChildren(certCard(doc, model.aws.cert, "AWS path · alignment target"));
    }
    var gcp = doc.getElementById("cert-gcp");
    if (gcp) {
      gcp.setAttribute("data-target", model.gcp.target);
      gcp.replaceChildren(certCard(doc, model.gcp.cert, "GCP path · alignment target"));
    }
    var pages = doc.getElementById("provider-pages");
    if (pages) {
      pages.replaceChildren();
      model.providerPages.forEach(function (p) {
        var item = el(doc, "li", {});
        item.appendChild(link(doc, p.href, p.label + " — " + p.title));
        item.appendChild(el(doc, "span", { class: "cert-ltm" }, " · LTM " + p.ltm + " · open as "));
        item.appendChild(link(doc, p.href + "?cloud=aws", "AWS"));
        item.appendChild(doc.createTextNode(" / "));
        item.appendChild(link(doc, p.href + "?cloud=gcp", "GCP"));
        pages.appendChild(item);
      });
    }
    var adjacent = doc.getElementById("cert-adjacent");
    if (adjacent) {
      adjacent.replaceChildren();
      model.adjacent.forEach(function (a) {
        var item = el(doc, "li", {});
        item.appendChild(link(doc, a.url, a.name, true));
        item.appendChild(doc.createTextNode(" — " + a.status));
        adjacent.appendChild(item);
      });
    }
    return model;
  }

  return { lessonLabel: lessonLabel, buildModel: buildModel, render: render };
});
