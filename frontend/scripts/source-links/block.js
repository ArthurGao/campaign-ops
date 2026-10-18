/* CampaignOps links (generated block): ties the source workflow to the CampaignOps demo app.
 * Runs after the page's own script, so steps, agents, exceptions and rules already exist.
 * MAP is injected by frontend/scripts/source-links.mjs from frontend/src/lib/source-map.json. */
(function () {
  'use strict';
  var MAP = __CO_MAP__;
  var byKey = {};
  MAP.entries.forEach(function (e) {
    byKey[e.key] = e;
  });
  var KIND = {
    step: '步骤',
    agent: 'Agent',
    exception: '出问题',
    rule: '规则',
    section: '章节',
    entity: '编号',
    term: '术语',
    summary: '小节',
  };
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function appHref(path) {
    return MAP.appUrl + path;
  }
  function appLink(l, cls) {
    var a = el('a', cls || 'co-app', l.label);
    a.href = appHref(l.path);
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = '在 CampaignOps 里打开（新标签页）';
    return a;
  }
  /** "在 CampaignOps 里看" row with the entry's app links. */
  function appRow(entry) {
    var p = el('p', 'co-row');
    p.setAttribute('data-co', entry.key);
    p.appendChild(el('span', null, '在 CampaignOps 里看'));
    if (!entry.app.length) p.appendChild(el('span', null, '演示系统里没有模拟这一项'));
    entry.app.forEach(function (l) {
      p.appendChild(appLink(l));
    });
    return p;
  }

  // Steps: links at the bottom of each step's panel.
  for (var n = 1; byKey['step-' + n]; n++) {
    var panel = document.querySelector('#sb-' + n + ' .panel');
    if (panel) panel.appendChild(appRow(byKey['step-' + n]));
  }

  // Exceptions: anchor each row and add a third cell.
  var exRows = document.querySelectorAll('#extable tr');
  for (var i = 0; i < exRows.length; i++) {
    var ex = byKey['ex-' + (i + 1)];
    exRows[i].id = 'ex-' + (i + 1);
    var cell = el('td', 'co-cell');
    if (ex && ex.app.length)
      ex.app.forEach(function (l, j) {
        if (j) cell.appendChild(document.createTextNode(' · '));
        cell.appendChild(appLink(l));
      });
    else cell.textContent = '—';
    exRows[i].appendChild(cell);
  }

  // Shared rules: anchor each term and add the link under its description.
  var dts = document.querySelectorAll('#controls dt');
  for (var r = 0; r < dts.length; r++) {
    var rule = byKey['rule-' + (r + 1)];
    dts[r].id = 'rule-' + (r + 1);
    var dd = dts[r].nextElementSibling;
    if (rule && dd) dd.appendChild(appRow(rule));
  }

  // Agents: anchor the cards; add links to whichever agent panel is open.
  var agentApp = {};
  document.querySelectorAll('.acard[data-agent]').forEach(function (card) {
    var k = card.getAttribute('data-agent');
    card.id = 'agent-' + k;
    agentApp[k] = byKey['agent-' + k];
  });
  var detail = document.getElementById('adetail');
  if (detail)
    new MutationObserver(function () {
      var panelEl = detail.querySelector('.panel');
      var on = document.querySelector('.acard[aria-pressed="true"]');
      if (!panelEl || !on || panelEl.querySelector('.co-row')) return;
      var entry = agentApp[on.getAttribute('data-agent')];
      if (entry) panelEl.appendChild(appRow(entry));
    }).observe(detail, { childList: true });

  // Glossary terms, headings and summaries named by `find` get the entry's anchor.
  MAP.entries.forEach(function (e) {
    if (!e.find || document.getElementById(e.anchor)) return;
    var nodes = document.querySelectorAll('td, h4, summary');
    for (var k = 0; k < nodes.length; k++) {
      if (nodes[k].textContent.trim() !== e.find) continue;
      var host =
        nodes[k].tagName === 'SUMMARY'
          ? nodes[k].parentElement
          : nodes[k].tagName === 'TD'
            ? nodes[k].parentElement
            : nodes[k];
      host.id = e.anchor;
      break;
    }
  });

  // Sections: one row under each section's lede.
  MAP.entries.forEach(function (e) {
    if (e.kind !== 'section') return;
    var h = document.getElementById(e.anchor);
    var sub = h && h.nextElementSibling;
    if (sub && sub.classList.contains('sub')) sub.insertAdjacentElement('afterend', appRow(e));
  });

  // Record ids in the text (FS-04, PUB-2027CT-012, …) become links into the app.
  var entities = MAP.entries
    .filter(function (e) {
      return e.kind === 'entity';
    })
    .sort(function (a, b) {
      return b.key.length - a.key.length;
    });
  var pattern = new RegExp(
    '(' +
      entities
        .map(function (e) {
          return e.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('|') +
      ')',
    'g',
  );
  var SKIP = { SCRIPT: 1, STYLE: 1, A: 1, BUTTON: 1, SUMMARY: 1, INPUT: 1, TEXTAREA: 1 };
  function isWordChar(c) {
    return !!c && /[A-Za-z0-9_-]/.test(c);
  }
  var root = document.querySelector('.wrap') || document.body;
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      for (var p = node.parentElement; p && p !== root; p = p.parentElement) {
        if (SKIP[p.tagName] || p.classList.contains('co-search') || p.classList.contains('co-row'))
          return NodeFilter.FILTER_REJECT;
      }
      pattern.lastIndex = 0;
      return pattern.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  var textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(function (node) {
    var text = node.nodeValue,
      frag = document.createDocumentFragment(),
      last = 0,
      m;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(text))) {
      var before = text.charAt(m.index - 1),
        after = text.charAt(m.index + m[0].length);
      // Whole ids only: "FS-04" but not part of "FS-045"; "FS-v1.3" but not "FS-v1.30".
      if (
        isWordChar(before) ||
        isWordChar(after) ||
        (after === '.' && /\d/.test(text.charAt(m.index + m[0].length + 1)))
      )
        continue;
      var entry = byKey[m[0]];
      frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = el('a', 'co-ref', m[0]);
      a.href = appHref(entry.app[0].path);
      a.target = '_blank';
      a.rel = 'noopener';
      a.title = entry.app[0].label + '（在 CampaignOps 里打开）';
      if (!document.getElementById(entry.anchor)) a.id = entry.anchor;
      frag.appendChild(a);
      last = m.index + m[0].length;
    }
    if (!last) return;
    frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  });

  // Jump to a place in this page: open what hides it, scroll, flash.
  function go(id) {
    var target = id && document.getElementById(id);
    if (!target) return false;
    if (/^agent-/.test(id) && typeof window.showAgent === 'function') {
      var k = id.slice(6);
      if (target.getAttribute('aria-pressed') !== 'true') window.showAgent(k, false);
    }
    var stop = target.closest('.stop');
    if (stop) {
      var head = stop.querySelector('.shead');
      var body = head && document.getElementById(head.getAttribute('aria-controls'));
      if (head && body) {
        head.setAttribute('aria-expanded', 'true');
        body.hidden = false;
      }
    }
    for (var p = target.parentElement; p; p = p.parentElement)
      if (p.tagName === 'DETAILS') p.open = true;
    var flashEl = stop && target === stop ? stop.querySelector('.shead') : target;
    flashEl.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    flashEl.classList.remove('co-flash');
    void flashEl.offsetWidth;
    flashEl.classList.add('co-flash');
    setTimeout(function () {
      flashEl.classList.remove('co-flash');
    }, 1700);
    return true;
  }
  function fromHash() {
    go(decodeURIComponent(location.hash.slice(1)));
  }
  window.addEventListener('hashchange', fromHash);

  // Search: places in this page and screens in the app.
  var summaries = [];
  document.querySelectorAll('details.box > summary').forEach(function (s, idx) {
    var d = s.parentElement;
    if (!d.id) d.id = 'sum-' + (idx + 1);
    summaries.push({
      group: 'doc',
      kind: 'summary',
      label: s.textContent.trim(),
      anchor: d.id,
      hay: s.textContent.toLowerCase(),
    });
  });
  var items = summaries.slice();
  var seenApp = {};
  MAP.entries.forEach(function (e) {
    var hay = (e.key + ' ' + e.zh + ' ' + e.en).toLowerCase();
    var where =
      e.kind === 'step'
        ? '第 ' + e.key.slice(5) + ' 步 ' + e.zh
        : e.kind === 'entity'
          ? e.key + ' ' + e.zh
          : e.zh;
    items.push({
      group: 'doc',
      kind: e.kind,
      key: e.key,
      label: where,
      anchor: e.anchor,
      hay: hay,
    });
    e.app.forEach(function (l) {
      var id = l.path + '|' + l.label;
      if (seenApp[id]) {
        seenApp[id].hay += ' ' + hay;
        return;
      }
      seenApp[id] = {
        group: 'app',
        kind: e.kind,
        key: e.key,
        label: l.label,
        path: l.path,
        hay: hay + ' ' + l.label.toLowerCase() + ' ' + l.path.toLowerCase(),
      };
      items.push(seenApp[id]);
    });
  });

  var box = el('div', 'co-search');
  box.setAttribute('role', 'search');
  var label = el('label', null, '在原文和 CampaignOps 里找');
  label.htmlFor = 'co-q';
  var input = el('input');
  input.id = 'co-q';
  input.type = 'search';
  input.autocomplete = 'off';
  input.placeholder = '编号、中文词或界面名，比如 FS-04、发布包、Publish（按 / 聚焦）';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', 'co-results');
  var list = el('ul', 'co-results');
  list.id = 'co-results';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', '搜索结果');
  list.hidden = true;
  var note = el(
    'p',
    'co-note',
    'CampaignOps 是这份工作流的演示系统，数据是虚构的；“系统”结果在新标签页打开。',
  );
  var field = el('div', 'co-field');
  field.appendChild(input);
  field.appendChild(list);
  box.appendChild(label);
  box.appendChild(field);
  box.appendChild(note);
  var toc = document.querySelector('nav.toc');
  if (toc) toc.parentNode.insertBefore(box, toc);
  else root.insertBefore(box, root.firstChild);

  var options = [],
    active = -1;
  function score(it, q) {
    if (it.key && it.key.toLowerCase() === q) return 0;
    if (it.label.toLowerCase().indexOf(q) === 0) return 1;
    return 2;
  }
  function search(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var hits = items.filter(function (it) {
      return terms.every(function (t) {
        return it.hay.indexOf(t) !== -1;
      });
    });
    var whole = terms.join(' ');
    hits.sort(function (a, b) {
      return score(a, whole) - score(b, whole);
    });
    var doc = hits
      .filter(function (h) {
        return h.group === 'doc';
      })
      .slice(0, 8);
    var app = hits
      .filter(function (h) {
        return h.group === 'app';
      })
      .slice(0, 8);
    return doc.concat(app);
  }
  function setActive(i) {
    options.forEach(function (o, j) {
      o.setAttribute('aria-selected', j === i ? 'true' : 'false');
    });
    active = i;
    if (i >= 0) {
      input.setAttribute('aria-activedescendant', options[i].id);
      options[i].scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  }
  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    setActive(-1);
  }
  function activate(opt) {
    var it = opt && opt._item;
    if (!it) return;
    if (it.group === 'app') {
      window.open(appHref(it.path), '_blank', 'noopener');
      return;
    }
    close();
    if (location.hash === '#' + it.anchor) go(it.anchor);
    else location.hash = it.anchor;
  }
  function render() {
    var q = input.value.trim();
    list.textContent = '';
    options = [];
    if (!q) {
      close();
      return;
    }
    var hits = search(q);
    var lastGroup = null;
    hits.forEach(function (it, i) {
      if (it.group !== lastGroup) {
        var g = el('li', 'co-group', it.group === 'doc' ? '原文' : '系统 · CampaignOps');
        g.setAttribute('role', 'presentation');
        list.appendChild(g);
        lastGroup = it.group;
      }
      var li = el('li');
      li.setAttribute('role', 'presentation');
      var opt = el(it.group === 'app' ? 'a' : 'div', 'co-opt' + (it.group === 'app' ? ' app' : ''));
      opt.id = 'co-opt-' + i;
      opt.setAttribute('role', 'option');
      opt.setAttribute('data-group', it.group);
      if (it.group === 'app') {
        opt.href = appHref(it.path);
        opt.target = '_blank';
        opt.rel = 'noopener';
        opt.tabIndex = -1;
      }
      opt.appendChild(el('span', 'co-k', KIND[it.kind] || ''));
      opt.appendChild(el('span', 'co-t', it.label));
      opt.appendChild(el('span', 'co-go', it.group === 'app' ? '打开 ↗' : '跳到这里'));
      opt._item = it;
      opt.addEventListener('mousedown', function (ev) {
        ev.preventDefault();
      });
      opt.addEventListener('click', function (ev) {
        if (it.group === 'app') return;
        ev.preventDefault();
        activate(opt);
      });
      li.appendChild(opt);
      list.appendChild(li);
      options.push(opt);
    });
    if (!hits.length) list.appendChild(el('li', 'co-empty', '没有找到“' + q + '”'));
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    setActive(hits.length ? 0 : -1);
  }
  input.addEventListener('input', render);
  input.addEventListener('focus', function () {
    if (input.value.trim()) render();
  });
  input.addEventListener('blur', function () {
    setTimeout(close, 150);
  });
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowDown' && options.length) {
      ev.preventDefault();
      setActive((active + 1) % options.length);
    } else if (ev.key === 'ArrowUp' && options.length) {
      ev.preventDefault();
      setActive((active - 1 + options.length) % options.length);
    } else if (ev.key === 'Enter' && active >= 0) {
      ev.preventDefault();
      activate(options[active]);
    } else if (ev.key === 'Escape') {
      input.value = '';
      close();
    }
  });
  document.addEventListener('keydown', function (ev) {
    var t = ev.target;
    if (ev.key !== '/' || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    ev.preventDefault();
    input.focus();
  });

  if (location.hash) fromHash();
})();
