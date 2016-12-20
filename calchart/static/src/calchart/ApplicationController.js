/**
 * @fileOverview This file defines the ApplicationController, the abstract superclass
 * for application controllers: singleton instances that control an entire Calchart
 * application. Functions in this file are organized alphabetically in the following
 * sections:
 *
 * - Constructors (including initialization functions)
 * - Instance methods
 * - Helpers (prefixed with an underscore)
 */

var JSUtils = require("../utils/JSUtils");

/**** CONSTRUCTORS ****/

/**
 * The abstract superclass that stores the current state of a Calchart application and
 * contains all of the actions that can be run in the application. This class is
 * a singleton, meaning that only one instance of this class will ever be initialized.
 * To maintain this property, never use the constructor directly; instead, use
 * ApplicationController.init()
 *
 * @param {Show} show -- the show for the controller
 */
var ApplicationController = function(show) {
    this._show = show;
};

// The singleton instance of the ApplicationController
window.controller = null;

/**
 * Initialize an ApplicationController if one has not already been initialized.
 *
 * @param {Show} show -- the show for the controller
 */
ApplicationController.init = function(show) {
    if (!window.controller) {
        window.controller = new this(show);
        window.controller.init();
    }

    return window.controller;
};

/**
 * Use this class to subclass instead of JSUtils.extends in order to inherit
 * the ApplicationController.init function.
 */
ApplicationController.extend = function(ChildClass) {
    JSUtils.extends(ChildClass, this);
    $.extend(ChildClass, this);
};

/**** INSTANCE METHODS ****/

/**
 * Holds all keyboard shortcuts for the controller, mapping keyboard shortcut
 * to the name of the ApplicationController function. Separate keys with "+".
 * e.g. "ctrl+s" or "ctrl+shift+s". Meta keys need to be in this order:
 * ctrl (alias for cmd on Mac), alt, shift. Non-character keys can be mapped
 * as: top, left, down, right, enter, tab, backspace, delete.
 */
ApplicationController.prototype.shortcuts = {};

/**
 * Runs the method on this instance with the given name.
 *
 * @param {string} name -- the function to call
 */
ApplicationController.prototype.doAction = function(name) {
    var action = this._getAction(name);
    action.function.apply(this, action.args);
};

/**
 * Get the show stored in the controller
 *
 * @return {Show} the show stored in the controller
 */
ApplicationController.prototype.getShow = function() {
    return this._show;
};

/**
 * Initialize this controller
 */
ApplicationController.prototype.init = function() {
    var _this = this;

    // set up keyboard shortcuts
    $(window).keydown(function(e) {
        // convert keydown event into string
        var pressedKeys = [];

        if (e.metaKey || e.ctrlKey) {
            pressedKeys.push("ctrl");
        }
        if (e.altKey) {
            pressedKeys.push("alt");
        }
        if (e.shiftKey) {
            pressedKeys.push("shift");
        }

        // http://api.jquery.com/event.which/
        var code = e.which;

        switch (code) {
            case 8:
                pressedKeys.push("backspace"); break;
            case 9:
                pressedKeys.push("tab"); break;
            case 13:
                pressedKeys.push("enter"); break;
            case 37:
                pressedKeys.push("left"); break;
            case 38:
                pressedKeys.push("up"); break;
            case 39:
                pressedKeys.push("right"); break;
            case 40:
                pressedKeys.push("down"); break;
            case 46:
                pressedKeys.push("delete"); break;
            default:
                var character = String.fromCharCode(code).toLowerCase();
                pressedKeys.push(character);
        }

        var _function = _this._getShortcut(pressedKeys.join("+"));
        if (_function) {
            _this.doAction(_function);
            e.preventDefault();
        }
    });
};

/**** HELPERS ****/

/**
 * Parses the given function name according to menus.py
 *
 * @param {string} name -- the function name, optionally with arguments
 * @return {object} an object of the form
 *   {
 *       function: function,
 *       args: Array<string|float>,
 *   }
 */
ApplicationController.prototype._getAction = function(name) {
    var action = this._parseAction(name);

    var _function = this[action.name];
    if (_function === undefined) {
        throw new Error("No action with the name: " + action.name);
    }

    return {
        function: _function,
        args: action.args,
    };
};

/**
 * Get the shortcut function for the given shortcut key binding
 *
 * @param {string} shortcut -- the shortcut keys, e.g. "ctrl+z"
 * @return {function|undefined} the shortcut function, if there is one
 */
ApplicationController.prototype._getShortcut = function(shortcut) {
    return this.shortcuts[shortcut];
};

/**
 * Parses the given function name according to menus.py
 *
 * @param {string} name -- the function name, optionally with arguments
 * @return {object} an object of the form
 *   {
 *       name: string,
 *       args: Array<string|float>,
 *   }
 */
ApplicationController.prototype._parseAction = function(name) {
    var match = name.match(/(\w+)(\((.+)\))?/);

    if (match === null) {
        throw new Error("Action name in an invalid format: " + name);
    }

    var actionName = match[1];
    var actionArgs = [];

    if (match[2]) {
        // split args and try to parse numbers
        actionArgs = $.map(match[3].split(/,\s*/), function(arg) {
            return parseFloat(arg) || arg;
        });
    }

    return {
        name: actionName,
        args: actionArgs,
    };
};

/**
 * Sets up the given menu element.
 *
 * @param {jQuery|string} menu -- jQuery object or selector to setup
 */
ApplicationController.prototype._setupMenu = function(menu) {
    var _this = this;

    // set up activating menu
    $(menu).children("li")
        .click(function() {
            $(menu).children("li.active").removeClass("active");

            if ($(menu).hasClass("active")) {
                $(menu).removeClass("active");
                return;
            }

            $(menu).addClass("active");
            $(this).addClass("active");

            // clicking off the menu will close the menu
            $(window).click(function(e) {
                // TODO: except .has-submenu
                if (!$(e.target).closest(menu).exists()) {
                    $(menu).removeClass("active")
                        .children("li.active")
                        .removeClass("active");
                    $(this).off(e);
                }
            });
        })
        .mouseenter(function() {
            if ($(menu).hasClass("active")) {
                $(menu).children("li.active").removeClass("active");
                $(this).addClass("active");
            }
        });
        // TODO: functionality for hover over .has-submenu

    // set up click and add shortcuts to menu
    $(menu).find("li").each(function() {
        var _function = $(this).data("function");
        if (_function) {
            $(this).click(function() {
                _this.doAction(_function);
            });
        }
    });
};

/**
 * Sets up the given toolbar element
 *
 * @param {jQuery|string} toolbar -- jQuery object or toolbar to setup
 */
ApplicationController.prototype._setupToolbar = function(toolbar) {
    var _this = this;
    var tooltipTimeout = null;

    // set up click
    $(toolbar).find("li")
        .mousedown(function(e) {
            e.preventDefault();
            $(this).addClass("focus");
        })
        .mouseup(function() {
            $(this).removeClass("focus");
            var name = $(this).data("function");
            _this.doAction(name);
        })
        .hover(function() {
            // tooltip above item
            var offset = $(this).offset();
            var width = $(this).outerWidth();
            var name = $(this).data("name");

            tooltipTimeout = setTimeout(function() {
                var tooltip = $("<div>")
                    .addClass("tooltip")
                    .text(name)
                    .appendTo("body");

                var arrow = $("<span>")
                    .addClass("tooltip-arrow")
                    .appendTo(tooltip);

                var left = offset.left - tooltip.outerWidth() / 2 + width / 2;
                if (left < 0) {
                    left = 0;
                    arrow.css("left", offset.left + width / 2);
                }

                tooltip.css({
                    top: offset.top - tooltip.outerHeight() - arrow.outerHeight(),
                    left: left,
                });
            }, 750);
        }, function() {
            clearTimeout(tooltipTimeout);
            $(".tooltip").remove();
        });
};

module.exports = ApplicationController;
