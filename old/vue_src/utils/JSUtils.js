/**
 * @file A collection of Javascript utility/helper functions.
 */
import $ from 'jquery';
import {
    defaultTo,
    each,
    flatMap,
    fromPairs,
    mapKeys,
    includes,
    isNaN,
    isNull,
    isPlainObject,
    isUndefined,
} from 'lodash';

/**
 * Attempt to run the given function. If any errors are thrown, check
 * if the error class is an instance of an error class in the given
 * errors object. If so, run that callback function. Otherwise, re-throw
 * the error.
 *
 * If no errors object is given, ignores any errors thrown by the func.
 *
 * @param {function} func - The function to attempt to run.
 * @param {?(object[]|object)} [errors=null] - An optional array of objects that
 *   list, in order, the errors to catch. If null, ignores any errors thrown
 *   (which is different from passing an empty array, which re-throws any errors
 *   thrown). Can also pass in a single object instead of an array with one
 *   element. Each object is of the form:
 *   {
 *       class: Error,
 *       callback: function,
 *   }
 *
 * @return {?*} The result of running the function, or null if an error was
 *   caught.
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
 * Empty the given array. Source: http://stackoverflow.com/a/1232046/4966649
 *
 * @param {Array} array
 */
export function empty(array) {
    array.splice(0, array.length);
}

/**
 * Map a function to each element in an array, getting rid of any undefined
 * values that are returned.
 *
 * @param {Array} array
 * @param {function} callback
 * @return {Array}
 */
export function mapSome(array, callback) {
    return flatMap(array, function(val, key) {
        return defaultTo(callback(val, key), []);
    });
}

/**
 * Move the element from the given index to the specified index. Ex.
 *
 * x = [1,2,3,4]
 * moveElem(x, 0, 2);
 * x // [2,3,1,4]
 *
 * @param {Array} array
 * @param {int} from - The index to remove the element from.
 * @param {int} to - The index to put the element.
 */
export function moveElem(array, from, to) {
    let elem = array.splice(from, 1)[0];
    array.splice(to, 0, elem);
}

/**
 * Call a constructor for a class with dynamic arguments. Source:
 * https://stackoverflow.com/a/8843181/4966649
 *
 * @param {class} Cls
 * @param {...*} any arguments to pass to the constructor.
 * @return {Cls}
 */
export function newCall(Cls) {
    return new (Function.prototype.bind.apply(Cls, arguments));
}

/**
 * Generate a unique 8-character hexadecimal ID.
 *
 * @return {String}
 */
export function uniqueId() {
    return Math.random().toString(16).substring(2, 10);
}

/**
 * Update the given object with the given data, returning an object mapping
 * any keys that have been changed to the old value.
 *
 * @param {Object} obj - The object to be updated.
 * @param {Object} data - The data to update the object with.
 * @return {Object}
 */
export function update(obj, data) {
    let changed = {};

    each(data, function(value, key) {
        let old = obj[key];
        if (old !== value) {
            changed[key] = old;
            obj[key] = parseNumber(value);
        }
    });

    return changed;
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
    if (args.length === 1 && !isNull(args[0])) {
        let kwargs = args[0];
        for (let key in kwargs) {
            if (!includes(labels, key)) {
                kwargs = null;
                break;
            }
        }
        if (kwargs) {
            return kwargs;
        }
    }

    return fromPairs(labels.map(
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
 * Run the given function asynchronously, using jQuery deferred objects.
 *
 * @param {function} callback
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
    return mapKeys(data, (val, key) => `_${key}`);
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
