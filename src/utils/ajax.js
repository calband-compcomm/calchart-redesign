import $ from 'jquery';
import { each, defaults } from 'lodash';

import { getStore } from 'store';

/**
 * The default callback for handling an error returned by the server.
 *
 * @param {jqXHR} xhr
 */
export function handleError(xhr) {
    console.error(xhr);

    let message;
    if (xhr.responseJSON) {
        message = xhr.responseJSON.message;
    } else {
        switch (xhr.status) {
            case 403:
                message = 'Invalid permissions. Please refresh the page.';
                break;
            default:
                message = 'An error occurred.';
        }
    }

    getStore().dispatch('messages/showError', message);
}

/**
 * Send a POST action to the server.
 *
 * @param {string} action
 * @param {Object} data
 * @param {Object} [options] - AJAX options to override defaults
 */
export default function sendAction(action, data, options) {
    // http://www.mattlunn.me.uk/blog/2012/05/sending-formdata-with-jquery-ajax/
    let formData = new FormData();
    formData.append('csrfmiddlewaretoken', getStore().state.env.csrfToken);
    formData.append('action', action);

    let nonFileData = {};
    each(data, (val, name) => {
        if (val instanceof File) {
            formData.append(name, val);
        } else {
            nonFileData[name] = val;
        }
    });

    formData.append('data', JSON.stringify(nonFileData));

    $.ajax(defaults(options, {
        url: '',
        method: 'POST',
        data: formData,
        dataType: 'json',
        cache: false,
        contentType: false,
        processData: false,
        error: handleError,
    }));
}
