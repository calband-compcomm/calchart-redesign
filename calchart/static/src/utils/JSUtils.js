/**
 * @file A collection of Javascript utility/helper functions.
 */

import * as _ from "lodash";

/**
 * true if the user is on a Mac, false otherwise.
 * https://css-tricks.com/snippets/javascript/test-mac-pc-javascript/
 * @const {boolean}
 */
export const IS_MAC = navigator.userAgent.includes("Mac OS X");

let shortcutMap, shortcutSep;
if (IS_MAC) {
    // HTML codes: http://apple.stackexchange.com/a/55729
    shortcutMap = {
        ctrl: "&#8984;",
        alt: "&#8997;",
        shift: "&#8679;",
        backspace: "&#9003;",
        tab: "&#8677;",
        enter: "&crarr;",
        left: "&larr;",
        up: "&uarr;",
        right: "&rarr;",
        down: "&darr;",
        delete: "&#8998;",
    };
    shortcutSep = "";
} else {
    shortcutMap = {
        ctrl: "Ctrl",
        alt: "Alt",
        shift: "Shift",
        backspace: "Backspace",
        tab: "Tab",
        enter: "Enter",
        left: "Left",
        up: "Up",
        right: "Right",
        down: "Down",
        delete: "Del",
    };
    shortcutSep = "+";
}

/**
 * Convert the given shortcut key binding to a human readable hint.
 *
 * @param {string} shortcut - The shortcut key binding, e.g. "ctrl+s".
 * @return {string} The human readable shortcut hint.
 */
export function convertShortcut(shortcut) {
    return shortcut.split("+").map(key => {
        return _.defaultTo(shortcutMap[key], key.toUpperCase());
    }).join(shortcutSep);
}

/**
 * Empty the given array. Source: http://stackoverflow.com/a/1232046/4966649
 *
 * @param {Array} array
 */
export function empty(array) {
    array.splice(0, array.length);
}

/**
 * Convert the given string from camel case into a capitalized string, e.g.
 * "someFunc" -> "Some Func". Source: http://stackoverflow.com/a/4149393/4966649
 *
 * @param {string} str
 * @return {string}
 */
export function fromCamelCase(str) {
    return str.replace(/([A-Z])/g, " $1").replace(/^./, first => first.toUpperCase());
}

/**
 * Parse the arguments passed to a function as either positional arguments
 * or as keyword arguments, passed as an object.
 *
 * @param {Array} args - The arguments passed to the original function, with
 *   either an object passed as the only argument (to be used as all the
 *   arguments), or the arguments in order as defined by labels.
 * @param {string[]} labels - The names of each argument, in order.
 * @return {Object} The arguments passed in, with the keys specified by
 *   labels and the values either undefined or the parsed argument.
 */
export function parseArgs(args, labels) {
    if (args.length === 1 && !_.isNull(args[0])) {
        let kwargs = args[0];
        for (let key in kwargs) {
            if (labels.indexOf(key) === -1) {
                kwargs = null;
                break;
            }
        }
        if (kwargs) {
            return kwargs;
        }
    }

    return _.fromPairs(labels.map(
        (label, i) => [label, args[i]]
    ));
}

/**
 * Parse the given value as a number if possible
 *
 * @param {string} value
 * @return {(string|number)}
 */
export function parseNumber(value) {
    let float = parseFloat(value);
    return isNaN(float) ? value : float;
}

/**
 * Validate that the given input is a positive value, setting the input
 * to 0 if negative
 *
 * @param {jQuery} input
 * @return {int}
 */
export function validatePositive(input) {
    let value = parseInt($(input).val());
    if (value < 0) {
        $(input).val(0);
        return 0;
    } else {
        return value;
    }
}
