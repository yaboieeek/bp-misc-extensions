// ==UserScript==
// @name         $BP Deleted Comments Revealer
// @namespace    eeek
// @version      1.0
// @description  try to take over the world!
// @author       eeek
// @match        https://backpack.tf/suggestion/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=backpack.tf
// @grant        none
// ==/UserScript==

const DELETED_COMMENTS_C = [...document.querySelectorAll('.comment.deleted')];
const COMMENT_C = ($e) => $e.querySelector('div');

const revealDeletedComment = ($e) => {
    const $c = COMMENT_C($e);
    $c.style.cssText = 'display: block;';

    const $f = $e.querySelector('.footer');
    highlightDeleted($f)
}

const highlightDeleted = ($e) => {
    const highlightedDeletedHtml = '<span style="color:red">deleted</span>'
    $e.innerHTML = $e.innerHTML.replace('deleted', highlightedDeletedHtml);
}


DELETED_COMMENTS_C.forEach(revealDeletedComment)
