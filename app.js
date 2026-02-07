/* ===== JSON Tools - Common Utilities ===== */

// ===== Theme Management =====
function initTheme() {
    const saved = localStorage.getItem('json-tools-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon();
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('json-tools-theme', next);
    updateThemeIcon();
}

function updateThemeIcon() {
    const btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    btn.textContent = isDark ? '\u2600\uFE0F' : '\uD83C\uDF19';
}

// ===== Mobile Nav Toggle =====
function toggleNav() {
    const links = document.querySelector('.nav-links');
    if (links) links.classList.toggle('open');
}

// ===== Toast Notifications =====
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== Clipboard =====
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied!');
    }).catch(() => {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast('Copied!');
    });
}

// ===== File Download =====
function downloadFile(content, filename, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
}

// ===== File Drop & Upload =====
function setupDropZone(dropZoneEl, textareaEl, callback) {
    if (!dropZoneEl) return;

    ['dragenter', 'dragover'].forEach(evt => {
        dropZoneEl.addEventListener(evt, e => {
            e.preventDefault();
            dropZoneEl.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(evt => {
        dropZoneEl.addEventListener(evt, e => {
            e.preventDefault();
            dropZoneEl.classList.remove('drag-over');
        });
    });

    dropZoneEl.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];
        if (file) readFile(file, textareaEl, callback);
    });

    dropZoneEl.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv,.txt,.xml,.yaml,.yml';
        input.onchange = () => {
            if (input.files[0]) readFile(input.files[0], textareaEl, callback);
        };
        input.click();
    });
}

function readFile(file, textareaEl, callback) {
    const reader = new FileReader();
    reader.onload = e => {
        if (textareaEl) textareaEl.value = e.target.result;
        if (callback) callback(e.target.result);
    };
    reader.readAsText(file);
}

// ===== JSON Parsing with Better Errors =====
function parseJSON(text) {
    try {
        const data = JSON.parse(text);
        return { success: true, data, error: null };
    } catch (e) {
        const match = e.message.match(/position\s+(\d+)/i);
        let line = null, col = null;
        if (match) {
            const pos = parseInt(match[1]);
            const lines = text.substring(0, pos).split('\n');
            line = lines.length;
            col = lines[lines.length - 1].length + 1;
        }
        return {
            success: false,
            data: null,
            error: { message: e.message, line, col }
        };
    }
}

// ===== JSON Statistics =====
function getJSONStats(data) {
    let keys = 0, depth = 0, arrays = 0, objects = 0, values = 0;

    function traverse(obj, d) {
        if (d > depth) depth = d;
        if (Array.isArray(obj)) {
            arrays++;
            obj.forEach(item => traverse(item, d + 1));
        } else if (obj !== null && typeof obj === 'object') {
            objects++;
            const k = Object.keys(obj);
            keys += k.length;
            k.forEach(key => traverse(obj[key], d + 1));
        } else {
            values++;
        }
    }

    traverse(data, 0);
    return { keys, depth, arrays, objects, values };
}

// ===== JSON Syntax Highlight (HTML) =====
function syntaxHighlight(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                cls = /:$/.test(match) ? 'json-key' : 'json-string';
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return `<span class="${cls}">${match}</span>`;
        }
    );
}

// ===== Tree View Builder =====
function buildTreeHTML(data, path = '$', isLast = true) {
    if (data === null) {
        return `<span class="tree-type-dot"></span><span class="tree-null" data-path="${path}">null</span>`;
    }

    if (typeof data !== 'object') {
        if (typeof data === 'string') {
            const escaped = data.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            return `<span class="tree-type-dot"></span><span class="tree-string" data-path="${path}">"${escaped}"</span>`;
        }
        if (typeof data === 'boolean') {
            return `<span class="tree-type-dot"></span><span class="tree-boolean" data-path="${path}">${data}</span>`;
        }
        return `<span class="tree-type-dot"></span><span class="tree-number" data-path="${path}">${data}</span>`;
    }

    const isArray = Array.isArray(data);
    const entries = isArray ? data.map((v, i) => [i, v]) : Object.entries(data);
    const typeBadge = isArray ? '[ ]' : '{ }';
    const count = entries.length;
    const id = 'node-' + Math.random().toString(36).substr(2, 9);

    if (count === 0) {
        return `<span class="tree-type-badge">${typeBadge}</span><span class="tree-bracket">${isArray ? '[]' : '{}'}</span>`;
    }

    let html = '';
    html += `<span class="tree-toggle" onclick="toggleTreeNode('${id}')" id="toggle-${id}">\u2212</span>`;
    html += `<span class="tree-type-badge">${typeBadge}</span>`;
    html += `<span class="tree-count" style="display:none;">${count} ${isArray ? 'items' : 'keys'}</span>`;
    html += `<div class="tree-node" id="${id}">`;

    entries.forEach(([key, value], idx) => {
        const childPath = isArray ? `${path}[${key}]` : `${path}.${key}`;
        const escapedPath = childPath.replace(/'/g, "\\'");
        html += `<div class="tree-line" data-path="${childPath}">`;
        if (!isArray) {
            html += `<span class="tree-key" data-path="${childPath}" onclick="event.stopPropagation();copyPath('${escapedPath}')" title="Click to copy path">${key}</span><span class="tree-colon">:</span> `;
        } else {
            html += `<span class="tree-key" data-path="${childPath}" onclick="event.stopPropagation();copyPath('${escapedPath}')" title="Click to copy path" style="color:var(--text-muted);font-size:0.78rem;">${key}</span><span class="tree-colon">:</span> `;
        }
        html += buildTreeHTML(value, childPath, idx === count - 1);
        html += '</div>';
    });

    html += `</div>`;
    return html;
}

function toggleTreeNode(id) {
    const node = document.getElementById(id);
    const toggle = document.getElementById('toggle-' + id);
    if (!node || !toggle) return;
    const collapsed = node.style.display === 'none';
    node.style.display = collapsed ? '' : 'none';
    toggle.textContent = collapsed ? '\u2212' : '+';
    // show/hide count
    const count = toggle.nextElementSibling?.nextElementSibling;
    if (count && count.classList.contains('tree-count')) {
        count.style.display = collapsed ? 'none' : '';
    }
}

function toggleAllNodes(expand) {
    document.querySelectorAll('.tree-node').forEach(node => {
        node.style.display = expand ? '' : 'none';
    });
    document.querySelectorAll('.tree-toggle').forEach(toggle => {
        toggle.textContent = expand ? '\u2212' : '+';
    });
    document.querySelectorAll('.tree-count').forEach(count => {
        count.style.display = expand ? 'none' : '';
    });
}

function copyPath(path) {
    copyToClipboard(path);
    showToast(`Path copied: ${path}`);
}

// ===== Node Selection =====
function selectTreeLine(lineEl) {
    if (!lineEl) return;
    // Remove previous selection
    document.querySelectorAll('.tree-line.selected').forEach(el => el.classList.remove('selected'));
    lineEl.classList.add('selected');

    const path = lineEl.getAttribute('data-path') || '';
    const keyEl = lineEl.querySelector('.tree-key');
    const key = keyEl ? keyEl.textContent : '';

    // Find value
    let value = '';
    let type = '';
    const valueEl = lineEl.querySelector(':scope > .tree-string, :scope > .tree-number, :scope > .tree-boolean, :scope > .tree-null');
    if (valueEl) {
        value = valueEl.textContent;
        if (valueEl.classList.contains('tree-string')) type = 'string';
        else if (valueEl.classList.contains('tree-number')) type = 'number';
        else if (valueEl.classList.contains('tree-boolean')) type = 'boolean';
        else if (valueEl.classList.contains('tree-null')) type = 'null';
    } else {
        const badge = lineEl.querySelector(':scope > .tree-type-badge');
        if (badge) {
            type = badge.textContent.includes('[') ? 'array' : 'object';
            const countEl = lineEl.querySelector(':scope > .tree-count');
            value = type + (countEl ? ' (' + countEl.textContent + ')' : '');
        }
    }

    // Show detail panel
    const panel = document.getElementById('nodeDetail');
    if (panel) {
        panel.classList.add('visible');
        const dp = document.getElementById('detailPath');
        const dk = document.getElementById('detailKey');
        const dv = document.getElementById('detailValue');
        if (dp) dp.textContent = path;
        if (dk) dk.textContent = key;
        if (dv) dv.textContent = value;
    }
}

function copyDetail(what) {
    const el = document.getElementById('detail' + what.charAt(0).toUpperCase() + what.slice(1));
    if (el && el.textContent) {
        copyToClipboard(el.textContent);
    }
}

function setupTreeClickHandler(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.addEventListener('click', function(e) {
        // Don't interfere with toggle buttons
        if (e.target.classList.contains('tree-toggle')) return;
        // Don't interfere with key path copy
        if (e.target.classList.contains('tree-key')) return;
        // Don't interfere with text selection on values
        const sel = window.getSelection();
        if (sel && sel.toString().length > 0) return;

        const line = e.target.closest('.tree-line');
        if (line) selectTreeLine(line);
    });
}

// ===== Search in Tree =====
let _searchMatches = [];
let _searchIndex = -1;

function searchTree(keyword) {
    // Clear previous highlights
    _searchMatches = [];
    _searchIndex = -1;
    document.querySelectorAll('.tree-highlight-current').forEach(el => el.classList.remove('tree-highlight-current'));
    document.querySelectorAll('.tree-highlight').forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
    });

    if (!keyword) return 0;

    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    let count = 0;

    function highlightNode(el) {
        if (el.nodeType === 3) { // Text node
            const text = el.textContent;
            regex.lastIndex = 0;
            if (regex.test(text)) {
                regex.lastIndex = 0;
                const span = document.createElement('span');
                span.innerHTML = text.replace(regex, '<span class="tree-highlight">$1</span>');
                el.parentNode.replaceChild(span, el);
                count += (text.match(regex) || []).length;
            }
        } else if (el.nodeType === 1 && !el.classList.contains('tree-highlight')) {
            Array.from(el.childNodes).forEach(highlightNode);
        }
    }

    const treeContainer = document.getElementById('treeOutput') || document.querySelector('.tree-view');
    if (treeContainer) highlightNode(treeContainer);

    // Expand all nodes to show results
    if (count > 0) {
        toggleAllNodes(true);
        _searchMatches = Array.from(document.querySelectorAll('.tree-highlight'));
        if (_searchMatches.length > 0) {
            _searchIndex = 0;
            _highlightCurrent();
        }
    }
    return count;
}

function _highlightCurrent() {
    document.querySelectorAll('.tree-highlight-current').forEach(el => el.classList.remove('tree-highlight-current'));
    if (_searchMatches.length > 0 && _searchIndex >= 0 && _searchIndex < _searchMatches.length) {
        const current = _searchMatches[_searchIndex];
        current.classList.add('tree-highlight-current');
        current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function searchNext() {
    if (_searchMatches.length === 0) return;
    _searchIndex = (_searchIndex + 1) % _searchMatches.length;
    _highlightCurrent();
    _updateSearchCounter();
}

function searchPrev() {
    if (_searchMatches.length === 0) return;
    _searchIndex = (_searchIndex - 1 + _searchMatches.length) % _searchMatches.length;
    _highlightCurrent();
    _updateSearchCounter();
}

function _updateSearchCounter() {
    const el = document.getElementById('searchCount');
    if (el && _searchMatches.length > 0) {
        el.textContent = (_searchIndex + 1) + ' / ' + _searchMatches.length;
    }
}

// ===== Format Size =====
function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// ===== JSON to XML =====
function jsonToXml(obj, rootName = 'root', indent = '') {
    let xml = '';

    function convert(data, tag, level) {
        const pad = '  '.repeat(level);
        if (Array.isArray(data)) {
            data.forEach(item => convert(item, tag, level));
        } else if (data !== null && typeof data === 'object') {
            xml += `${pad}<${tag}>\n`;
            Object.entries(data).forEach(([key, val]) => {
                convert(val, key, level + 1);
            });
            xml += `${pad}</${tag}>\n`;
        } else {
            const val = data === null ? '' : String(data).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            xml += `${pad}<${tag}>${val}</${tag}>\n`;
        }
    }

    xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
    if (Array.isArray(obj)) {
        xml += `<${rootName}>\n`;
        obj.forEach(item => convert(item, 'item', 1));
        xml += `</${rootName}>\n`;
    } else if (obj !== null && typeof obj === 'object') {
        xml += `<${rootName}>\n`;
        Object.entries(obj).forEach(([key, val]) => {
            convert(val, key, 1);
        });
        xml += `</${rootName}>\n`;
    } else {
        xml += `<${rootName}>${obj}</${rootName}>\n`;
    }
    return xml;
}

// ===== JSON to TypeScript =====
function jsonToTypeScript(data, interfaceName = 'Root') {
    const interfaces = [];
    const seen = new Map();

    function getType(value, name) {
        if (value === null) return 'null';
        if (Array.isArray(value)) {
            if (value.length === 0) return 'any[]';
            const itemTypes = [...new Set(value.map(v => getType(v, name.replace(/s$/, ''))))];
            if (itemTypes.length === 1) return `${itemTypes[0]}[]`;
            return `(${itemTypes.join(' | ')})[]`;
        }
        if (typeof value === 'object') {
            const iName = capitalize(name);
            if (!seen.has(iName)) {
                seen.set(iName, true);
                generateInterface(value, iName);
            }
            return iName;
        }
        return typeof value;
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).replace(/[^a-zA-Z0-9]/g, '');
    }

    function generateInterface(obj, name) {
        let code = `interface ${name} {\n`;
        Object.entries(obj).forEach(([key, value]) => {
            const safeName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
            const type = getType(value, key);
            code += `  ${safeName}: ${type};\n`;
        });
        code += '}';
        interfaces.push(code);
    }

    if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
            generateInterface(data[0], interfaceName);
            return interfaces.reverse().join('\n\n') + `\n\ntype ${interfaceName}List = ${interfaceName}[];`;
        }
        return `type ${interfaceName} = ${getType(data, interfaceName)};`;
    }

    if (typeof data === 'object' && data !== null) {
        generateInterface(data, interfaceName);
        return interfaces.reverse().join('\n\n');
    }

    return `type ${interfaceName} = ${typeof data};`;
}

// ===== JSON Deep Diff =====
function jsonDiff(obj1, obj2, path = '$') {
    const diffs = [];

    function compare(a, b, p) {
        if (a === b) return;

        if (a === null || b === null || typeof a !== typeof b || typeof a !== 'object') {
            if (a !== undefined && b !== undefined) {
                diffs.push({ type: 'changed', path: p, oldValue: a, newValue: b });
            } else if (a === undefined) {
                diffs.push({ type: 'added', path: p, value: b });
            } else {
                diffs.push({ type: 'removed', path: p, value: a });
            }
            return;
        }

        if (Array.isArray(a) && Array.isArray(b)) {
            const maxLen = Math.max(a.length, b.length);
            for (let i = 0; i < maxLen; i++) {
                if (i >= a.length) {
                    diffs.push({ type: 'added', path: `${p}[${i}]`, value: b[i] });
                } else if (i >= b.length) {
                    diffs.push({ type: 'removed', path: `${p}[${i}]`, value: a[i] });
                } else {
                    compare(a[i], b[i], `${p}[${i}]`);
                }
            }
            return;
        }

        if (Array.isArray(a) !== Array.isArray(b)) {
            diffs.push({ type: 'changed', path: p, oldValue: a, newValue: b });
            return;
        }

        const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
        allKeys.forEach(key => {
            const childPath = `${p}.${key}`;
            if (!(key in a)) {
                diffs.push({ type: 'added', path: childPath, value: b[key] });
            } else if (!(key in b)) {
                diffs.push({ type: 'removed', path: childPath, value: a[key] });
            } else {
                compare(a[key], b[key], childPath);
            }
        });
    }

    compare(obj1, obj2, path);
    return diffs;
}

// ===== Navigation HTML Generator =====
function getNavHTML(activePage) {
    const mainPages = [
        { url: 'index.html', label: 'Viewer', id: 'viewer' },
        { url: 'json-validator.html', label: 'Validator', id: 'validator' },
        { url: 'json-minify.html', label: 'Minify', id: 'minify' },
        { url: 'json-diff.html', label: 'Diff', id: 'diff' },
    ];

    const convertPages = [
        { url: 'json-to-csv.html', label: 'JSON \u2192 CSV', id: 'to-csv' },
        { url: 'json-to-xml.html', label: 'JSON \u2192 XML', id: 'to-xml' },
        { url: 'json-to-yaml.html', label: 'JSON \u2192 YAML', id: 'to-yaml' },
        { url: 'json-to-typescript.html', label: 'JSON \u2192 TypeScript', id: 'to-ts' },
        { url: 'csv-to-json.html', label: 'CSV \u2192 JSON', id: 'csv-to-json' },
    ];

    const mainLinks = mainPages.map(p =>
        `<a href="${p.url}" class="${p.id === activePage ? 'active' : ''}">${p.label}</a>`
    ).join('');

    const convertActive = convertPages.some(p => p.id === activePage);
    const convertLinks = convertPages.map(p =>
        `<a href="${p.url}" class="${p.id === activePage ? 'active' : ''}">${p.label}</a>`
    ).join('');

    return `
    <nav class="navbar">
        <div class="nav-inner">
            <a href="index.html" class="nav-logo">{} <span>JSON Tools</span></a>
            <div class="nav-links" id="navLinks">
                ${mainLinks}
                <div class="nav-dropdown" id="convertDropdown">
                    <button class="nav-dropdown-toggle ${convertActive ? 'has-active' : ''}" onclick="toggleDropdown(event, 'convertDropdown')">
                        Convert &#9662;
                    </button>
                    <div class="nav-dropdown-menu">${convertLinks}</div>
                </div>
                <a href="about.html#feedback" class="${activePage === 'feedback' ? 'active' : ''}" style="color:var(--text-muted);font-size:0.78rem;">Feedback</a>
            </div>
            <div class="nav-right">
                <button class="theme-toggle" onclick="toggleTheme()" title="Toggle theme"></button>
                <button class="nav-toggle" onclick="toggleNav()">&#9776;</button>
            </div>
        </div>
    </nav>`;
}

function toggleDropdown(e, id) {
    e.stopPropagation();
    const dd = document.getElementById(id);
    if (!dd) return;
    const wasOpen = dd.classList.contains('open');
    // Close all dropdowns first
    document.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
    if (wasOpen) return;
    dd.classList.add('open');
    // Position the menu below the toggle button using fixed positioning
    const btn = dd.querySelector('.nav-dropdown-toggle');
    const menu = dd.querySelector('.nav-dropdown-menu');
    if (btn && menu) {
        const rect = btn.getBoundingClientRect();
        menu.style.top = rect.bottom + 4 + 'px';
        menu.style.left = rect.left + 'px';
    }
}

function getFooterHTML() {
    return `
    <footer class="site-footer">
        <div class="footer-inner">
            <span class="footer-copy">&copy; 2026 JSON Tools</span>
            <div class="footer-links">
                <a href="about.html">About</a>
                <a href="privacy-policy.html">Privacy Policy</a>
                <a href="terms.html">Terms of Service</a>
            </div>
        </div>
    </footer>`;
}

// ===== Tab Switching =====
function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.tab[data-tab="${tabId}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const activePanel = document.getElementById('panel-' + tabId);
    if (activePanel) activePanel.classList.add('active');
}

// ===== File Upload Button =====
function triggerUpload(textareaId, callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv,.txt,.xml,.yaml,.yml';
    input.onchange = () => {
        if (input.files[0]) {
            const ta = document.getElementById(textareaId);
            readFile(input.files[0], ta, callback);
        }
    };
    input.click();
}

// ===== Setup textarea as drop target =====
function setupTextareaDrop(textareaId, callback) {
    const ta = document.getElementById(textareaId);
    if (!ta) return;
    ta.addEventListener('dragover', e => {
        e.preventDefault();
        ta.classList.add('drag-over');
    });
    ta.addEventListener('dragleave', () => ta.classList.remove('drag-over'));
    ta.addEventListener('drop', e => {
        e.preventDefault();
        ta.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) readFile(file, ta, callback);
    });
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    // Close dropdown on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.nav-dropdown.open').forEach(dd => dd.classList.remove('open'));
    });
});
