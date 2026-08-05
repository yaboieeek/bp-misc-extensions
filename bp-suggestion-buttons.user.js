// ==UserScript==
// @name         $BP Suggestion Buttons
// @namespace    eeek
// @version      1.0.0
// @description  adds more buttons to suggestion pages
// @author       eeek
// @match        https://backpack.tf/vote/Unusual/*
// @match        https://backpack.tf/suggestion/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=backpack.tf
// @grant        none
// @updateURL    https://github.com/yaboieeek/bp-misc-extensions/raw/refs/heads/main/bp-suggestion-buttons.user.js
// @downloadURL   https://github.com/yaboieeek/bp-misc-extensions/raw/refs/heads/main/bp-suggestion-buttons.user.js
// ==/UserScript==
const itemData = document.querySelector('.item').dataset;

class SuggestionPageUI {
    sites = [
        {
            baseLink: 'backpack.tf',
            siteName: 'Stats',
            textIcon: true
        },
        {
            baseLink: 'https://marketplace.tf/items/tf2/',
            siteName: 'Marketplace.tf',
            siteIcon: '/images/marketplace-medium.png?v=2'
        },
        {
            baseLink: 'https://stntrading.eu/item/tf2/Unusual+',
            siteName: 'STN.tf',
            siteIcon: 'https://stntrading.eu/assets/img/logos/icon.svg'
        },
        {
            baseLink: 'https://mannco.store/item/440-',
            siteName: 'Mannco.store',
            textIcon: true
        },
        {
            baseLink: 'https://gladiator.tf/sales?item=',
            siteName: 'Gladiator.tf',
            siteIcon: 'data:image/png;base64,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'
        },
        {
            baseLink: 'https://next.backpack.tf/classifieds/snapshots/',
            siteName: 'Next snapshots',
            textIcon: true
        }

    ];

    constructor() {
        this.itemData = itemData;
        this._makeButtonsAndAppend(this.sites, this.itemData);
    }

    _generateSiteButton(siteData, itemData) {
        const buttonHTML = `
        <div class="icon">
                </div>
                <div class="text">
                <div class="value" style = 'font-size: 10px; color: #54748b'>
                    View on
                </div>
                <div class="subtitle" style = 'font-size: 18px; color: #555 '>
                    ${siteData.siteName.replace('.store', '')}
                </div>
            </div>
        `
        const link = document.createElement('a');
        link.className = 'price-box';
        link.dataset.tip = 'top';
        link.title = siteData.siteName;
        link.href = this._generateSiteLink(siteData, itemData);
        link.target = '_blank';
        link.innerHTML = buttonHTML;
        let repres;

        if (siteData.textIcon) {
            repres = document.createElement('i');
            switch (siteData.siteName) {
                case 'Mannco.store': repres.className = 'fa fa-money'; break;
                case 'Stats': repres.className = 'stm stm-backpack-tf'; break;
                default: repres.className = 'fa fa-camera'; break;
            }
        } else {
            repres = document.createElement('img');
            repres.src = siteData.siteIcon;
            repres.alt = siteData.siteName;
            repres.style="border-radius: 5px;padding: 0;margin-top: -5px;";

        }

        link.querySelector('.icon').append(repres);
        return link;
    }

    _generateSiteLink({baseLink, siteName}, itemData) {
        let link = baseLink;
        switch(siteName) {
            case 'STN.tf': {
                link += itemData.effect_name.split(' ').join('+') + '+' + itemData.name.split(' ').join('+');
                break;
            }
            case 'Mannco.store': {
                link += itemData.effect_name.replace(/['!(|):]/g, '').split(' ').join('-') + `${itemData.quality_elevated ? '-strange' : ''}-unusual-` + itemData.name.replace(/['!(|):]/g, '').split(' ').join('-').replace(/--/g, '-').toLowerCase();
                break;
            }
            case 'Gladiator.tf': {
                link += itemData.effect_name + ' ' + itemData.name;
                break;
            }
            case 'Marketplace.tf' : { // defindex -> ; quality -> 5; effect with 'u' -> 'u'effect_id
                link+= `${itemData.defindex};5;u${itemData.effect_id}${itemData.quality_elevated ? ';strange' : ''}`;
                break;
            }

            case 'Stats': {
                link = window.location.href.replace('vote', 'stats');
                break
            }
             default: {
                 link += itemData.effect_name +' ' + itemData.name;
                 break;
             }
        }
        console.log(link);
        return link;
    }
    _makeButtonsAndAppend(sitesDataArray = [], itemData) {
        if (sitesDataArray === []) return;
        if (!itemData.effect_name) return;

        const buttons = sitesDataArray
        .filter(siteData => !(this.hasMpLink && siteData.siteName === 'Marketplace.tf'))
        .map(siteData => {
           return this._generateSiteButton(siteData, itemData);
        });

        const $c = document.createElement('div');
        $c.className = 'price-boxes';
        $c.style = `margin-top: 1rem; ${window.location.href.includes('suggestion') ? 'padding: 0 0 1rem 1rem' : ''}`;
        $c.append(...buttons);

        document.querySelector('.panel-body').append($c);
    }
}

if (itemData.quality == 5) {
    new SuggestionPageUI();
}
