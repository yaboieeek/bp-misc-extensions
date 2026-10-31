// ==UserScript==
// @name         $BP premium links opener
// @namespace    eeek
// @version      0.2.0
// @description  opens premium links on the effects page with amount/skip controls
// @author       eeek
// @match        https://backpack.tf/effect/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=backpack.tf
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const linkTail = (itemName, priceIndex) => `?item=${itemName}&quality=5&tradable=1&craftable=1&australium=-1&particle=${priceIndex}&killstreak_tier=0`;
    const IS_LIST_VIEW = !!document.querySelector('.unusuallist-view');

    const $TARGET = document.querySelector('.col-md-12');
    if (!$TARGET) return;

    const $CONTAINER = $('div');
    const $PANEL_FOR_BUTTONS = $('div');
    const $TITLE = $('div');
    const $BODY = $('div');

    $CONTAINER.className = 'col-md-12';
    $PANEL_FOR_BUTTONS.className = 'panel panel-main';
    $TITLE.className = 'panel-heading';
    $BODY.className = 'panel-body';
    $CONTAINER.append($PANEL_FOR_BUTTONS);
    $PANEL_FOR_BUTTONS.append($TITLE, $BODY);
    $TARGET.before($CONTAINER);

    $TITLE.innerHTML = '<span>Links opener</span>';
    $CONTAINER.style.cssText = 'margin-top: 19px; margin-bottom:9px';


    const $controls = $('div');
    $controls.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; align-items:center;';
    $controls.style.cssText = 'padding: 2rem 4rem; display: flex; gap:1rem; font-size: 16px';


    const $labelAmount = $('label');
    $labelAmount.textContent = 'Open: ';
    $labelAmount.style.cssText = 'margin:0; font-weight:normal;';
    const $INPUT_AMOUNT = $('input');
    $INPUT_AMOUNT.type = 'number';
    $INPUT_AMOUNT.min = '0';
    $INPUT_AMOUNT.placeholder = 'all';
    $INPUT_AMOUNT.style.cssText = 'width:90px; display:inline-block;';
    $labelAmount.append($INPUT_AMOUNT);

    const $labelSkip = $('label');
    $labelSkip.textContent = 'Skip: ';
    $labelSkip.style.cssText = 'margin:0; font-weight:normal;';
    const $INPUT_SKIP = $('input');
    $INPUT_SKIP.type = 'number';
    $INPUT_SKIP.min = '0';
    $INPUT_SKIP.placeholder = '0';
    $INPUT_SKIP.style.cssText = 'width:90px; display:inline-block;';
    $labelSkip.append($INPUT_SKIP);

    const $BUTTON_TO_OPEN_ALL = $('button');
    $BUTTON_TO_OPEN_ALL.type = 'button';
    $BUTTON_TO_OPEN_ALL.className = 'btn btn-primary';
    $BUTTON_TO_OPEN_ALL.textContent = 'Open links';


    const $STATUS = $('span');
    $STATUS.style.cssText = 'color:#888; font-size:12px;';

    const links = getPremiumLinks();
    $STATUS.textContent = `Found: ${links.length}`;
    $controls.append($labelAmount, $labelSkip, $BUTTON_TO_OPEN_ALL, $STATUS);
    $BODY.append($controls);

    function parseNonNegativeInt(value) {
        if (value === null || value === undefined) return null;
        const trimmed = String(value).trim();
        if (trimmed === '') return null;
        const n = Number(trimmed);
        if (!Number.isFinite(n) || n < 0) return null;
        return Math.floor(n);
    }

    function getPremiumLinks() {
        return IS_LIST_VIEW ? getPremiumLinksForList() : getPremiumLinksForGrid();
    }

    function getPremiumLinksForList() {
        const $statLinks = [...document.querySelectorAll('a[href*="stats/"]')];
        return $statLinks.map($l => {
            const link = $l.getAttribute('href') || '';
            const m = link.match(/Unusual\/(.+)\/Tradable/);
            if (!m) return null;
            const itemName = m[1];
            const priceIndex = link.split('/').at(-1);
            return `https://backpack.tf/premium/search${linkTail(itemName, priceIndex)}`;
        }).filter(Boolean);
    }

    function getPremiumLinksForGrid() {
        const $items = [...document.querySelectorAll('.item')];
        return $items.map($i => {
            const data = $i.dataset;
            if (!data.name || data.effect_id === undefined) return null;
            return `https://backpack.tf/premium/search${linkTail(data.name, data.effect_id)}`;
        }).filter(Boolean);
    }

    function openLinks() {
        const skip = parseNonNegativeInt($INPUT_SKIP.value) ?? 0;
        const amount = parseNonNegativeInt($INPUT_AMOUNT.value);



        const toOpen = amount === null
        ? links.slice(skip)
        : links.slice(skip, skip + amount);

        if (toOpen.length === 0) {
            $STATUS.textContent = 'Нет ссылок для открытия';
            return;
        }

        const prevText = $BUTTON_TO_OPEN_ALL.textContent;


        let i = 0;
        if (toOpen.length <= 10) {
            openWithTimer(i);
        } else {
            const result = confirm(`Confirm opening ${toOpen.length} links`);
            if (!result) {
                return
            } else {
                openWithTimer(i);
            }
        }

        async function openWithTimer(i) {
            $BUTTON_TO_OPEN_ALL.disabled = true;
            $BUTTON_TO_OPEN_ALL.textContent = `Opening ${toOpen.length}...`;
            const timer = setInterval(() => {
                if (i >= toOpen.length) {
                    clearInterval(timer);
                    $BUTTON_TO_OPEN_ALL.disabled = false;
                    $BUTTON_TO_OPEN_ALL.textContent = prevText;
                    $STATUS.textContent = `Opened: ${toOpen.length} of ${links.length}`;
                    return;
                }
                window.open(toOpen[i], '_blank');
                i++;
            }, 0.5 * 1000); //half a second so you dont spam
        }
    }

    $BUTTON_TO_OPEN_ALL.addEventListener('click', openLinks);

    function $(type) {
        return document.createElement(type);
    }
})();
