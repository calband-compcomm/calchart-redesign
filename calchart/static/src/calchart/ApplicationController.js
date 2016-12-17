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
 * ctrl (alias for cmd on Mac), alt, shift.
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
 * Get the shortcut function for the given shortcut key binding
 *
 * @param {string} shortcut -- the shortcut keys, e.g. "ctrl+z"
 * @return {function|undefined} the shortcut function, if there is one
 */
ApplicationController.prototype.getShortcut = function(shortcut) {
    return this.shortcuts[shortcut];
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
        var character = String.fromCharCode(e.keyCode).toLowerCase();
        pressedKeys.push(character);

        var _function = _this.getShortcut(pressedKeys.join("+"));
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

    var action = this[actionName];
    if (action === undefined) {
        throw new Error("No action with the name: " + actionName);
    }

    return {
        function: action,
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

    // set up click
    $(toolbar).find("li").click(function() {
        var name = $(this).data("function");
        _this.doAction(name);
    });

    // TODO: set up help text
};

module.exports = ApplicationController;
