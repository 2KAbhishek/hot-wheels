// --- Constants & Configuration ---
const CONFIG = {
    carListPath: './hot-wheels.md',
    topBrandsCount: 50,
    searchDebounceMs: 80,
    speedLinesShortMs: 800,
    speedLinesLongDuration: '20s',
    speedLinesShortDuration: '1.8s'
};

const BRAND_MAPPING = {
    special: [
        {test: (n) => n.startsWith('land rover'), value: 'Land Rover'},
        {test: (n) => n.startsWith('aston martin'), value: 'Aston Martin'},
        {test: (n) => n.startsWith('alfa romeo'), value: 'Alfa Romeo'},
        {test: (n) => n.startsWith('gordon murray'), value: 'Gordon Murray'},
        {
            test: (n) =>
                n.includes('batman') ||
                n.includes('bat boat') ||
                n.includes('batmobile') ||
                n.includes('batcopter'),
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
        bugatti: 'Bugatti',
        volkswagen: 'VW',
        vw: 'VW',
        bmw: 'BMW',
        honda: 'Honda',
        ford: 'Ford',
        nissan: 'Nissan',
        mazda: 'Mazda',
        porsche: 'Porsche',
        tesla: 'Tesla',
        volvo: 'Volvo',
        cadillac: 'Cadillac',
        dodge: 'Dodge',
        mclaren: 'McLaren',
        ferrari: 'Ferrari',
        lamborghini: 'Lamborghini',
        mercedes: 'Mercedes',
        'mercedes-benz': 'Mercedes',
        pagani: 'Pagani',
        czinger: 'Czinger',
        austin: 'Austin',
        willys: 'Willys',
        datzun: 'Datsun',
        datsun: 'Datsun',
        audi: 'Audi',
        lotus: 'Lotus',
        acura: 'Acura',
        toyota: 'Toyota',
        subaru: 'Subaru',
        jaguar: 'Jaguar',
        lexus: 'Lexus',
        pontiac: 'Pontiac',
        kia: 'Kia',
        jeep: 'Jeep',
        shelby: 'Shelby',
        plymouth: 'Plymouth',
        renault: 'Renault',
        peugeot: 'Peugeot',
        polestar: 'Polestar'
    }
};

const ICONS = {
    copy: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    copied: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    wiki: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`
};

// --- DOM References ---
const DOM = {
    searchInput: document.getElementById('search'),
    clearButtons: document.querySelectorAll('.clear-search-btn'),
    statsMsg: document.getElementById('stats'),
    statTotal: document.getElementById('statTotal'),
    statUnique: document.getElementById('statUnique'),
    resultsList: document.getElementById('results'),
    brandChipsContainer: document.getElementById('brandChips')
};

// --- Application State ---
const state = {
    rawCars: [],
    groupedCars: [],
    currentFilter: {type: 'all', value: null},
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

function getTagClassName(tag) {
    if (!tag) return 'v-tag-default';
    const lower = tag.toLowerCase().trim();
    if (lower === 'mainline' || lower === 'base') return 'v-tag-mainline';
    if (lower.includes('black')) return 'v-tag-black';
    if (lower.includes('red')) return 'v-tag-red';
    if (lower.includes('pink')) return 'v-tag-pink';
    if (lower.includes('green')) return 'v-tag-green';
    if (lower.includes('yellow')) return 'v-tag-yellow';
    if (lower.includes('purple')) return 'v-tag-purple';
    if (lower.includes('blue')) return 'v-tag-blue';
    if (lower.includes('brown')) return 'v-tag-brown';
    if (lower.includes('white')) return 'v-tag-white';
    if (
        lower.includes('silver') ||
        lower.includes('grey') ||
        lower.includes('gray')
    )
        return 'v-tag-silver';
    if (lower.includes('maroon')) return 'v-tag-maroon';
    if (lower.includes('treasure hunt') || lower.includes('th'))
        return 'v-tag-th';
    return 'v-tag-default';
}

function getBrand(carName) {
    let name = carName.replace(/^['’]?\d{2,4}\s+/, '').trim();
    const lower = name.toLowerCase();

    const specialMatch = BRAND_MAPPING.special.find((item) => item.test(lower));
    if (specialMatch) return specialMatch.value;

    const firstWord = lower.split(/\s+/)[0];
    const mapped = BRAND_MAPPING.aliases[firstWord];
    if (mapped) return mapped;

    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
}

function getWikiUrl(carName) {
    let wikiName = carName
        .replace(/\s*\([^)]*treasure\s+hunt[^)]*\)/gi, '')
        .trim();
    if (/^\d{2}\s/.test(wikiName)) {
        wikiName = "'" + wikiName;
    }
    return `https://hotwheels.fandom.com/wiki/${encodeURIComponent(wikiName.replace(/\s+/g, '_'))}`;
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

// --- Data Parsing & Grouping ---
function parseMarkdownCars(markdownText) {
    return markdownText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('- '))
        .map((line, index) => {
            const name = line.slice(2).trim();
            const isTreasureHunt =
                /\btreasure\s+hunt\b/i.test(name) || /\bth\b/i.test(name);
            return {id: index + 1, name, isTreasureHunt};
        })
        .filter((item) => item.name.length > 0);
}

function groupCastings(parsedCars) {
    const groupsMap = new Map();

    parsedCars.forEach((item) => {
        let name = item.name;
        let baseName = name;
        let tag = null;

        const parenIdx = name.indexOf('(');
        if (parenIdx !== -1 && name.endsWith(')')) {
            baseName = name.slice(0, parenIdx).trim();
            tag = name.slice(parenIdx + 1, -1).trim();
        }

        if (!groupsMap.has(baseName)) {
            groupsMap.set(baseName, {
                baseName,
                variantsMap: new Map(),
                totalCount: 0,
                hasTH: false
            });
        }

        const group = groupsMap.get(baseName);
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
                fullNames: []
            });
        }

        const varEntry = group.variantsMap.get(tagKey);
        varEntry.count += 1;
        varEntry.fullNames.push(item.name);
    });

    let idCounter = 1;
    const list = [];

    groupsMap.forEach((group, baseName) => {
        const variants = Array.from(group.variantsMap.values());
        const nonThVariants = variants.filter(
            (v) => !/\b(treasure hunt|th)\b/i.test(v.tag)
        );

        const exactDupCount = variants.reduce(
            (sum, v) => sum + (v.count > 1 ? v.count : 0),
            0
        );
        const hasExactDuplicates =
            variants.some((v) => v.count > 1) || group.totalCount > 1;
        const hasMultipleVariants =
            nonThVariants.length > 1 || hasExactDuplicates;
        const showVariantPills = nonThVariants.length > 1;

        const searchTokens = [
            baseName,
            ...variants.flatMap((v) => v.fullNames),
            ...variants.map((v) => v.tag).filter(Boolean)
        ];

        list.push({
            id: idCounter++,
            baseName,
            totalCount: group.totalCount,
            variants,
            showVariantPills,
            exactDupCount,
            isDuplicate: hasExactDuplicates,
            isVariant: hasMultipleVariants,
            isTreasureHunt: group.hasTH,
            brand: getBrand(baseName),
            searchString: searchTokens.join(' ')
        });
    });

    return list;
}

// --- UI Rendering ---
function renderBadges(item) {
    let html = '';
    if (item.isTreasureHunt) {
        html += `<span class="badge badge-th">TH</span>`;
    }
    if (item.isDuplicate) {
        const dupLabel =
            item.exactDupCount > 0 ? `x${item.exactDupCount}` : 'x2';
        html += `<span class="badge badge-duplicate">${dupLabel}</span>`;
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
    const wikiUrl = getWikiUrl(item.baseName);

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

function updateStatsDashboard(visibleCount, totalCount, query) {
    const totalCars = state.rawCars.length;
    if (DOM.statTotal) DOM.statTotal.textContent = totalCars;
    if (DOM.statUnique) DOM.statUnique.textContent = state.groupedCars.length;

    if (!totalCount) {
        DOM.statsMsg.textContent = 'Empty collection.';
        return;
    }

    if (!query) {
        if (state.currentFilter.type === 'variants') {
            DOM.statsMsg.textContent = `Showing ${visibleCount} castings with variants & duplicates.`;
        } else if (state.currentFilter.type === 'treasure-hunt') {
            DOM.statsMsg.textContent = `Showing ${visibleCount} Treasure Hunt castings.`;
        } else if (state.currentFilter.type === 'brand') {
            DOM.statsMsg.textContent = `Showing ${visibleCount} ${state.currentFilter.value} castings.`;
        } else {
            DOM.statsMsg.textContent = `Showing all ${totalCount} unique castings (${totalCars} total cars).`;
        }
        return;
    }

    DOM.statsMsg.textContent = `${visibleCount} matching casting${visibleCount === 1 ? '' : 's'}.`;
}

function renderCarList(items, query = '') {
    if (!items.length) {
        renderEmpty('No matching car found. Try a different spelling.');
        updateStatsDashboard(0, state.groupedCars.length, query);
        return;
    }

    DOM.resultsList.innerHTML = items
        .map((item) => createCarRowHtml(item, query))
        .join('');
    updateStatsDashboard(items.length, state.groupedCars.length, query);

    // Frame-aligned horizontal scroll animation calculation
    requestAnimationFrame(() => {
        DOM.resultsList.querySelectorAll('.car-name').forEach((el) => {
            const container = el.parentElement;
            if (!container) return;
            const overflowVal = el.scrollWidth - container.clientWidth;
            if (overflowVal > 0) {
                container.classList.add('has-ticker');
                container.style.setProperty(
                    '--scroll-dist',
                    `-${overflowVal + 10}px`
                );
                const duration = Math.max(3, Math.round(overflowVal / 35));
                container.style.setProperty(
                    '--ticker-duration',
                    `${duration}s`
                );
            }
        });
    });
}

function getTopBrands() {
    const brandCounts = {};
    state.groupedCars.forEach((car) => {
        const brand = getBrand(car.baseName);
        brandCounts[brand] = (brandCounts[brand] || 0) + car.totalCount;
    });

    const knownBrands = new Set([
        ...Object.values(BRAND_MAPPING.aliases),
        ...BRAND_MAPPING.special.map((s) => s.value)
    ]);

    const sortedBrands = Object.entries(brandCounts)
        .filter(([brand]) => brand && brand.length > 0)
        .sort((a, b) => b[1] - a[1]);

    const topBrands = sortedBrands
        .filter(([brand]) => knownBrands.has(brand))
        .slice(0, CONFIG.topBrandsCount)
        .map(([brand]) => brand);

    return {topBrands, brandCounts};
}

function renderBrandChips() {
    if (!DOM.brandChipsContainer) return;

    const {topBrands, brandCounts} = getTopBrands();
    const totalTH = state.groupedCars.filter((c) => c.isTreasureHunt).length;
    const totalVariants = state.groupedCars.filter(
        (c) => c.isVariant || c.isDuplicate
    ).length;

    let html = `<button class="chip active" data-filter="all">All (${state.groupedCars.length})</button>`;

    if (totalTH > 0) {
        html += `<button class="chip" data-filter="treasure-hunt">Treasure Hunt (${totalTH})</button>`;
    }
    if (totalVariants > 0) {
        html += `<button class="chip" data-filter="variants">Variants (${totalVariants})</button>`;
    }

    topBrands.forEach((brand) => {
        html += `<button class="chip" data-filter="brand" data-val="${escapeHtml(brand)}">${escapeHtml(brand)} (${brandCounts[brand]})</button>`;
    });

    DOM.brandChipsContainer.innerHTML = html;
    attachChipListeners();
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

function runSearch() {
    const query = DOM.searchInput.value.trim();
    DOM.clearButtons.forEach((btn) => (btn.disabled = query.length === 0));

    let items = [];
    if (!query) {
        items = state.groupedCars;
    } else {
        items = state.fuse.search(query).map((entry) => ({
            ...entry.item,
            score: entry.score
        }));
    }

    if (state.currentFilter.type === 'variants') {
        items = items.filter((car) => car.isVariant || car.isDuplicate);
    } else if (state.currentFilter.type === 'treasure-hunt') {
        items = items.filter((car) => car.isTreasureHunt);
    } else if (state.currentFilter.type === 'brand') {
        items = items.filter(
            (car) => getBrand(car.baseName) === state.currentFilter.value
        );
    }

    renderCarList(items, query);
}

function attachChipListeners() {
    const chips = DOM.brandChipsContainer.querySelectorAll('.chip');
    chips.forEach((chip) => {
        chip.addEventListener('click', () => {
            const filterType = chip.getAttribute('data-filter');
            const isActive = chip.classList.contains('active');

            chips.forEach((c) => c.classList.remove('active'));

            if (isActive && filterType !== 'all') {
                const allChip = DOM.brandChipsContainer.querySelector(
                    '[data-filter="all"]'
                );
                if (allChip) allChip.classList.add('active');
                state.currentFilter = {type: 'all', value: null};
            } else {
                chip.classList.add('active');
                if (filterType === 'all') {
                    state.currentFilter = {type: 'all', value: null};
                } else if (filterType === 'variants') {
                    state.currentFilter = {type: 'variants', value: null};
                } else if (filterType === 'treasure-hunt') {
                    state.currentFilter = {type: 'treasure-hunt', value: null};
                } else if (filterType === 'brand') {
                    state.currentFilter = {
                        type: 'brand',
                        value: chip.getAttribute('data-val')
                    };
                }
            }

            triggerSpeedLines();
            runSearch();
        });
    });
}

function initCopyDelegation() {
    DOM.resultsList.addEventListener('click', (e) => {
        const btn = e.target.closest('.copy-btn');
        if (!btn) return;

        const copyText = btn.getAttribute('data-copy');
        if (copyText) {
            navigator.clipboard.writeText(copyText).then(() => {
                btn.classList.add('copied');
                btn.innerHTML = ICONS.copied;
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = ICONS.copy;
                }, 1200);
            });
        }
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

    DOM.clearButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            DOM.searchInput.value = '';
            triggerSpeedLines();
            runSearch();
            DOM.searchInput.focus();
        });
    });
}

function initKeyboardNavigation() {
    window.addEventListener('keydown', (e) => {
        const activeEl = document.activeElement;
        const isInputFocused =
            activeEl &&
            (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
                activeEl.isContentEditable);
        const isSearchFocused = activeEl === DOM.searchInput;

        // 1. Focus search on '/' or 's' (if no text input is focused)
        if ((e.key === '/' || e.key.toLowerCase() === 's') && !isInputFocused) {
            e.preventDefault();
            DOM.searchInput.focus();
            triggerSpeedLines();
            return;
        }

        // 2. Clear search on Escape (when input is focused)
        if (e.key === 'Escape' && isSearchFocused) {
            DOM.searchInput.value = '';
            triggerSpeedLines();
            runSearch();
            DOM.searchInput.blur();
            return;
        }

        // 3. Navigation from search input to list
        if (isSearchFocused && e.key === 'ArrowDown') {
            const firstItem = DOM.resultsList.querySelector('li[tabindex="0"]');
            if (firstItem) {
                e.preventDefault();
                firstItem.focus();
            }
            return;
        }

        // 4. List item navigation & action shortcuts
        const focusedLi = activeEl ? activeEl.closest('li[data-id]') : null;
        if (focusedLi) {
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
            updateStatsDashboard(0, 0, '');
            return;
        }

        state.groupedCars = groupCastings(state.rawCars);
        state.fuse = new Fuse(state.groupedCars, {
            keys: ['baseName', 'searchString'],
            includeScore: true,
            threshold: 0.35,
            ignoreLocation: true,
            minMatchCharLength: 2,
            shouldSort: true
        });

        renderBrandChips();
        renderCarList(state.groupedCars, '');
        initCopyDelegation();
        initSearchEvents();
        initKeyboardNavigation();

        DOM.clearButtons.forEach((btn) => (btn.disabled = true));
        DOM.searchInput.focus();
    } catch (error) {
        renderEmpty('Could not load the collection file.');
        if (DOM.statsMsg) {
            DOM.statsMsg.textContent =
                'Please check that hot-wheels.md is available on this site.';
        }
        console.error(error);
    }
}

init();
