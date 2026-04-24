const CAR_LIST_PATH = './hot-wheels.md';

const searchInput = document.getElementById('search');
const clearButton = document.getElementById('clearSearch');
const stats = document.getElementById('stats');
const results = document.getElementById('results');

let allCars = [];
let fuse = null;

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
        .map((line, index) => ({
            id: index + 1,
            name: line.slice(2).trim()
        }))
        .filter((item) => item.name.length > 0);
}

function updateStats(visibleCount, totalCount, query) {
    if (!totalCount) {
        stats.textContent = 'No cars found in hot-wheels.md.';
        return;
    }

    if (!query) {
        stats.textContent = `Showing all ${totalCount} cars.`;
        return;
    }

    stats.textContent = `${visibleCount} match${visibleCount === 1 ? '' : 'es'} for \"${query}\".`;
}

function renderEmpty(message) {
    results.innerHTML = `<li class="empty">${escapeHtml(message)}</li>`;
}

function renderCars(items, query = '') {
    if (!items.length) {
        renderEmpty('No matching car found. Try a different spelling.');
        updateStats(0, allCars.length, query);
        return;
    }

    const html = items
        .map((item) => {
            const score =
                typeof item.score === 'number'
                    ? Math.round((1 - item.score) * 100)
                    : null;
            const scoreTag =
                score !== null
                    ? `<span class="score">${score}% match</span>`
                    : '';
            return `<li><span>${escapeHtml(item.name)}</span>${scoreTag}</li>`;
        })
        .join('');

    results.innerHTML = html;
    updateStats(items.length, allCars.length, query);
}

function runSearch() {
    const query = searchInput.value.trim();
    clearButton.disabled = query.length === 0;

    if (!query) {
        renderCars(allCars, '');
        return;
    }

    const matches = fuse.search(query).map((entry) => ({
        ...entry.item,
        score: entry.score
    }));

    renderCars(matches, query);
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

        fuse = new Fuse(allCars, {
            keys: ['name'],
            includeScore: true,
            threshold: 0.35,
            ignoreLocation: true,
            minMatchCharLength: 2,
            shouldSort: true
        });

        renderCars(allCars, '');
        clearButton.disabled = true;
        searchInput.focus();
    } catch (error) {
        renderEmpty('Could not load the collection file.');
        stats.textContent =
            'Please check that hot-wheels.md is available on this site.';
        console.error(error);
    }
}

searchInput.addEventListener('input', debounce(runSearch, 80));
clearButton.addEventListener('click', () => {
    searchInput.value = '';
    runSearch();
    searchInput.focus();
});

init();
