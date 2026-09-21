// --- Constants & Configuration ---
const CONFIG = {
    carListPath: './hot-wheels.md',
    minBrandCount: 2,
    searchDebounceMs: 80,
    speedLinesShortMs: 800,
    speedLinesLongDuration: '20s',
    speedLinesShortDuration: '1.8s'
};

const SEGMENT_SHORT_NAMES = {
    'Hot Wheels': 'Hot Wheels',
    'Hot Wheels Premium': 'Premium',
    'Hot Wheels Silver Series': 'Silver Series',
    'Matchbox': 'Matchbox',
    'Matchbox Skybusters': 'Skybusters'
};

const BRAND_MAPPING = {
    special: [
        {test: (n) => n.startsWith('land rover'), value: 'Land Rover'},
        {test: (n) => n.startsWith('aston martin'), value: 'Aston Martin'},
        {test: (n) => n.startsWith('alfa romeo'), value: 'Alfa Romeo'},
        {test: (n) => n.startsWith('gordon murray'), value: 'Gordon Murray'},
        {
            test: (n) =>
                /\b(batman|bat\s*boat|batmobile|batcopter|batwing)\b/i.test(n),
            value: 'Batmobile'
        }
    ],
    aliases: {
        chevrolet: 'Chevy',
        chevy: 'Chevy',
        camaro: 'Chevy',
        corvette: 'Chevy',
        chevelle: 'Chevy',
        silverado: 'Chevy',
        mustang: 'Ford',
        volkswagen: 'VW',
        vw: 'VW',
        bmw: 'BMW',
        ram: 'RAM',
        gmc: 'GMC',
        mclaren: 'McLaren',
        'mercedes-benz': 'Mercedes',
        datzun: 'Datsun'
    },
    known: new Set([
        'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Austin', 'BMW', 'Batmobile',
        'Boeing', 'Bugatti', 'Buick', 'Cadillac', 'Cessna', 'Chevy', 'Chrysler',
        'Cirrus', 'Czinger', 'Datsun', 'Dodge', 'Ferrari', 'Fiat', 'Ford',
        'Freightliner', 'GMC', 'Gordon Murray', 'Honda', 'Jaguar', 'Jeep', 'Kia',
        'Koenigsegg', 'Lamborghini', 'Land Rover', 'Lexus', 'Lincoln', 'Lotus',
        'Lucid', 'Maserati', 'Mazda', 'McLaren', 'Mercedes', 'Mercury', 'Mitsubishi',
        'Nissan', 'Pagani', 'Peugeot', 'Plymouth', 'Polestar', 'Pontiac', 'Porsche',
        'RAM', 'Renault', 'Shelby', 'Sikorsky', 'Subaru', 'Tesla', 'Toyota', 'VW',
        'Vespa', 'Volvo', 'Willys'
    ])
};

const ICONS = {
    copy: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    copied: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    wiki: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`
};

// --- DOM References ---
const DOM = {
    searchInput: document.getElementById('search'),
    sortBtn: document.getElementById('sortBtn'),
    sortVal: document.getElementById('sortVal'),
    sortMenu: document.getElementById('sortMenu'),
    copyListBtn: document.getElementById('copyListBtn'),
    clearBtn: document.getElementById('clearSearch'),
    statUnique: document.getElementById('statUnique'),
    resultsList: document.getElementById('results'),
    brandChipsContainer: document.getElementById('brandChips')
};

// --- Application State ---
const state = {
    rawCars: [],
    groupedCars: [],
    currentlyVisibleItems: [],
    currentFilter: {type: 'all', value: null},
    currentSort: 'name-asc',
    fuse: null,
    speedLinesTimer: null
};

// --- Helper Functions ---
function escapeHtml(text) {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function debounce(fn, delay) {
    let timerId = null;
    return (...args) => {
        window.clearTimeout(timerId);
        timerId = window.setTimeout(() => fn(...args), delay);
    };
}

function copyToClipboard(text, btn) {
    if (!text || !btn) return;
    navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied');
        btn.innerHTML = ICONS.copied;
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = ICONS.copy;
        }, 1200);
    });
}

const TAG_COLOR_PATTERNS = [
    [/mainline|base/i, 'v-tag-mainline'],
    [/black/i, 'v-tag-black'],
    [/red|maroon/i, 'v-tag-red'],
    [/pink/i, 'v-tag-pink'],
    [/green/i, 'v-tag-green'],
    [/yellow/i, 'v-tag-yellow'],
    [/purple/i, 'v-tag-purple'],
    [/blue/i, 'v-tag-blue'],
    [/brown/i, 'v-tag-brown'],
    [/white/i, 'v-tag-white'],
    [/silver|grey|gray/i, 'v-tag-silver'],
    [/\b(treasure hunt|th)\b/i, 'v-tag-th']
];

function getTagClassName(tag) {
    if (!tag) return 'v-tag-default';
    const match = TAG_COLOR_PATTERNS.find(([pattern]) => pattern.test(tag));
    return match ? match[1] : 'v-tag-default';
}

function getBrand(carName) {
    let name = carName.replace(/^['’]?\d{2,4}\s+/, '').trim();
    if (/^custom\s+/i.test(name)) {
        name = name.replace(/^custom\s+(['’]?\d{2,4}\s+)?/i, '').trim();
    }
    const lower = name.toLowerCase();

    const specialMatch = BRAND_MAPPING.special.find((item) => item.test(lower));
    if (specialMatch) return specialMatch.value;

    const firstWord = lower.split(/\s+/)[0];
    const mapped = BRAND_MAPPING.aliases[firstWord];
    if (mapped) return mapped;

    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
}

function getWikiUrl(carName, segment = '') {
    let wikiName = carName
        .replace(/\s*\([^)]*treasure\s+hunt[^)]*\)/gi, '')
        .trim();
    if (/^\d{2}\s/.test(wikiName)) {
        wikiName = "'" + wikiName;
    } else if (/^custom\s+\d{2}\s/i.test(wikiName)) {
        wikiName = wikiName.replace(/^custom\s+(\d{2})\b/i, "Custom '$1");
    }
    const isMatchbox = typeof segment === 'string'
        ? segment.toLowerCase().includes('matchbox')
        : Array.isArray(segment) && segment.some((s) => s.toLowerCase().includes('matchbox'));
    const domain = isMatchbox ? 'matchbox.fandom.com' : 'hotwheels.fandom.com';
    return `https://${domain}/wiki/${encodeURIComponent(wikiName.replace(/\s+/g, '_'))}`;
}

function highlightQuery(name, query) {
    if (!query) return escapeHtml(name);
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = name.split(regex);
    return parts
        .map((part) => {
            if (part.toLowerCase() === query.toLowerCase()) {
                return `<mark class="highlight">${escapeHtml(part)}</mark>`;
            }
            return escapeHtml(part);
        })
        .join('');
}

function extractCarNameAndTag(fullName) {
    const parenIdx = fullName.indexOf('(');
    if (parenIdx !== -1 && fullName.endsWith(')')) {
        return {
            baseName: fullName.slice(0, parenIdx).trim(),
            tag: fullName.slice(parenIdx + 1, -1).trim()
        };
    }
    return {baseName: fullName, tag: null};
}

// --- Data Parsing & Grouping ---
function parseMarkdownCars(markdownText) {
    let currentSegment = 'Hot Wheels';
    const cars = [];
    markdownText.split('\n').forEach((rawLine, index) => {
        const line = rawLine.trim();
        if (line.startsWith('#')) {
            currentSegment = line.replace(/^#+\s*/, '').trim();
        } else if (line.startsWith('- ')) {
            const name = line.slice(2).trim();
            const isTreasureHunt =
                /\btreasure\s+hunt\b/i.test(name) || /\bth\b/i.test(name);
            if (name.length > 0) {
                cars.push({
                    id: index + 1,
                    name,
                    isTreasureHunt,
                    rawLine: line,
                    segment: currentSegment
                });
            }
        }
    });
    return cars;
}

function createCastingGroup(id, baseName, group) {
    const variants = Array.from(group.variantsMap.values());
    const nonThVariants = variants.filter(
        (v) => !/\b(treasure hunt|th)\b/i.test(v.tag)
    );

    const hasExactDuplicates =
        variants.some((v) => v.count > 1) || group.totalCount > 1;
    const hasMultipleVariants = nonThVariants.length > 1 || hasExactDuplicates;
    const showVariantPills = nonThVariants.length > 1;

    const brand = getBrand(baseName);
    const searchTokens = [
        baseName,
        brand,
        ...variants.flatMap((v) => v.fullNames),
        ...variants.map((v) => v.tag).filter(Boolean)
    ].filter(Boolean);

    return {
        id,
        baseName,
        totalCount: group.totalCount,
        variants,
        rawLines: variants.flatMap((v) => v.rawLines),
        showVariantPills,
        isDuplicate: hasExactDuplicates,
        isVariant: hasMultipleVariants,
        isTreasureHunt: group.hasTH,
        brand,
        segment: group.segment,
        searchString: searchTokens.join(' ')
    };
}

function groupCastings(parsedCars) {
    const groupsMap = new Map();

    parsedCars.forEach((item) => {
        const {baseName, tag} = extractCarNameAndTag(item.name);
        const groupKey = `${item.segment}:::${baseName}`;

        if (!groupsMap.has(groupKey)) {
            groupsMap.set(groupKey, {
                baseName,
                segment: item.segment,
                variantsMap: new Map(),
                totalCount: 0,
                hasTH: false
            });
        }

        const group = groupsMap.get(groupKey);
        group.totalCount += 1;
        if (item.isTreasureHunt) group.hasTH = true;

        const tagKey = tag ? tag.toLowerCase() : '__mainline__';
        const displayTag = tag || 'Mainline';

        if (!group.variantsMap.has(tagKey)) {
            group.variantsMap.set(tagKey, {
                tag: displayTag,
                isDefault: tag === null,
                count: 0,
                isTreasureHunt: item.isTreasureHunt,
                fullNames: [],
                rawLines: [],
                segment: item.segment
            });
        }

        const varEntry = group.variantsMap.get(tagKey);
        varEntry.count += 1;
        varEntry.fullNames.push(item.name);
        varEntry.rawLines.push(item.rawLine);
    });

    let idCounter = 1;
    const list = [];
    groupsMap.forEach((group) => {
        list.push(createCastingGroup(idCounter++, group.baseName, group));
    });

    return list;
}

// --- UI Rendering ---
function renderBadges(item) {
    let html = '';
    if (item.isTreasureHunt) {
        html += `<span class="badge badge-th">TH</span>`;
    }
    if (item.totalCount > 1) {
        html += `<span class="badge badge-duplicate">x${item.totalCount}</span>`;
    }
    return html;
}

function renderVariantPills(item) {
    if (!item.showVariantPills || !item.variants || !item.variants.length) {
        return '';
    }
    const pills = item.variants
        .filter((v) => v.tag !== null && !/\b(treasure hunt|th)\b/i.test(v.tag))
        .map((v) => {
            const tagClass = getTagClassName(v.tag);
            const countSuffix =
                v.count > 1 ? ` <span class="v-count">x${v.count}</span>` : '';
            return `<span class="variant-pill ${tagClass}">${escapeHtml(v.tag)}${countSuffix}</span>`;
        })
        .join('');
    return pills ? `<div class="variant-pills">${pills}</div>` : '';
}

function createCarRowHtml(item, query) {
    const score =
        typeof item.score === 'number'
            ? Math.round((1 - item.score) * 100)
            : null;
    const scoreTag =
        score !== null ? `<span class="score">${score}% match</span>` : '';

    const displayName = highlightQuery(item.baseName, query);
    const wikiUrl = getWikiUrl(item.baseName, item.segment);

    return `
        <li data-id="${item.id}" tabindex="0">
            <div class="car-info">
                <div class="car-name-container">
                    <span class="car-name">${displayName}</span>
                </div>
                ${renderVariantPills(item)}
                <div class="badges">${renderBadges(item)}</div>
            </div>
            ${scoreTag}
            <div class="car-actions">
                <button class="action-btn copy-btn" title="Copy name" aria-label="Copy name" data-copy="${escapeHtml(item.baseName)}">
                    ${ICONS.copy}
                </button>
                <a href="${wikiUrl}" target="_blank" rel="noopener noreferrer" class="action-btn wiki-btn" title="View Fandom Wiki Page" aria-label="View Wiki Page">
                    ${ICONS.wiki}
                </a>
            </div>
        </li>
    `;
}

function renderEmpty(message) {
    DOM.resultsList.innerHTML = `<li class="empty">${escapeHtml(message)}</li>`;
}

function renderCarList(items, query = '') {
    if (!items.length) {
        renderEmpty('No matching car found. Try a different spelling.');
        return;
    }

    DOM.resultsList.innerHTML = items
        .map((item) => createCarRowHtml(item, query))
        .join('');

    // Frame-aligned horizontal scroll animation calculation
    requestAnimationFrame(() => {
        const overflowList = [];
        DOM.resultsList.querySelectorAll('.car-name').forEach((el) => {
            const container = el.parentElement;
            if (!container) return;
            const overflowVal = el.scrollWidth - container.clientWidth;
            if (overflowVal > 0) {
                overflowList.push({container, overflowVal});
            }
        });

        overflowList.forEach(({container, overflowVal}) => {
            container.classList.add('has-ticker');
            container.style.setProperty(
                '--scroll-dist',
                `-${overflowVal + 10}px`
            );
            container.style.setProperty(
                '--ticker-duration',
                `${Math.max(3, Math.round(overflowVal / 35))}s`
            );
        });
    });
}

function getTopBrands() {
    const brandCounts = {};
    state.groupedCars.forEach((car) => {
        brandCounts[car.brand] = (brandCounts[car.brand] || 0) + car.totalCount;
    });

    const sortedBrands = Object.entries(brandCounts)
        .filter(
            ([brand, count]) =>
                brand &&
                BRAND_MAPPING.known.has(brand) &&
                count >= (CONFIG.minBrandCount ?? 2)
        )
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    const topBrands = sortedBrands.map(([brand]) => brand);

    return {topBrands, brandCounts};
}

function renderBrandChips() {
    if (!DOM.brandChipsContainer) return;

    const {topBrands, brandCounts} = getTopBrands();
    const totalTH = state.rawCars.filter((c) => c.isTreasureHunt).length;
    const totalVariants = state.groupedCars
        .filter((c) => c.isVariant || c.isDuplicate)
        .reduce((sum, c) => sum + c.totalCount, 0);

    const segments = Array.from(
        new Set(state.rawCars.map((c) => c.segment).filter(Boolean))
    );

    let html = `<button class="chip active" data-filter="all">All (${state.rawCars.length})</button>`;

    if (segments.length > 1) {
        segments.sort((a, b) => {
            const countA = state.rawCars.filter((c) => c.segment === a).length;
            const countB = state.rawCars.filter((c) => c.segment === b).length;
            return countB - countA || a.localeCompare(b);
        });
        segments.forEach((seg) => {
            const count = state.rawCars.filter((c) =>
                c.segment === seg
            ).length;
            const label = SEGMENT_SHORT_NAMES[seg] || seg;
            html += `<button class="chip" data-filter="segment" data-val="${escapeHtml(seg)}">${escapeHtml(label)} (${count})</button>`;
        });
    }

    if (totalVariants > 0) {
        html += `<button class="chip" data-filter="variants">Variants (${totalVariants})</button>`;
    }
    if (totalTH > 0) {
        html += `<button class="chip" data-filter="treasure-hunt">Treasure Hunt (${totalTH})</button>`;
    }

    topBrands.forEach((brand) => {
        html += `<button class="chip" data-filter="brand" data-val="${escapeHtml(brand)}">${escapeHtml(brand)} (${brandCounts[brand]})</button>`;
    });

    DOM.brandChipsContainer.innerHTML = html;
}

// --- User Interaction & Events ---
function triggerSpeedLines() {
    document.documentElement.style.setProperty(
        '--speed-lines-duration',
        CONFIG.speedLinesShortDuration
    );
    if (state.speedLinesTimer) {
        clearTimeout(state.speedLinesTimer);
    }
    state.speedLinesTimer = setTimeout(() => {
        document.documentElement.style.setProperty(
            '--speed-lines-duration',
            CONFIG.speedLinesLongDuration
        );
    }, CONFIG.speedLinesShortMs);
}

function sortItems(items) {
    const sorted = [...items];
    if (state.currentSort === 'name-asc') {
        sorted.sort((a, b) => a.baseName.localeCompare(b.baseName));
    } else if (state.currentSort === 'name-desc') {
        sorted.sort((a, b) => b.baseName.localeCompare(a.baseName));
    } else if (state.currentSort === 'qty-desc') {
        sorted.sort(
            (a, b) =>
                b.totalCount - a.totalCount ||
                a.baseName.localeCompare(b.baseName)
        );
    }
    return sorted;
}

function runSearch() {
    const query = DOM.searchInput.value.trim();
    if (DOM.clearBtn) DOM.clearBtn.disabled = query.length === 0;

    let items = query
        ? state.fuse.search(query).map((entry) => ({
              ...entry.item,
              score: entry.score
          }))
        : state.groupedCars;

    const {type, value} = state.currentFilter;
    if (type === 'variants') {
        items = items.filter((car) => car.isVariant || car.isDuplicate);
    } else if (type === 'treasure-hunt') {
        items = items.filter((car) => car.isTreasureHunt);
    } else if (type === 'segment') {
        items = items.filter((car) => car.segment === value);
    } else if (type === 'brand') {
        items = items.filter((car) => car.brand === value);
    }

    items = sortItems(items);
    state.currentlyVisibleItems = items;
    if (DOM.statUnique) DOM.statUnique.textContent = items.length;
    renderCarList(items, query);
}

function initChipDelegation() {
    if (!DOM.brandChipsContainer) return;

    DOM.brandChipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        const filterType = chip.getAttribute('data-filter');
        const isActive = chip.classList.contains('active');

        DOM.brandChipsContainer
            .querySelectorAll('.chip')
            .forEach((c) => c.classList.remove('active'));

        if (isActive && filterType !== 'all') {
            const allChip = DOM.brandChipsContainer.querySelector(
                '[data-filter="all"]'
            );
            if (allChip) allChip.classList.add('active');
            state.currentFilter = {type: 'all', value: null};
        } else {
            chip.classList.add('active');
            state.currentFilter = {
                type: filterType,
                value: chip.getAttribute('data-val') || null
            };
        }

        triggerSpeedLines();
        runSearch();
    });
}

function initCopyDelegation() {
    DOM.resultsList.addEventListener('click', (e) => {
        const btn = e.target.closest('.copy-btn');
        if (btn) copyToClipboard(btn.getAttribute('data-copy'), btn);
    });
}

function initSortMenuDelegation() {
    if (!DOM.sortBtn || !DOM.sortMenu) return;

    DOM.sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !DOM.sortMenu.classList.contains('hidden');
        DOM.sortMenu.classList.toggle('hidden', isOpen);
        DOM.sortBtn.setAttribute('aria-expanded', String(!isOpen));
    });

    DOM.sortMenu.addEventListener('click', (e) => {
        const option = e.target.closest('.sort-option');
        if (!option) return;

        const val = option.getAttribute('data-val');
        const text = option.textContent;

        DOM.sortMenu.querySelectorAll('.sort-option').forEach((opt) => {
            const isActive = opt === option;
            opt.classList.toggle('active', isActive);
            opt.setAttribute('aria-selected', String(isActive));
        });

        if (DOM.sortVal) DOM.sortVal.textContent = text;
        state.currentSort = val;
        DOM.sortMenu.classList.add('hidden');
        DOM.sortBtn.setAttribute('aria-expanded', 'false');

        triggerSpeedLines();
        runSearch();
    });

    document.addEventListener('click', () => {
        if (DOM.sortMenu && !DOM.sortMenu.classList.contains('hidden')) {
            DOM.sortMenu.classList.add('hidden');
            if (DOM.sortBtn) DOM.sortBtn.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && DOM.sortMenu && !DOM.sortMenu.classList.contains('hidden')) {
            DOM.sortMenu.classList.add('hidden');
            if (DOM.sortBtn) DOM.sortBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

function initExportDelegation() {
    if (!DOM.copyListBtn) return;
    DOM.copyListBtn.innerHTML = ICONS.copy;

    DOM.copyListBtn.addEventListener('click', () => {
        const items = state.currentlyVisibleItems.length
            ? state.currentlyVisibleItems
            : state.groupedCars;
        const exportText = items.flatMap((car) => car.rawLines).join('\n');
        copyToClipboard(exportText, DOM.copyListBtn);
    });
}

function initSearchEvents() {
    DOM.searchInput.addEventListener(
        'input',
        debounce(() => {
            triggerSpeedLines();
            runSearch();
        }, CONFIG.searchDebounceMs)
    );

    if (DOM.clearBtn) {
        DOM.clearBtn.addEventListener('click', () => {
            DOM.searchInput.value = '';
            triggerSpeedLines();
            runSearch();
            DOM.searchInput.focus();
        });
    }
}

function handleSearchKeyboardShortcuts(e, isInputFocused, isSearchFocused) {
    if ((e.key === '/' || e.key.toLowerCase() === 's') && !isInputFocused) {
        e.preventDefault();
        DOM.searchInput.focus();
        triggerSpeedLines();
        return true;
    }

    if (e.key === 'Escape' && isSearchFocused) {
        DOM.searchInput.value = '';
        triggerSpeedLines();
        runSearch();
        DOM.searchInput.blur();
        return true;
    }

    if (isSearchFocused && e.key === 'ArrowDown') {
        const firstItem = DOM.resultsList.querySelector('li[tabindex="0"]');
        if (firstItem) {
            e.preventDefault();
            firstItem.focus();
        }
        return true;
    }

    return false;
}

function handleListKeyboardShortcuts(e, focusedLi) {
    const listItems = Array.from(
        DOM.resultsList.querySelectorAll('li[tabindex="0"]')
    );
    const index = listItems.indexOf(focusedLi);
    const key = e.key.toLowerCase();

    if (e.key === 'ArrowDown' || key === 'j') {
        e.preventDefault();
        const nextItem = listItems[index + 1];
        if (nextItem) nextItem.focus();
    } else if (e.key === 'ArrowUp' || key === 'k') {
        e.preventDefault();
        const prevItem = listItems[index - 1];
        if (prevItem) {
            prevItem.focus();
        } else {
            DOM.searchInput.focus();
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        DOM.searchInput.focus();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const wikiLink = focusedLi.querySelector('.wiki-btn');
        if (wikiLink) window.open(wikiLink.href, '_blank');
    } else if (key === 'c') {
        e.preventDefault();
        const copyBtn = focusedLi.querySelector('.copy-btn');
        if (copyBtn) copyBtn.click();
    }
}

function initKeyboardNavigation() {
    window.addEventListener('keydown', (e) => {
        const activeEl = document.activeElement;
        const isInputFocused =
            activeEl &&
            (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
                activeEl.isContentEditable);
        const isSearchFocused = activeEl === DOM.searchInput;

        if (handleSearchKeyboardShortcuts(e, isInputFocused, isSearchFocused)) {
            return;
        }

        const focusedLi = activeEl ? activeEl.closest('li[data-id]') : null;
        if (focusedLi) {
            handleListKeyboardShortcuts(e, focusedLi);
        }
    });
}

// --- Initialization ---
async function init() {
    try {
        const response = await fetch(CONFIG.carListPath);
        if (!response.ok) {
            throw new Error(`Failed to load ${CONFIG.carListPath}`);
        }

        const markdown = await response.text();
        state.rawCars = parseMarkdownCars(markdown);

        if (!state.rawCars.length) {
            renderEmpty('No car names detected in hot-wheels.md.');
            return;
        }

        state.groupedCars = groupCastings(state.rawCars);

        if (DOM.statUnique) DOM.statUnique.textContent = state.groupedCars.length;
        if (DOM.searchInput) {
            DOM.searchInput.placeholder = `Search ${state.rawCars.length} cars... (/)`;
        }

        state.fuse = new Fuse(state.groupedCars, {
            keys: ['baseName', 'searchString'],
            includeScore: true,
            threshold: 0.35,
            ignoreLocation: true,
            minMatchCharLength: 2,
            shouldSort: true
        });

        renderBrandChips();
        state.currentlyVisibleItems = state.groupedCars;
        renderCarList(state.groupedCars, '');
        initChipDelegation();
        initSortMenuDelegation();
        initExportDelegation();
        initCopyDelegation();
        initSearchEvents();
        initKeyboardNavigation();

        if (DOM.clearBtn) DOM.clearBtn.disabled = true;
        DOM.searchInput.focus();
    } catch (error) {
        renderEmpty('Could not load the collection file.');
        console.error(error);
    }
}

init();
