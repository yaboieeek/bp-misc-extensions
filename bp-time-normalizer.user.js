// ==UserScript==
// @name         $BP Time Normalizer
// @namespace    eeek
// @version      1.0.0
// @description  Reveals the full time on the page
// @author       eeek
// @match        https://backpack.tf/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=backpack.tf
// @grant        none
// @updateURL    https://github.com/yaboieeek/bp-misc-extensions/raw/refs/heads/main/bp-time-normalizer.user.js
// @downloadURL  https://github.com/yaboieeek/bp-misc-extensions/raw/refs/heads/main/bp-time-normalizer.user.js
// ==/UserScript==

const $times = [...document.querySelectorAll('time')];

const GLOBAL_DIFFERENCE_TRESHOLD = 90 * 1000 * 60 * 60 * 24 ; // 3 months

const convertTimeInUI = ($e) => {
    const timeagoSpan = highlightSuggestionOnDemand($e);
    const isoTime = $e.getAttribute('datetime');
    if ($e.closest('.data1')) return; //listings bumped date
    if (!isoTime) return;

    const utcTime = convertTimeToUTC(isoTime);
    const localeTime = convertTimeToLocale(isoTime);

    console.log(utcTime, localeTime)
    $e.innerHTML = `${utcTime} | ${timeagoSpan}`;
    $e.title = `For you it was: ${localeTime}`;
}

const convertTimeToUTC = (isoDate) => {
    const rawTimeString = new Date(isoDate).toUTCString();
    const timeString = rawTimeString.replace(/:\d{2} GMT/, ' GMT');
    return timeString
}

const convertTimeToLocale = (isoDate) => {
    return new Date(isoDate).toLocaleString();
}

const highlightSuggestionOnDemand = ($e) => {
    const timestamp = Date.parse($e.getAttribute('datetime'));
    const difference = Date.now() - timestamp;
    const isSugg = !!$e.closest('.submitter-info');
    const isInDate = difference < GLOBAL_DIFFERENCE_TRESHOLD;

    console.log(Date.now(), timestamp, difference, GLOBAL_DIFFERENCE_TRESHOLD)
    const $span = `<span style="font-weight: boldREP">(${$e.innerText})</span>`
    if (isInDate || !isSugg) return $span.replace('REP', '');

    return $span.replace('REP', '; color:red') + '<br>'
}

await new Promise((resolve) => setTimeout(() => resolve(), 50))
for (const $t of $times) {
    convertTimeInUI($t)
}
