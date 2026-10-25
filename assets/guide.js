/* ==========================================================================
   Ads Flow — Consumer Guide
   Vanilla JS: theme, scrollspy, search, copy, drawer, scroll progress, reveal.
   Không phụ thuộc thư viện ngoài.
   ========================================================================== */
(function () {
  "use strict";

  var THEME_KEY = "adsflow-docs-theme";

  /* ----------------------------------------------------------------------
     Theme
     ---------------------------------------------------------------------- */
  var root = document.documentElement;

  /* Bỏ class no-js ngay khi script chạy — nếu JS lỗi, .reveal vẫn hiện bình thường */
  root.classList.remove("no-js");

  function storedTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function storeTheme(value) {
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch (e) {
      /* private mode */
    }
  }

  var initialTheme =
    storedTheme() ||
    (window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark");
  root.setAttribute("data-theme", initialTheme);

  var themeBtn = document.getElementById("themeToggleBtn");

  function syncThemeBtn() {
    if (!themeBtn) return;
    var isDark = root.getAttribute("data-theme") === "dark";
    themeBtn.textContent = isDark ? "☀" : "☾";
    themeBtn.setAttribute(
      "aria-label",
      isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"
    );
    themeBtn.setAttribute("title", isDark ? "Giao diện sáng" : "Giao diện tối");
  }

  if (themeBtn) {
    syncThemeBtn();
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      storeTheme(next);
      syncThemeBtn();
    });
  }

  /* ----------------------------------------------------------------------
     Normalize — bỏ dấu + lowercase để search không dấu
     ---------------------------------------------------------------------- */
  function normalize(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /* ----------------------------------------------------------------------
     Copy — dùng cho .code và .annot
     ---------------------------------------------------------------------- */
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  function flashDone(btn, label) {
    btn.textContent = "Đã copy";
    btn.classList.add("is-done");
    setTimeout(function () {
      btn.textContent = label;
      btn.classList.remove("is-done");
    }, 1500);
  }

  function wireCopy(btn, getText) {
    if (!btn) return;
    var label = btn.textContent.trim() || "Copy";

    btn.addEventListener("click", function () {
      var text = getText();
      var done = false;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () {
            done = true;
            flashDone(btn, label);
          },
          function () {
            if (fallbackCopy(text)) {
              done = true;
              flashDone(btn, label);
            }
          }
        );
      } else if (fallbackCopy(text)) {
        done = true;
        flashDone(btn, label);
      }

      if (!done) {
        btn.textContent = "Ctrl+C";
        setTimeout(function () {
          btn.textContent = label;
        }, 1500);
      }
    });
  }

  function initCopyButtons() {
    Array.prototype.forEach.call(
      document.querySelectorAll(".code"),
      function (block) {
        var btn = block.querySelector(".code__copy");
        var pre = block.querySelector("pre");
        if (!btn || !pre) return;
        wireCopy(btn, function () {
          return pre.innerText.replace(/\n$/, "");
        });
      }
    );

    /* Annotated block: gom code từ các hàng cột trái */
    Array.prototype.forEach.call(
      document.querySelectorAll(".annot"),
      function (block) {
        var btn = block.querySelector(".annot__copy");
        if (!btn) return;
        wireCopy(btn, function () {
          var lines = [];
          Array.prototype.forEach.call(
            block.querySelectorAll(".annot__row:not(.annot__row--head)"),
            function (row) {
              var cell = row.querySelector(".annot__code");
              if (cell) lines.push(cell.innerText.replace(/\n$/, ""));
            }
          );
          return lines.join("\n");
        });
      }
    );
  }

  /* ----------------------------------------------------------------------
     Sections + nav
     ---------------------------------------------------------------------- */
  var sections = Array.prototype.slice.call(
    document.querySelectorAll("main section[id]")
  );
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".nav-link[href^='#']")
  );

  function setActive(id) {
    navLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("href") === "#" + id);
    });
  }

  function initScrollSpy() {
    if (!sections.length) return;

    /* Chọn section dựa trên vị trí thực tế của section trên viewport.
       IntersectionObserver không ổn định với các section cao hơn viewport:
       nhiều section cùng "intersecting" → chọn nhầm section đầu tiên. */
    function update() {
      var offset = 100; /* dưới header */
      var current = null;

      for (var i = 0; i < sections.length; i++) {
        var section = sections[i];
        if (section.hidden) continue;
        var top = section.getBoundingClientRect().top;
        if (top - offset <= 0) {
          current = section;
        } else {
          break;
        }
      }

      if (!current) {
        /* chưa section nào đã lên trên viewport → lấy section đầu tiên */
        for (var j = 0; j < sections.length; j++) {
          if (!sections[j].hidden) {
            current = sections[j];
            break;
          }
        }
      }

      if (current) setActive(current.id);
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ----------------------------------------------------------------------
     Search
     ---------------------------------------------------------------------- */
  var searchInput = document.getElementById("searchInput");
  var searchClear = document.getElementById("searchClearBtn");
  var emptyState = document.getElementById("emptyState");

  function sectionHaystack(section) {
    if (section.dataset.haystack) return section.dataset.haystack;
    section.dataset.haystack = normalize(section.textContent || "");
    return section.dataset.haystack;
  }

  function applyFilter(query) {
    var q = normalize(query.trim());
    var matches = 0;

    sections.forEach(function (section) {
      var hit = !q || sectionHaystack(section).indexOf(q) !== -1;
      section.hidden = !hit;
      if (hit) matches++;
    });

    navLinks.forEach(function (a) {
      var id = (a.getAttribute("href") || "").slice(1);
      var section = document.getElementById(id);
      if (section) a.hidden = !!section.hidden;
    });

    if (emptyState) emptyState.hidden = matches !== 0;
    if (searchClear) searchClear.hidden = !q;
  }

  function clearSearch() {
    if (!searchInput) return;
    searchInput.value = "";
    applyFilter("");
    searchInput.focus();
  }

  function initSearch() {
    if (!searchInput) return;

    searchInput.addEventListener("input", function () {
      applyFilter(searchInput.value);
    });

    if (searchClear) searchClear.addEventListener("click", clearSearch);

    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
      if (e.key === "Escape" && document.activeElement === searchInput) {
        clearSearch();
      }
    });

    if (searchClear) searchClear.hidden = true;
  }

  /* ----------------------------------------------------------------------
     Mobile drawer
     ---------------------------------------------------------------------- */
  function initDrawer() {
    var sidebar = document.getElementById("sidebar");
    var menuBtn = document.getElementById("mobileMenuBtn");
    var backdrop = document.getElementById("backdrop");
    if (!sidebar || !menuBtn) return;

    function setOpen(open) {
      sidebar.classList.toggle("is-open", open);
      if (backdrop) backdrop.classList.toggle("is-open", open);
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    menuBtn.addEventListener("click", function () {
      setOpen(!sidebar.classList.contains("is-open"));
    });

    if (backdrop) {
      backdrop.addEventListener("click", function () {
        setOpen(false);
      });
    }

    sidebar.addEventListener("click", function (e) {
      if (e.target.closest(".nav-link") && window.innerWidth <= 900) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) setOpen(false);
    });
  }

  /* ----------------------------------------------------------------------
     Scroll progress bar
     ---------------------------------------------------------------------- */
  function initScrollProgress() {
    var bar = document.getElementById("scrollProgress");
    if (!bar) return;

    var ticking = false;

    function update() {
      var doc = document.documentElement;
      var scrollTop = window.pageYOffset || doc.scrollTop;
      var scrollHeight = doc.scrollHeight - doc.clientHeight;
      var pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );

    update();
  }

  /* ----------------------------------------------------------------------
     Reveal on scroll
     ---------------------------------------------------------------------- */
  function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.04 }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ----------------------------------------------------------------------
     Init
     ---------------------------------------------------------------------- */
  function init() {
    initCopyButtons();
    initScrollSpy();
    initSearch();
    initDrawer();
    initScrollProgress();
    initReveal();

    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
