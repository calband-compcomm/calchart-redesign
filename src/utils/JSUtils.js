/**
 * @file A collection of Javascript utility/helper functions.
 */

import $ from 'jquery';
import {
    defaultTo,
    each,
    flatMap,
    mapKeys,
    isNaN,
    isNull,
    isPlainObject,
    isUndefined,
} from 'lodash';

/**
 * Attempt to run the given function.
 *
 * If any errors are thrown, check if the error class is an instance of an error
 * class in the given `errors` object(s). If so, run that callback function.
 * Otherwise, re-throw the error.
 *
 * If no `errors` object(s) is given, ignores any errors thrown by the func. The
 * `errors` object(s) is of the form:
 *      { class: Error, callback: function(Error): void }
 *
 * @param {function(): A} func - The function to attempt to run.
 * @param {?(Object[]|Object)} [errors=null]
 *
 * @return {?A} The result of the function, or null if an error was caught.
 */
export function attempt(func, errors=null) {
    try {
        return func();
    } catch (ex) {
        if (!isNull(errors)) {
            let found = false;
            if (isPlainObject(errors)) {
                errors = [errors];
            }

            each(errors, error => {
                if (ex instanceof error.class) {
                    error.callback(ex);
                    found = true;
                    return false;
                }
            });

            if (!found) {
                throw ex;
            }
        }
        return null;
    }
}

/**
 * Empty the given array.
 *
 * Source: http://stackoverflow.com/a/1232046/4966649.
 *
 * @param {Array} array
 */
export function empty(array) {
    array.splice(0, array.length);
}

/**
 * Call the given function if the parameter is not null.
 *
 * @param {?A} param
 * @param {function(A): B} f
 * @param {?B}
 */
export function mapExist(param, f) {
    return isNull(param) ? null : f(param);
}

/**
 * Map a function to each element in an array, getting rid of any undefined
 * values that are returned.
 *
 * @param {A[]} array
 * @param {function(A): (undefined|B)} callback
 * @return {B[]}
 */
export function mapSome(array, callback) {
    return flatMap(array, function(val, key) {
        return defaultTo(callback(val, key), []);
    });
}

/**
 * Move the element from the given index to the specified index.
 *
 * The move is in place. For example:
 *
 * ```
 * x = [1,2,3,4]
 * moveElem(x, 0, 2);
 * x // [2,3,1,4]
 * ```
 *
 * @param {Array} array
 * @param {number} from
 * @param {number} to
 */
export function moveElem(array, from, to) {
    let elem = array.splice(from, 1)[0];
    array.splice(to, 0, elem);
}

/**
 * Generate a unique 8-character hexadecimal ID.
 *
 * @return {string}
 */
export function uniqueId() {
    return Math.random().toString(16).substring(2, 10);
}

/**
 * Parse the given value as a number if possible.
 *
 * @param {string} value
 * @return {?number}
 */
export function parseNumber(value) {
    let float = parseFloat(value);
    return isNaN(float) ? null : float;
}

/**
 * Run the given function asynchronously, using jQuery deferred objects.
 *
 * @param {function(): void} callback
 * @return {Promise}
 */
let queue; // the Deferred object that will be collecting asynchronous functions
export function runAsync(callback) {
    if (isUndefined(queue)) {
        queue = $.Deferred();
        queue.resolve(); // automatically triggers any subsequent callbacks
    }
    return queue.then(() => {
        setTimeout(callback, 1);
    }).promise();
}

/**
 * Prepend an underscore to the keys in the given data.
 *
 * @param {Object} data
 * @return {Object}
 */
export function underscoreKeys(data) {
    return mapKeys(data, (_, key) => `_${key}`);
}
