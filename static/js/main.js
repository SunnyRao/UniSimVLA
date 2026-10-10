(function () {
  "use strict";

  var CONFIG = window.PAGE_VIDEOS || { sections: [], compare: [] };
  var PLAY_ICON = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function sourceOf(item) {
    if (item.youtube) return { kind: "youtube", id: item.youtube };
    if (item.bilibili) return { kind: "bilibili", id: item.bilibili };
    return { kind: "file", url: item.url || item.src };
  }

  function embedUrl(src, autoplay) {
    if (src.kind === "youtube") {
      return "https://www.youtube.com/embed/" + encodeURIComponent(src.id) +
        "?rel=0&playsinline=1" + (autoplay ? "&autoplay=1&mute=1" : "");
    }
    return "https://player.bilibili.com/player.html?bvid=" + encodeURIComponent(src.id) +
      "&high_quality=1&danmaku=0&autoplay=" + (autoplay ? "1" : "0");
  }

  function posterOf(item, src) {
    if (item.poster) return item.poster;
    if (src.kind === "youtube") return "https://img.youtube.com/vi/" + encodeURIComponent(src.id) + "/hqdefault.jpg";
    return "";
  }

  function showMissing(container, path) {
    if (container.querySelector(".missing")) return;
    container.appendChild(el("div", "missing", "video not found\n" + path));
  }

  // ---------- lazy autoplay for previews ----------
  var lazyObserver = null;
  if ("IntersectionObserver" in window) {
    lazyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting) {
          if (!video.src && video.dataset.src) {
            video.src = video.dataset.src;
            video.load();
          }
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { rootMargin: "120px 0px", threshold: 0.25 });
  }

  function makePreviewVideo(url, poster, speed, container) {
    var video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.preload = "none";
    if (poster) video.poster = poster;
    if (speed) {
      video.defaultPlaybackRate = speed;
      video.addEventListener("loadedmetadata", function () { video.playbackRate = speed; });
    }
    video.addEventListener("error", function () { showMissing(container, url); });
    if (lazyObserver) {
      video.dataset.src = url;
      lazyObserver.observe(video);
    } else {
      video.src = url;
      video.autoplay = true;
    }
    return video;
  }

  // ---------- teaser ----------
  function renderTeaser() {
    var t = CONFIG.teaser;
    var frame = document.getElementById("teaser");
    var caption = document.getElementById("teaser-caption");
    if (!t || !frame) {
      if (frame) frame.parentNode.hidden = true;
      return;
    }
    var src = sourceOf(t);
    if (src.kind === "file") {
      var video = document.createElement("video");
      video.src = src.url;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.controls = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      if (t.poster) video.poster = t.poster;
      video.addEventListener("error", function () { showMissing(frame, src.url); });
      frame.appendChild(video);
    } else {
      var iframe = document.createElement("iframe");
      iframe.src = embedUrl(src, true);
      iframe.allow = "autoplay; fullscreen; picture-in-picture";
      iframe.allowFullscreen = true;
      frame.appendChild(iframe);
    }
    if (caption) caption.textContent = t.caption || "";
  }

  // ---------- gallery ----------
  function renderCard(item) {
    var src = sourceOf(item);
    var card = el("article", "vcard" + (item.wide ? " wide" : ""));
    var media = el("div", "vcard-media");
    media.tabIndex = 0;
    media.setAttribute("role", "button");
    media.setAttribute("aria-label", "Open video: " + (item.title || ""));

    var poster = posterOf(item, src);
    if (src.kind === "file") {
      media.appendChild(makePreviewVideo(src.url, poster, item.speed, media));
      if (item.speed && item.speed !== 1) media.appendChild(el("span", "badge", item.speed + "\u00d7"));
    } else {
      if (poster) {
        var img = document.createElement("img");
        img.src = poster;
        img.alt = item.title || "";
        img.loading = "lazy";
        media.appendChild(img);
      }
      var overlay = el("div", "play-overlay");
      overlay.innerHTML = "<span>" + PLAY_ICON + "</span>";
      media.appendChild(overlay);
      media.appendChild(el("span", "badge", src.kind === "youtube" ? "YouTube" : "Bilibili"));
    }

    function open() { openLightbox(item); }
    media.addEventListener("click", open);
    media.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
    card.appendChild(media);

    var body = el("div", "vcard-body");
    if (item.title) body.appendChild(el("h4", null, item.title));
    if (item.desc) body.appendChild(el("p", null, item.desc));
    if (item.tags && item.tags.length) {
      var tags = el("div", "tags");
      item.tags.forEach(function (t) { tags.appendChild(el("span", "tag", t)); });
      body.appendChild(tags);
    }
    card.appendChild(body);
    return card;
  }

  function renderGallery() {
    var gallery = document.getElementById("gallery");
    var filters = document.getElementById("filters");
    if (!gallery) return;
    function groupItems(g) {
      return [].concat.apply(g.items || [], (g.rows || []).map(function (r) { return r.items || []; }));
    }
    function countOf(sec) {
      return (sec.items || []).length + (sec.groups || []).reduce(function (n, g) {
        return n + groupItems(g).length;
      }, 0);
    }
    function renderGrid(items, cols) {
      var grid = el("div", cols ? "grid cols-" + cols : "grid");
      items.forEach(function (item) { grid.appendChild(renderCard(item)); });
      return grid;
    }

    var sections = (CONFIG.sections || []).filter(function (s) { return countOf(s) > 0; });
    var blocks = [];

    sections.forEach(function (sec) {
      var block = el("div", "gallery-section");
      block.id = sec.id;
      block.dataset.section = sec.id;
      var head = el("div", "gallery-section-head");
      head.appendChild(el("h3", null, sec.title));
      if (sec.desc) head.appendChild(el("p", null, sec.desc));
      block.appendChild(head);
      if (sec.items && sec.items.length) block.appendChild(renderGrid(sec.items));
      (sec.groups || []).forEach(function (g) {
        if (!groupItems(g).length) return;
        var group = el("div", "gallery-group");
        group.appendChild(el("h4", "gallery-group-title", g.title));
        if (g.desc) group.appendChild(el("p", "gallery-group-desc", g.desc));
        if (g.items && g.items.length) group.appendChild(renderGrid(g.items, g.cols));
        (g.rows || []).forEach(function (r) {
          if (r.items && r.items.length) group.appendChild(renderGrid(r.items, r.cols));
        });
        block.appendChild(group);
      });
      gallery.appendChild(block);
      blocks.push(block);
    });

    if (!filters || sections.length < 2) return;
    var total = sections.reduce(function (n, s) { return n + countOf(s); }, 0);
    var chips = [];
    function addChip(id, label, count) {
      var chip = el("button", "chip", label);
      chip.type = "button";
      chip.setAttribute("role", "tab");
      chip.appendChild(el("span", "count", String(count)));
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.classList.toggle("active", c === chip); c.setAttribute("aria-selected", c === chip); });
        blocks.forEach(function (b) { b.hidden = id !== "all" && b.dataset.section !== id; });
      });
      filters.appendChild(chip);
      chips.push(chip);
    }
    addChip("all", "All", total);
    sections.forEach(function (s) { addChip(s.id, s.title, countOf(s)); });
    chips[0].classList.add("active");
    chips[0].setAttribute("aria-selected", "true");
  }

  // ---------- lightbox ----------
  var lightbox = document.getElementById("lightbox");
  var lbMedia = document.getElementById("lightbox-media");
  var lbTitle = document.getElementById("lightbox-title");
  var lbDesc = document.getElementById("lightbox-desc");
  var lastFocus = null;

  function openLightbox(item) {
    if (!lightbox) return;
    var src = sourceOf(item);
    lbMedia.innerHTML = "";
    if (src.kind === "file") {
      var video = document.createElement("video");
      video.src = src.url;
      video.controls = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      if (item.poster) video.poster = item.poster;
      if (item.speed) video.defaultPlaybackRate = item.speed;
      lbMedia.appendChild(video);
    } else {
      var iframe = document.createElement("iframe");
      iframe.src = embedUrl(src, true);
      iframe.allow = "autoplay; fullscreen; picture-in-picture";
      iframe.allowFullscreen = true;
      lbMedia.appendChild(iframe);
    }
    lbTitle.textContent = item.title || "";
    lbDesc.textContent = item.desc || "";
    lastFocus = document.activeElement;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightbox.querySelector(".lightbox-close").focus();
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lbMedia.innerHTML = "";  // 移除节点即停止播放 / 释放 iframe
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-close")) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLightbox();
    });
  }

  // ---------- synchronized comparison ----------
  function fmt(t) {
    if (!isFinite(t)) return "0:00";
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function renderCompare() {
    var list = CONFIG.compare || [];
    var section = document.getElementById("compare");
    var host = document.getElementById("compare-list");
    if (!section || !host || !list.length) return;
    section.hidden = false;

    list.forEach(function (cmp) {
      var item = el("div", "compare-item");
      if (cmp.title) item.appendChild(el("h3", null, cmp.title));
      if (cmp.desc) item.appendChild(el("p", null, cmp.desc));
      var row = el("div", "compare-videos");
      var videos = [cmp.left, cmp.right].map(function (side) {
        var pane = el("div", "compare-pane");
        var v = document.createElement("video");
        v.src = side.src;
        v.muted = true;
        v.playsInline = true;
        v.preload = "metadata";
        if (side.poster) v.poster = side.poster;
        v.addEventListener("error", function () { showMissing(pane, side.src); });
        pane.appendChild(v);
        if (side.label) pane.appendChild(el("span", "badge", side.label));
        row.appendChild(pane);
        return v;
      });
      item.appendChild(row);

      var controls = el("div", "compare-controls");
      var btn = el("button", null, "Play");
      btn.type = "button";
      var bar = document.createElement("input");
      bar.type = "range"; bar.min = "0"; bar.max = "1000"; bar.value = "0";
      bar.setAttribute("aria-label", "Seek");
      var time = el("span", "time", "0:00 / 0:00");
      controls.appendChild(btn); controls.appendChild(bar); controls.appendChild(time);
      item.appendChild(controls);
      host.appendChild(item);

      var a = videos[0], b = videos[1];
      // 以较长的一段为时间轴，短的一段播完停在最后一帧
      function duration() { return Math.max(a.duration || 0, b.duration || 0); }
      function setAll(t) {
        [a, b].forEach(function (v) { v.currentTime = Math.min(t, (v.duration || t) - 0.01); });
      }
      function play() {
        if (duration() && a.currentTime >= a.duration - 0.05 && b.currentTime >= b.duration - 0.05) setAll(0);
        [a, b].forEach(function (v) { if (v.currentTime < (v.duration || Infinity) - 0.05) v.play().catch(function () {}); });
        btn.textContent = "Pause";
      }
      function pause() { a.pause(); b.pause(); btn.textContent = "Play"; }
      btn.addEventListener("click", function () { (a.paused && b.paused) ? play() : pause(); });
      bar.addEventListener("input", function () { setAll(duration() * bar.value / 1000); });

      function tick() {
        var master = (a.duration || 0) >= (b.duration || 0) ? a : b;
        var other = master === a ? b : a;
        var d = duration();
        if (!master.paused && other.currentTime < other.duration - 0.05 &&
            Math.abs(other.currentTime - master.currentTime) > 0.15) {
          other.currentTime = master.currentTime;
        }
        if (d) bar.value = String(Math.round(master.currentTime / d * 1000));
        time.textContent = fmt(master.currentTime) + " / " + fmt(d);
        if (a.paused && b.paused && btn.textContent === "Pause") btn.textContent = "Play";
      }
      [a, b].forEach(function (v) {
        v.addEventListener("timeupdate", tick);
        v.addEventListener("loadedmetadata", tick);
        v.addEventListener("ended", tick);
      });
    });
  }

  // ---------- nav highlight ----------
  function setupNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".topnav-links a"));
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && map[entry.target.id]) {
          links.forEach(function (a) { a.classList.toggle("active", a === map[entry.target.id]); });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) {
      var node = document.getElementById(id);
      if (node) obs.observe(node);
    });
  }

  renderTeaser();
  renderGallery();
  renderCompare();
  setupNav();
  // 画廊是动态生成的，首次加载时浏览器还找不到 #deploy 等锚点，这里补一次跳转
  if (location.hash && document.getElementById(location.hash.slice(1))) {
    document.getElementById(location.hash.slice(1)).scrollIntoView();
  }
})();
