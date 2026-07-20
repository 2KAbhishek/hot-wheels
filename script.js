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

let rawCars = [];
let groupedCars = [];
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

function getColorStyle(tag) {
    const lower = tag.toLowerCase().trim();
    if (lower === 'mainline' || lower === 'base')
        return 'background: rgba(42,63,108,0.35); color: #b4c2e7; border: 1px solid rgba(42,63,108,0.6);';
    if (lower.includes('black'))
        return 'background: rgba(20,20,25,0.9); color: #f0f0f0; border: 1px solid #555;';
    if (lower.includes('red'))
        return 'background: rgba(220,38,38,0.25); color: #fca5a5; border: 1px solid rgba(220,38,38,0.5);';
    if (lower.includes('pink'))
        return 'background: rgba(236,72,153,0.25); color: #fbcfe8; border: 1px solid rgba(236,72,153,0.5);';
    if (lower.includes('green'))
        return 'background: rgba(22,163,74,0.25); color: #86efac; border: 1px solid rgba(22,163,74,0.5);';
    if (lower.includes('yellow'))
        return 'background: rgba(234,179,8,0.25); color: #fef08a; border: 1px solid rgba(234,179,8,0.5);';
    if (lower.includes('purple'))
        return 'background: rgba(147,51,234,0.25); color: #e9d5ff; border: 1px solid rgba(147,51,234,0.5);';
    if (lower.includes('blue'))
        return 'background: rgba(37,99,235,0.25); color: #bfdbfe; border: 1px solid rgba(37,99,235,0.5);';
    if (lower.includes('brown'))
        return 'background: rgba(120,53,15,0.3); color: #fed7aa; border: 1px solid rgba(180,83,9,0.5);';
    if (lower.includes('white'))
        return 'background: rgba(245,245,245,0.9); color: #111; border: 1px solid #ccc;';
    if (
        lower.includes('silver') ||
        lower.includes('grey') ||
        lower.includes('gray')
    )
        return 'background: rgba(156,163,175,0.3); color: #e5e7eb; border: 1px solid rgba(156,163,175,0.5);';
    if (lower.includes('maroon'))
        return 'background: rgba(136,19,55,0.3); color: #fecdd3; border: 1px solid rgba(190,18,60,0.5);';
    if (lower.includes('treasure hunt') || lower.includes('th'))
        return 'background: rgba(255,209,0,0.2); color: #ffd100; border: 1px solid rgba(255,209,0,0.5);';
    return 'background: rgba(147,51,234,0.2); color: #d8b4fe; border: 1px solid rgba(147,51,234,0.4);';
}

function processCarData(parsedCars) {
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
        if (item.isTreasureHunt) {
            group.hasTH = true;
        }

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
        const hasExactDuplicates = variants.some((v) => v.count > 1) || group.totalCount > 1;
        const hasMultipleVariants = nonThVariants.length > 1 || hasExactDuplicates;
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

function updateStats(visibleCount, totalCount, query) {
    const totalCars = rawCars.length;
    const statTotalEl = document.getElementById('statTotal');
    if (statTotalEl) {
        statTotalEl.textContent = totalCars;
    }

    const statUniqueEl = document.getElementById('statUnique');
    if (statUniqueEl) {
        statUniqueEl.textContent = groupedCars.length;
    }

    if (!totalCount) {
        stats.textContent = 'Empty collection.';
        return;
    }

    if (!query) {
        if (currentFilter.type === 'duplicates') {
            stats.textContent = `Showing ${visibleCount} castings with duplicates.`;
        } else if (currentFilter.type === 'variants') {
            stats.textContent = `Showing ${visibleCount} castings with variants & duplicates.`;
        } else if (currentFilter.type === 'treasure-hunt') {
            stats.textContent = `Showing ${visibleCount} Treasure Hunt castings.`;
        } else if (currentFilter.type === 'brand') {
            stats.textContent = `Showing ${visibleCount} ${currentFilter.value} castings.`;
        } else {
            stats.textContent = `Showing all ${totalCount} unique castings (${totalCars} total cars).`;
        }
        return;
    }

    stats.textContent = `${visibleCount} matching casting${visibleCount === 1 ? '' : 's'}.`;
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
        const dupLabel =
            item.exactDupCount > 0 ? `x${item.exactDupCount}` : 'x2';
        badgesHtml += `<span class="badge badge-duplicate">${dupLabel}</span>`;
    }

    let variantPillsHtml = '';
    if (item.showVariantPills && item.variants && item.variants.length > 0) {
        variantPillsHtml = item.variants
            .filter(
                (v) =>
                    v.tag !== null &&
                    !/\b(treasure hunt|th)\b/i.test(v.tag)
            )
            .map((v) => {
                const style = getColorStyle(v.tag);
                const countSuffix =
                    v.count > 1 ? ` <span class="v-count">x${v.count}</span>` : '';
                return `<span class="variant-pill" style="${style}">${escapeHtml(v.tag)}${countSuffix}</span>`;
            })
            .join('');
    }

    const displayName = highlightQuery(item.baseName, query);
    const wikiUrl = getWikiUrl(item.baseName);

    return `
        <li data-id="${item.id}" tabindex="0">
            <div class="car-info">
                <div class="car-name-container">
                    <span class="car-name">${displayName}</span>
                </div>
                ${variantPillsHtml ? `<div class="variant-pills">${variantPillsHtml}</div>` : ''}
                <div class="badges">${badgesHtml}</div>
            </div>
            ${scoreTag}
            <div class="car-actions">
                <button class="action-btn copy-btn" title="Copy name" aria-label="Copy name" data-copy="${escapeHtml(item.baseName)}">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
                <a href="${wikiUrl}" target="_blank" rel="noopener noreferrer" class="action-btn wiki-btn" title="View Fandom Wiki Page" aria-label="View Wiki Page">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
            </div>
        </li>
    `;
}

function initCopyDelegation() {
    results.addEventListener('click', (e) => {
        const btn = e.target.closest('.copy-btn');
        if (!btn) return;

        const copyText = btn.getAttribute('data-copy');
        if (copyText) {
            navigator.clipboard.writeText(copyText).then(() => {
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
        updateStats(0, groupedCars.length, query);
        return;
    }

    results.innerHTML = items
        .map((item) => createCarHtml(item, query))
        .join('');
    updateStats(items.length, groupedCars.length, query);

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

    // 1. Get search matches (or all grouped cars if no query)
    let items = [];
    if (!query) {
        items = groupedCars;
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
        items = items.filter((car) => car.isVariant || car.isDuplicate);
    } else if (currentFilter.type === 'treasure-hunt') {
        items = items.filter((car) => car.isTreasureHunt);
    } else if (currentFilter.type === 'brand') {
        items = items.filter(
            (car) => getBrand(car.baseName) === currentFilter.value
        );
    }

    renderCars(items, query);
}

function getTopBrands() {
    const brandCounts = {};
    groupedCars.forEach((car) => {
        const brand = getBrand(car.baseName);
        brandCounts[brand] = (brandCounts[brand] || 0) + car.totalCount;
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
    const totalTreasureHunts = groupedCars.filter((c) => c.isTreasureHunt).length;
    const totalVariants = groupedCars.filter((c) => c.isVariant).length;

    let html = `<button class="chip active" data-filter="all">All (${groupedCars.length})</button>`;

    if (totalTreasureHunts > 0) {
        html += `<button class="chip" data-filter="treasure-hunt">Treasure Hunt (${totalTreasureHunts})</button>`;
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
        rawCars = parseCars(markdown);

        if (!rawCars.length) {
            renderEmpty('No car names detected in hot-wheels.md.');
            updateStats(0, 0, '');
            return;
        }

        groupedCars = processCarData(rawCars);
        fuse = new Fuse(groupedCars, {
            keys: ['baseName', 'searchString'],
            includeScore: true,
            threshold: 0.35,
            ignoreLocation: true,
            minMatchCharLength: 2,
            shouldSort: true
        });
        renderBrandChips();

        renderCars(groupedCars, '');
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
