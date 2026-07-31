// ==UserScript==
// @name         !$BP Advanced Stat Page UI
// @namespace    eeek
// @version      1.0.0
// @description  holy shit eeek where have you been
// @author       eeek
// @match        https://backpack.tf/stats/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=backpack.tf
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://github.com/yaboieeek/bp-misc-extensions/raw/refs/heads/main/bp-advanced-stat-page-ui.user.js
// @downloadURL  https://github.com/yaboieeek/bp-misc-extensions/raw/refs/heads/main/bp-advanced-stat-page-ui.user.js
// ==/UserScript==



const BACKPACK_LISTINGS_URL = (itemQueryParams) => `https://backpack.tf/classifieds/_peek?item=${itemQueryParams}`;

const LISTING_SOURCE = {
    SITE: 'site',
    API: 'api'
};

const TYPE_ICON = {
    STRANGE: 'fa fa-tachometer',
    SPELL: 'fa fa-flask',
    BLOCKLIST: 'fa fa-ban'
}

const BUTTON_TYPES = {
    SPELL: 'SPELL',
    STRANGE: 'STRANGE',
    BLOCKLIST: 'BLOCKLIST'
}

const FILTER_TAGS = {
    STRANGE: 'quality_elevated',
    SPELL: 'spell_1'
}

const SELECTORS = {
    STAT_PAGE_TITLE: '.stats-header-title',
    EXPAND_LINK: '.btn.btn-circle-sm[title="Expand"]'
}


const ELEMENTS = {
    BUY_ORDERS_LIST: [...document.querySelectorAll('h4')].find($e => $e.innerText == 'Buy Orders').nextElementSibling

}
class Api {
    static async makeRequest(url, options) {
        try {
            const req = await fetch(url, {...options});
            if (!req.ok) throw `response is not ok! Status: ${req.status}`;
            return await req.json();
        } catch(e) {
            throw new Error(e);
        }
    }
}

class ListingsCache {
    constructor(timeToLiveInMs = 15 * 1000 * 60) {
        this.timeToLiveInMs = timeToLiveInMs;
        this.listingsCache = GM_getValue('SAVED_LISTINGS', {});
        this._removeOutdated();
    }

    addByQuery(query, data) {
        this.listingsCache[query] = {
            timestamp: Date.now(),
            data: data
        };
        this._updateCache();
    }

    getByQuery(query) {
        return this.listingsCache[query]
    }

    _removeOutdated() {
        for (const [key, value] of Object.entries(this.listingsCache)) {
            if (Lib.isOutdated(value.timestamp, this.timeToLiveInMs)) {
                delete this.listingsCache[key];
            }
        }
        this._updateCache();
    }

    _updateCache() {
        GM_setValue('SAVED_LISTINGS', this.listingsCache);
    }


}

class ListingsLoader {
    static async loadListings(itemQueryParams) {
        try {
            const listingsList = await Api.makeRequest(BACKPACK_LISTINGS_URL(itemQueryParams), {method: 'GET'});
            return listingsList.map(e => {
                const $e = Lib.htmlToElement(e);
                return {...$e.dataset, title: $e.title, elem: e};
            }).filter(e => e.listing_intent === 'buy')
        }catch(e) {
            console.error('[LISTINGS_LOADER] Error loading listings: ', e)
            return []
        }
    }
}

class GlobalItemInfo {
    static get fullName() {
        return document.querySelector(SELECTORS.STAT_PAGE_TITLE).innerText
    }

    static get queryParams() {
        return document.querySelector(SELECTORS.EXPAND_LINK).href.split('item=')[1]
    }

    static get isStrange() {
        return GlobalItemInfo.fullName.includes('Strange')
    }
}

class ListingsController {
    constructor(cacheController) {
        this.cacheController = cacheController;
        this.pageListings = [];
        this.apiListings = null;

        this.wholeListings = null;

        this.filters = GM_getValue('FILTERS', {
            strange: false,
            spell: true
        })


        this.autoload = true;


        this._savePageListings();
    }


    toggleFilterStatusByType(type) {
        this.filters[type.toLowerCase()] = !this.filters[type.toLowerCase()];
        this._saveFiltersToCache();
    }

    _saveFiltersToCache() {
        GM_setValue('FILTERS', this.filters);
    }

    async getApiListings() {

        const cachedData = this.cacheController.getByQuery(GlobalItemInfo.queryParams);
        let rawListingsFromApi;
        if (cachedData) {
            rawListingsFromApi = cachedData.data;
        } else {
            rawListingsFromApi = await ListingsLoader.loadListings(GlobalItemInfo.queryParams);
            this.cacheController.addByQuery(GlobalItemInfo.queryParams, rawListingsFromApi);
        }

        const listings = rawListingsFromApi.map($l => {
            return new Listing({
                key:   `${$l?.listing_account_id?? null}|${$l?.priceindex?? null}|${$l?.quality_elevated??null}`,
                element: this._createListingFromListingData($l),
                source: LISTING_SOURCE.API,
                dataset: $l
            })
        })

        this.apiListings = [...listings];
        return listings
    }

    getCombinedListingsElements() {
        return this.getCombinedListings().map(l => l.element);
    }

    getCombinedListings() {
        if (!this.apiListings) return this.pageListings;

        const keysSet = new Set(this.pageListings.map(l => l.key));

        const filteredApi = this.apiListings.filter(l => !keysSet.has(l.key));

        this.wholeListings = [...this.pageListings, ...filteredApi];

        return this.wholeListings;
    }

    _getPageListingsElements() {
        return this.pageListings.map(listing => listing.listing)
    }

    _savePageListings() {
        const $pageListings = [...document.querySelectorAll('h4')].find($e => $e.innerText == 'Buy Orders').nextElementSibling.querySelectorAll('.item');
        this.pageListings = [...$pageListings].map($l => {
            return new Listing({
                key: `${$l.dataset?.listing_account_id?? null}|${$l.dataset?.priceindex?? null}|${$l.dataset?.quality_elevated??null}`,
                element: $l.closest('li'),
                source: LISTING_SOURCE.SITE,
                dataset: $l.dataset
            })
        })

        this.wholeListings = [...this.pageListings];
    }

    _saveListingsInAllListings() {

    }

    _createListingFromListingData(listingData) {

        const steamID64 = (1n << 56n) | (1n << 52n) | (1n << 32n) | BigInt(listingData.listing_account_id);
        const dummyHTML = `
        <li class="listing">
    <div class="listing-item">
</div>
    <div class="listing-body">
        <div class="listing-header">
            <div class="listing-title">
                <i class="fa fa-arrow-left listing-intent-buy"></i>
                <h5>${listingData.title}</h5>
            </div>
            <div class="listing-buttons">
                    <a href="${listingData.listing_offers_url}" target="_blank" class="btn btn-bottom btn-xs
                    btn-success" title="Click to open a Trade Offer with this user. Please only offer the buyout." data-tip="top">
                            <i class="fa fa-sw fa-exchange"></i>
                        </a>
                                                </div>
        </div>
            <span class="text-muted">
                Listing by <span class="user-handle"><a class="user-link awesome1" data-offers-params="${encodeURIComponent('?' + listingData?.listing_offers_url?.split('/?'))?? ''}" data-online="0" data-name="${listingData.listing_name}" data-id="${listingData.id}" data-avatar="" data-target="#" href="/u/${steamID64}">${listingData.listing_name}</a></span>
            </span>

                    <div class="quote-box">
                <i class="fa fa-quote-left pull-left fa-large text-muted"></i>
                <p>${listingData.listing_comment}</p>
                <i class="fa fa-quote-right pull-right fa-large text-muted"></i>
            </div>
            </div>
            </li>
        `

        const $e = Lib.htmlToElement(dummyHTML);
        const $item = Lib.htmlToElement(listingData.elem);
        $e.querySelector('.listing-item').append($item);
        return $e;
    }
}


class Listing {
    constructor({key, element, source, dataset}) {
        this.key = key;
        this.element = element;
        this.source = source;
        this.dataset = dataset
    }

    hide() {
        this.element.style.display = 'none';
    }

    show() {
        this.element.style.display = ''
    }

}

class ListingControllerUI {
    constructor(listingController) {
        this.listingController = listingController;
        this.$buyersListingsContainer = ELEMENTS.BUY_ORDERS_LIST;
    }

    create() {
        this._renderControlPanel();
        this._renderWithCurrentFilters();
    }

    hideSpelledListings() {}


    async _loadApiListings() {

    }

    _renderBuyOrders($listings) {
        this.$buyersListingsContainer.innerHTML = '';
        this.$buyersListingsContainer.append(...$listings);
    }

    _renderCombinedBuyOrders() {
        const $listings = this.listingController.getCombinedListingsElements();
        this._renderBuyOrders($listings);
    }

    _renderControlPanel() {
        const $c = document.createElement('div');

        $c.style.cssText = `
            display: flex;
            flex-direction: row-reverse;
            gap: 0.5rem;
            margin-bottom: 1rem;
            width: 100%;
        `

        const [$load, $spell, $strange, /*$ban*/] = [
            this._renderLoadListingsButton(),
            this._renderSpellButton(),
            this._renderStrangeButton(),
            // this._renderBlocklistButton()
        ]

        $c.append(...[$load, ' ', $spell, ' ', $strange, ' ', /*$ban*/]);

        ELEMENTS.BUY_ORDERS_LIST.closest('.row').before($c)
    }

    _renderSpellButton() {
        return this._renderButtonOfType(BUTTON_TYPES.SPELL, () => console.log('Spells toggled'));
    }

    _renderStrangeButton() {
        return this._renderButtonOfType(BUTTON_TYPES.STRANGE, () => console.log('Stranges toggled'));
    }

    _renderBlocklistButton() {
        return this._renderButtonOfType(BUTTON_TYPES.BLOCKLIST, () => console.log('123'));
    }

    _renderButtonOfType(type, fn) {
        const $b = document.createElement('button');
        const $i = document.createElement('i');


        $b.append($i);

        $i.className = TYPE_ICON[type];
        const getIsHidden = () => {
            return {
                [BUTTON_TYPES.SPELL]: this.listingController.filters.spell,
                [BUTTON_TYPES.STRANGE]: this.listingController.filters.strange,
            }[type];
        }
        const isHidden = getIsHidden();


        const updateStyle = () => {
            const hidden = getIsHidden();
            $b.className = `btn btn-xs ${hidden ? 'btn-danger' : 'btn-success'}`;
        };


        const updateTitle = () => {
            const hidden = getIsHidden();
            $b.title = type + ` is ${hidden ? 'hidden' : 'visible'}`;
        };

        updateStyle();
        updateTitle();

        $b.addEventListener('click', () => {
            this.listingController.toggleFilterStatusByType(type)
            updateStyle();
            updateTitle();
            this._renderWithCurrentFilters();
        });

        return $b;
    }

    _renderLoadListingsButton() {
        const $b = document.createElement('button');
        $b.className = 'btn btn-xs btn-primary';
        $b.innerText = 'Load more listings';



        let loadPromise = null;
        let listings = null;

        const loadedListingTooltipSetup = () => {
            $b.title = 'Listings were loaded and cached successfully';
        }

        const successfullTooltipTrigger = () => {
            $b.title = 'Successfully loaded more listings';
            $($b).tooltip({trigger: 'manual'});

            $($b).tooltip('show');
            setTimeout(() =>  {
                $($b).tooltip('hide');
                $($b).tooltip('destroy')
            }, 2000);
            $b.style.cssText = `pointer-events: unset; cursor: help;`
            loadedListingTooltipSetup();
        }

        const failedTooltipTrigger = () => {
            $b.title = 'Failed to load more listings. Try again later.';
            $($b).tooltip({trigger: 'manual'});

            $($b).tooltip('show');
            setTimeout(() => $($b).tooltip('hide'), 2000);
        }




        $b.addEventListener('click', async () => {
            if (loadPromise && !listings) {
                console.log('The load is currently in progress...');
                return;
            }

            if (listings) {
                console.log('Listings are already loaded.');
                return;
            }

            try {
                $b.disabled = true;
                $b.classList.add('disabled');
                loadPromise = this.listingController.getApiListings();
                listings = await loadPromise;
                this._renderWithCurrentFilters();
                successfullTooltipTrigger();

            } catch(e) {
                console.error('Error loading listings: ', e);
                failedTooltipTrigger();
            } finally {
                $b.disabled = false;
                if (!listings) {
                    $b.classList.remove('disabled');
                    loadPromise = null;
                }
            }
        });

        this.listingController.autoload && $b.click();
        return $b;

    }

    _renderWithCurrentFilters() {
        const filters = Object.entries(this.listingController.filters)
        .map(([k, v]) => v === true ? FILTER_TAGS[k.toUpperCase()] : null)
        .filter(Boolean);


        const filteredListings = Filter.listingsByTags(this.listingController.getCombinedListings(), filters);
        const $filtered = filteredListings.map(e => e.element);

        this._renderBuyOrders($filtered)
    }

}

class Filter {
    static listingsByTags(listings, tagsArray) {
        const filteredListings = listings.filter((l) => {
            return !tagsArray.some((tag) => l.dataset[tag])
        });
        return filteredListings
    }
}


class Lib {
    static htmlToElement(html) {
        const parser = new DOMParser();
        return parser.parseFromString(html, 'text/html').body.firstElementChild
    }

    static isOutdated(timestamp, treshold) {
        const diff = Date.now() - timestamp;
        return diff > treshold
    }
}



const cache = new ListingsCache();
const controller = new ListingsController(cache);
new ListingControllerUI(controller).create();

