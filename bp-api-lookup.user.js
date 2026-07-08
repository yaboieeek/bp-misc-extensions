// ==UserScript==
// @name         $BP Api Lookup
// @namespace    eeek
// @version      1.0.0
// @description  Adds api feature to the default searchbar
// @author       eeek
// @match        https://backpack.tf/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=backpack.tf
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://github.com/yaboieeek/bp-misc-extensions/raw/refs/heads/main/bp-api-lookup.user.js
// @downloadURL  https://github.com/yaboieeek/bp-misc-extensions/raw/refs/heads/main/bp-api-lookup.user.js
// ==/UserScript==

const SELECTORS = {
    NAVBAR: '.navbar-right', // before
    SEARCHBAR: '#navbar-search',
    FORM: '#navbar-search-container',
    DROPDOWN: '.dropdown-menu.site-search-dropdown'

}

const GLOBAL_CACHE = new Map();
// class TokensStorage {
//     constructor() {
//         this.tokens = GM_getValue('TOKENS', []);
//         this.index = 0;
//     }

//     getNext() {
//         const token = this.tokens[this.index];
//         this.index = (this.index + 1) % this.tokens.length;
//         return token
//     }
//     async addToken(token) {

//     }

//     async _validateToken(token) {

//     }
// }

class SearchDropdownUI {
    constructor() {
        this.$e = null;
        this.defaultHTML = null;
        this.observer = null;
        this._fromElement();
    }

    _fromElement() {
        this.$e = document.querySelector(SELECTORS.DROPDOWN);
        this.defaultHTML = this.$e.innerHTML;
    }

    updateInnerHTML(html) {
        this.stopBlockingRerender();

        this.$e.innerHTML = html;

        this.startBlockingRerender(html);
    }

    restoreDefault() {
        this.stopBlockingRerender();
        this.$e.innerHTML = this.defaultHTML;
    }

    startBlockingRerender(forcedHtml) {
        if (this.observer) return;

        this.observer = new MutationObserver(() => {
            this.observer.disconnect();
            this.$e.innerHTML = forcedHtml;
            this.observer.observe(this.$e, { childList: true, subtree: true, attributes: true });
        });

        this.observer.observe(this.$e, { childList: true, subtree: true, attributes: true });
    }

    stopBlockingRerender() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}


class Api {
    constructor(tokenStorage = null) {
        this.tokenStorage = tokenStorage;
        this.activeRequest = null;
        this._baseURL = 'https://backpack.tf/api';
    }

    async getItemListings(itemName) {
        try {
            const url = this.snapshotApiURL(itemName);
            const res = await fetch(url);
            if (res.status !== 200) throw `request failed with status ${res.status}`;
            if (res.message) throw `bptf returned '${res.message}'`;

            const json = await res.json();

            return json?.listings ?? [];
        } catch (e) {
            console.log(`[API_ERROR] Failed to get listings for ${itemName}: ${e}`);
            return [];
        }
    }

    snapshotApiURL(itemName) {
        const tail = `/classifieds/listings/snapshot?sku=${encodeURIComponent(itemName)}&appid=440`
        return this._baseURL + tail;
    }

    _getTokenPart() {
        if (!this.tokenStorage) return '';
        return `&token=${this.tokenStorage.getNext()}`;
    }

}

class ApiLookupUI {
    constructor(api) {
        this.api = api;
        this.switchState = 0; // 0 for bp default, 1 for api lookup
        this.$form = document.querySelector(SELECTORS.SEARCHBAR).closest('form');
        this.dropdownUI = new SearchDropdownUI();
        this.cache = GLOBAL_CACHE;
    }

    create() {
        this._createSearchSwitchButton();
        this._initFormInterceptor();
    }

    _initFormInterceptor() {
        if (!this.$form) return;

        this.$form.addEventListener('submit', (event) => this._routeSubmitBySwitchState(event));
        this._hookupInput(this.$form)
    }

    _createSearchSwitchButton() {
        const $t = document.querySelectorAll(SELECTORS.NAVBAR)[0];
        const $switch = COMPONENTS.switch();
        this._registerSwitchChangeListener($switch);
        $t.before($switch);
    }

    _registerSwitchChangeListener($switch) {
        $switch.addEventListener('change', () => this._onSwitchChange());
    }

    _onSwitchChange() {
        this._changeSwitchState();
        this._changeInputText(this.$form);
        this._updateDropdown();
    }

    _changeSwitchState() {
        this.switchState = !this.isOn ? 1 : 0;
        console.log(`State switched: ${this.switchState ? 'API' : 'DEFAULT'}`);
        return this.switchState;
    }

    async _routeSubmitBySwitchState(event) {
        this._fixFormAction(event.target);
        if (!this.isOn) return

        event.preventDefault();
        event.stopPropagation();


        const $input = event.target.querySelector('input[type="search"]') || event.target.querySelector('input');
        const value = $input ? $input.value : '';

        this._requestViaApi(value).then(res => this._addDropdownData(res, value));
    }

    async _requestViaApi(rawValue) {
        const value = rawValue.trim();
        if (this.cache.has(value)) return this.cache.get(value);

        const data = await this.api.getItemListings(value);
        this.cache.set(value, data);
        return data;
    }

    _addDropdownData(listings, name) {
        const sellListing = listings.find((l) => l.intent === 'sell') || null;
        const buyListing = listings.find((l) => l.intent === 'buy') || null;

        const $wrap = document.createElement('div');
        const $c = document.createElement('div');
        $c.style.cssText = `display: flex; width: 100%; height: 3rem; flex-direction: row; color: white; gap: 5px`;

        const $sellerAt = document.createElement('div');
        const $buyerAt = document.createElement('div');

        $sellerAt.className = 'api-price seller'
        $buyerAt.className = 'api-price buyer'


        $sellerAt.innerText = !sellListing ? 'N/A'
        : sellListing.currencies.usd ?
            `$${sellListing?.currencies?.usd?? 0}`
        : `${sellListing?.currencies?.keys?? 0} keys, ${sellListing?.currencies?.metal?? 0 } ref`;

        $buyerAt.innerText = !buyListing ? 'N/A'
        : buyListing.currencies.usd ?
            `$${buyListing?.currencies?.usd?? 0}`
        : `${buyListing?.currencies?.keys?? 0} keys, ${buyListing?.currencies?.metal?? 0 } ref`;

        $wrap.append($c);
        $c.append($sellerAt, $buyerAt);

        const item = {
            name,
            html: $wrap.innerHTML
        }

        const html = this._generateApiResponseFormat(item)
        this.dropdownUI.updateInnerHTML(html);
    }

    _fixFormAction($form) {
        !this.isOn ? $form.setAttribute('action', '/im_feeling_lucky') : $form.removeAttribute('action');
    }

    get isOn() {
        return !!this.switchState
    }

    _changeInputText($form) {
        const $input = $form.querySelector('input');
        $input.setAttribute('placeholder', !this.isOn ? 'Search' : 'Lookup via API')
    }

    _hookupInput($form) {
        const $i = $form.querySelector('input');
        const preventEmptyRestore = () => {
            if ( this.isOn && $i.value === '') {
                this.dropdownUI.updateInnerHTML(this._generateHintMessageForAPI());
            }
        }

        $i.addEventListener('input', (e) => {
            preventEmptyRestore();
            if (this.isOn) {
                e.preventDefault();
            }
        });
        $i.addEventListener('change', (e) => {
            preventEmptyRestore();
            if (this.isOn) {
                e.preventDefault();
            }
        })
    }

    _updateDropdown() {
        if (this.isOn) {
            console.log('The switch is in API mode');
            this.dropdownUI.updateInnerHTML(this._generateHintMessageForAPI())
            return;
        }

        this.dropdownUI.restoreDefault();
    }

    _generateHintMessageForAPI() {
        return `
            <li class="header">API Search mode</li>
            <li>
                <p class="hint-title">Item Listings</p>
                <p class="hint">Type the full correct form of item name to get it's listings</p>
            </li>
        `
    }

    _generateApiResponseFormat(item) {
        return `
        <li class="header">${item.name}</li>
        <li>
            ${item.html}
        </li>
        `
    }
}


const COMPONENTS = {
    switch: (fn = null, orientation = "vertical") => {
        const $e = document.createElement('input');
        $e.className = `${orientation}-switch`;
        $e.type = `checkbox`;

        $e.addEventListener('change', () => fn);
        return $e
    }
}

const STYLES =
      `
          input.vertical-switch[type="checkbox"] {
            -webkit-appearance: none;
            position: relative;
            background: #1b2329;
            width: 1.2rem;
            height: 3rem;
            border-radius: 2px;
            border: 1px solid #333;
            margin-left: 0.5rem;
            cursor: pointer;
          }

          input.vertical-switch[type="checkbox"]::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 1.5rem;
            background: #bbb;
            border-radius: 2px;
            left: 0;
            top: 0;
            transition: top 0.3s ease, background-color 0.3s ease;
          }

          input.vertical-switch[type="checkbox"]:checked::before {
            background: rgb(233.7391304348,129.0434782609,18.2608695652);
            top: 1.5rem;
          }

          .api-price {
              width: 50%;
              height: 3rem;
              color: white;
              border-radius: 2px;
              padding: 0.5rem 1rem;
              font-size: clamp(8px, 14px, 16px);
          }

          .api-price.seller {
              background-color: #628c2a;
          }
          .api-price.buyer {
              background-color: #54748b
          }
      `

GM_addStyle(STYLES);
await new Promise((resolve) => setTimeout(resolve, 50));
const api = new Api()
new ApiLookupUI(api).create();
