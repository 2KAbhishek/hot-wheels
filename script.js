const CAR_LIST_PATH = './hot-wheels.md';
const TOP_BRANDS_COUNT = 50;

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

const searchInput = document.getElementById('search');
const clearButtons = document.querySelectorAll('.clear-search-btn');
const stats = document.getElementById('stats');
const results = document.getElementById('results');

let allCars = [];
let fuse = null;
let currentFilter = {type: 'all'};
let speedLinesTimer = null;

function escapeHtml(text) {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function parseCars(markdownText) {
    return markdownText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('- '))
        .map((line, index) => {
            const name = line.slice(2).trim();
            const isTreasureHunt =
                /\btreasure\s+hunt\b/i.test(name) || /\bth\b/i.test(name);
            return {
                id: index + 1,
                name,
                isTreasureHunt
            };
        })
        .filter((item) => item.name.length > 0);
}

function getBrand(carName) {
    // Strip leading year (2-4 digits, optionally preceded by apostrophe, followed by space)
    let name = carName.replace(/^['’]?\d{2,4}\s+/, '').trim();
    const lower = name.toLowerCase();

    const specialMatch = BRAND_MAPPING.special.find((item) => item.test(lower));
    if (specialMatch) return specialMatch.value;

    const firstWord = lower.split(/\s+/)[0];
    const mapped = BRAND_MAPPING.aliases[firstWord];
    if (mapped) return mapped;

    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
}

function analyzeDuplicatesAndVariants() {
    const nameCounts = {};
    allCars.forEach((car) => {
        nameCounts[car.name] = (nameCounts[car.name] || 0) + 1;
    });

    const getBaseName = (name) => {
        const idx = name.indexOf('(');
        if (idx === -1) return name.trim();
        return name.slice(0, idx).trim();
    };

    const baseCounts = {};
    allCars.forEach((car) => {
        const base = getBaseName(car.name);
        baseCounts[base] = (baseCounts[base] || 0) + 1;
    });

    allCars = allCars.map((car) => {
        const baseName = getBaseName(car.name);
        const exactCount = nameCounts[car.name];
        const baseCount = baseCounts[baseName];

        return {
            ...car,
            baseName,
            isDuplicate: exactCount > 1,
            isVariant: baseCount > 1 && exactCount < baseCount
        };
    });
}

function updateStats(visibleCount, totalCount, query) {
    const statTotalEl = document.getElementById('statTotal');
    if (statTotalEl) {
        statTotalEl.textContent = totalCount;
    }

    const statUniqueEl = document.getElementById('statUnique');
    if (statUniqueEl) {
        const uniqueCastings = new Set(allCars.map((c) => c.baseName)).size;
        statUniqueEl.textContent = uniqueCastings;
    }

    if (!totalCount) {
        stats.textContent = 'Empty collection.';
        return;
    }

    if (!query) {
        if (currentFilter.type === 'duplicates') {
            stats.textContent = `Showing all ${visibleCount} duplicates.`;
        } else if (currentFilter.type === 'variants') {
            stats.textContent = `Showing all ${visibleCount} variants.`;
        } else if (currentFilter.type === 'treasure-hunt') {
            stats.textContent = `Showing all ${visibleCount} Treasure Hunts.`;
        } else if (currentFilter.type === 'brand') {
            stats.textContent = `Showing all ${visibleCount} ${currentFilter.value}s.`;
        } else {
            stats.textContent = `Showing all ${totalCount} cars.`;
        }
        return;
    }

    stats.textContent = `${visibleCount} match${visibleCount === 1 ? '' : 'es'}.`;
}

function renderEmpty(message) {
    results.innerHTML = `<li class="empty">${escapeHtml(message)}</li>`;
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

function getWikiUrl(carName) {
    let wikiName = carName
        .replace(/\s*\([^)]*treasure\s+hunt[^)]*\)/gi, '')
        .trim();
    if (/^\d{2}\s/.test(wikiName)) {
        wikiName = "'" + wikiName;
    }
    return `https://hotwheels.fandom.com/wiki/${encodeURIComponent(wikiName.replace(/\s+/g, '_'))}`;
}

function createCarHtml(item, query) {
    const score =
        typeof item.score === 'number'
            ? Math.round((1 - item.score) * 100)
            : null;
    const scoreTag =
        score !== null ? `<span class="score">${score}% match</span>` : '';

    let badgesHtml = '';
    if (item.isTreasureHunt) {
        badgesHtml += `<span class="badge badge-th">TH</span>`;
    }
    if (item.isDuplicate) {
        badgesHtml += `<span class="badge badge-duplicate">Dup</span>`;
    }
    if (item.isVariant) {
        badgesHtml += `<span class="badge badge-variant">Variant</span>`;
    }

    const displayName = highlightQuery(item.name, query);
    const wikiUrl = getWikiUrl(item.name);

    return `
        <li data-id="${item.id}" tabindex="0">
            <div class="car-info">
                <div class="car-name-container">
                    <span class="car-name">${displayName}</span>
                </div>
                <div class="badges">${badgesHtml}</div>
            </div>
            ${scoreTag}
            <div class="car-actions">
                <button class="action-btn copy-btn" title="Copy name" aria-label="Copy name">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
                <a href="${wikiUrl}" target="_blank" rel="noopener noreferrer" class="action-btn wiki-btn" title="View Fandom Wiki Page" aria-label="View Wiki Page">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
            </div>
        </li>
    `;
}

function initCopyDelegation() {
    results.addEventListener('click', (e) => {
        const btn = e.target.closest('.copy-btn');
        if (!btn) return;

        const li = btn.closest('li');
        if (!li) return;

        const id = parseInt(li.getAttribute('data-id'), 10);
        const car = allCars.find((c) => c.id === id);
        if (car) {
            navigator.clipboard.writeText(car.name).then(() => {
                btn.classList.add('copied');
                btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                }, 1200);
            });
        }
    });
}

function renderCars(items, query = '') {
    if (!items.length) {
        renderEmpty('No matching car found. Try a different spelling.');
        updateStats(0, allCars.length, query);
        return;
    }

    results.innerHTML = items
        .map((item) => createCarHtml(item, query))
        .join('');
    updateStats(items.length, allCars.length, query);

    // Enable horizontal scroll/ticker animation on overflow after frame layout
    requestAnimationFrame(() => {
        results.querySelectorAll('.car-name').forEach((el) => {
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
                container.style.setProperty('--ticker-duration', `${duration}s`);
            }
        });
    });
}

function triggerSpeedLines() {
    document.documentElement.style.setProperty(
        '--speed-lines-duration',
        '1.8s'
    );
    if (speedLinesTimer) {
        clearTimeout(speedLinesTimer);
    }
    speedLinesTimer = setTimeout(() => {
        document.documentElement.style.setProperty(
            '--speed-lines-duration',
            '20s'
        );
    }, 800);
}

function runSearch() {
    const query = searchInput.value.trim();
    clearButtons.forEach((btn) => (btn.disabled = query.length === 0));

    // 1. Get search matches (or all cars if no query)
    let items = [];
    if (!query) {
        items = allCars;
    } else {
        items = fuse.search(query).map((entry) => ({
            ...entry.item,
            score: entry.score
        }));
    }

    // 2. Filter matches by active chip
    if (currentFilter.type === 'duplicates') {
        items = items.filter((car) => car.isDuplicate);
    } else if (currentFilter.type === 'variants') {
        items = items.filter((car) => car.isVariant);
    } else if (currentFilter.type === 'treasure-hunt') {
        items = items.filter((car) => car.isTreasureHunt);
    } else if (currentFilter.type === 'brand') {
        items = items.filter(
            (car) => getBrand(car.name) === currentFilter.value
        );
    }

    renderCars(items, query);
}

function getTopBrands() {
    const brandCounts = {};
    allCars.forEach((car) => {
        const brand = getBrand(car.name);
        brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    });

    // Derive recognized brands dynamically from our global mapping
    const knownBrands = new Set([
        ...Object.values(BRAND_MAPPING.aliases),
        ...BRAND_MAPPING.special.map((s) => s.value)
    ]);

    const sortedBrands = Object.entries(brandCounts)
        .filter(([brand]) => brand && brand.length > 0)
        .sort((a, b) => b[1] - a[1]);

    const topBrands = sortedBrands
        .filter(([brand]) => {
            return knownBrands.has(brand);
        })
        .slice(0, TOP_BRANDS_COUNT)
        .map(([brand]) => brand);

    return {
        topBrands,
        brandCounts
    };
}

function attachChipListeners(container) {
    const chips = container.querySelectorAll('.chip');
    chips.forEach((chip) => {
        chip.addEventListener('click', () => {
            const filterType = chip.getAttribute('data-filter');
            const isActive = chip.classList.contains('active');

            chips.forEach((c) => c.classList.remove('active'));

            if (isActive && filterType !== 'all') {
                const allChip = container.querySelector('[data-filter="all"]');
                if (allChip) allChip.classList.add('active');
                currentFilter = {type: 'all'};
            } else {
                chip.classList.add('active');
                if (filterType === 'all') {
                    currentFilter = {type: 'all'};
                } else if (filterType === 'duplicates') {
                    currentFilter = {type: 'duplicates'};
                } else if (filterType === 'variants') {
                    currentFilter = {type: 'variants'};
                } else if (filterType === 'treasure-hunt') {
                    currentFilter = {type: 'treasure-hunt'};
                } else if (filterType === 'brand') {
                    currentFilter = {
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

function renderBrandChips() {
    const container = document.getElementById('brandChips');
    if (!container) return;

    const {topBrands, brandCounts} = getTopBrands();
    const totalTreasureHunts = allCars.filter((c) => c.isTreasureHunt).length;
    const totalDuplicates = allCars.filter((c) => c.isDuplicate).length;
    const totalVariants = allCars.filter((c) => c.isVariant).length;

    let html = `<button class="chip active" data-filter="all">All</button>`;

    if (totalTreasureHunts > 0) {
        html += `<button class="chip" data-filter="treasure-hunt">Treasure Hunt (${totalTreasureHunts})</button>`;
    }
    if (totalDuplicates > 0) {
        html += `<button class="chip" data-filter="duplicates">Duplicates (${totalDuplicates})</button>`;
    }
    if (totalVariants > 0) {
        html += `<button class="chip" data-filter="variants">Variants (${totalVariants})</button>`;
    }

    topBrands.forEach((brand) => {
        html += `<button class="chip" data-filter="brand" data-val="${escapeHtml(brand)}">${escapeHtml(brand)} (${brandCounts[brand]})</button>`;
    });

    container.innerHTML = html;
    attachChipListeners(container);
}

function debounce(fn, delay) {
    let timerId = null;
    return (...args) => {
        window.clearTimeout(timerId);
        timerId = window.setTimeout(() => fn(...args), delay);
    };
}

async function init() {
    try {
        const response = await fetch(CAR_LIST_PATH);
        if (!response.ok) {
            throw new Error(`Failed to load ${CAR_LIST_PATH}`);
        }

        const markdown = await response.text();
        allCars = parseCars(markdown);

        if (!allCars.length) {
            renderEmpty('No car names detected in hot-wheels.md.');
            updateStats(0, 0, '');
            return;
        }

        analyzeDuplicatesAndVariants();
        fuse = new Fuse(allCars, {
            keys: ['name'],
            includeScore: true,
            threshold: 0.35,
            ignoreLocation: true,
            minMatchCharLength: 2,
            shouldSort: true
        });
        renderBrandChips();

        renderCars(allCars, '');
        initCopyDelegation();
        clearButtons.forEach((btn) => (btn.disabled = true));
        searchInput.focus();
    } catch (error) {
        renderEmpty('Could not load the collection file.');
        const statsEl = document.getElementById('stats');
        if (statsEl) {
            statsEl.textContent =
                'Please check that hot-wheels.md is available on this site.';
        }
        console.error(error);
    }
}

searchInput.addEventListener(
    'input',
    debounce((e) => {
        triggerSpeedLines();
        runSearch();
    }, 80)
);

clearButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        searchInput.value = '';
        triggerSpeedLines();
        runSearch();
        searchInput.focus();
    });
});

window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isInputFocused =
        activeEl &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
            activeEl.isContentEditable);
    const isSearchFocused = activeEl === searchInput;

    // 1. Focus search on '/' or 's' (if no text input is currently focused)
    if ((e.key === '/' || e.key.toLowerCase() === 's') && !isInputFocused) {
        e.preventDefault();
        searchInput.focus();
        triggerSpeedLines();
        return;
    }

    // 2. Clear search on Escape (when input is focused)
    if (e.key === 'Escape' && isSearchFocused) {
        searchInput.value = '';
        triggerSpeedLines();
        runSearch();
        searchInput.blur();
        return;
    }

    // 3. Navigation from search input to list
    if (isSearchFocused && e.key === 'ArrowDown') {
        const firstItem = results.querySelector('li[tabindex="0"]');
        if (firstItem) {
            e.preventDefault();
            firstItem.focus();
        }
        return;
    }

    // 4. Navigation inside list items
    const focusedLi = document.activeElement
        ? document.activeElement.closest('li[data-id]')
        : null;
    if (focusedLi) {
        const listItems = Array.from(
            results.querySelectorAll('li[tabindex="0"]')
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
                searchInput.focus();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            searchInput.focus();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const wikiLink = focusedLi.querySelector('.wiki-btn');
            if (wikiLink) {
                window.open(wikiLink.href, '_blank');
            }
        } else if (key === 'c') {
            e.preventDefault();
            const copyBtn = focusedLi.querySelector('.copy-btn');
            if (copyBtn) {
                copyBtn.click();
            }
        }
    }
});

init();
