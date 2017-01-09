import {ActionError} from "calchart/errors";

// The singleton instance of the ApplicationController
window.controller = null;

/**
 * The abstract superclass that stores the current state of a Calchart application and
 * contains all of the actions that can be run in the application. This class is
 * a singleton, meaning that only one instance of this class will ever be initialized.
 * To maintain this property, never use the constructor directly; instead, use
 * ApplicationController.init()
 */
export default class ApplicationController {
    /**
     * Never use this! Initialize via ApplicationController.init()
     *
     * @param {Show} show - The show for the controller.
     */
    constructor(show) {
        this._show = show;
    }

    /**
     * Initialize an ApplicationController if one has not already been initialized.
     *
     * @param {Show} show
     * @return {ApplicationController} The initialized controller.
     */
    static init(show) {
        if (!window.controller) {
            window.controller = new this(show);
            window.controller.init();
        }

        return window.controller;
    }

    /**
     * Class variable holding all keyboard shortcuts for the controller, mapping
     * keyboard shortcut to the name of the ApplicationController function. Separate
     * keys with "+", e.g. "ctrl+s" or "ctrl+shift+s". Meta keys need to be in this
     * order: ctrl (alias for cmd on Mac), alt, shift. Non-character keys can be mapped
     * as: top, left, down, right, enter, tab, backspace, delete.
     */
    get shortcuts() {
        return {};
    }

    /**
     * Runs the action with the given name, either a method on this instance or a
     * method in this class's actions. @see ApplicationController#_parseAction.
     *
     * @param {string} name - The function to call.
     * @param {Array} [args=[]] - Arguments to pass to the action. Can also be passed
     *   via name, which will override any arguments passed in as a parameter.
     */
    doAction(name, args=[]) {
        let action = this._getAction(name);
        args = action.args || args;
        action.function.apply(this, args);
    }

    /**
     * @return {Object.<string, string>} An object mapping shortcut action (e.g.
     *   "saveShow") to shortcut command (e.g. "ctrl+s").
     */
    getAllShortcutCommands() {
        let commands = {};
        $.each(this.shortcuts, (command, action) => {
            commands[action] = command;
        });
        return commands;
    }

    /**
     * Get the shortcut action for the given shortcut key binding.
     *
     * @param {string} shortcut - the shortcut keys; e.g. "ctrl+z".
     * @return {?string} The shortcut action, if there is one. This action
     *   should be passed to {@link ApplicationController#doAction}.
     */
    getShortcut(shortcut) {
        return this.shortcuts[shortcut] || null;
    }

    /**
     * @return {Show} The show stored in the controller.
     */
    getShow() {
        return this._show;
    }

    /**
     * Initialize this controller.
     */
    init() {
        let controller = this;

        // set up keyboard shortcuts
        $(window).keydown(e => {
            // ignore keypresses when typing into an input field
            if ($("input:focus").exists()) {
                return;
            }

            // convert keydown event into string
            let pressedKeys = [];

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
            let code = e.which;

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
                    let character = String.fromCharCode(code).toLowerCase();
                    pressedKeys.push(character);
            }

            let _function = controller.getShortcut(pressedKeys.join("+"));
            if (_function) {
                controller.doAction(_function);
                e.preventDefault();
            }
        });
    }

    /**
     * Get the action represented by the given parameter
     *
     * @param {string} name - The function name (@see {@link ApplicationController#_parseAction}).
     * @return {{function: function, args: ?Array}} An object containing data about an action to
     *   run in {@link ApplicationController#doAction}.
     */
    _getAction(name) {
        let data = this._parseAction(name);
        let action = this[data.name];

        if (typeof action === "function") {
            return {
                function: action,
                args: data.args,
            };
        } else {
            throw new ActionError("No action with the name: " + data.name);
        }
    };

    /**
     * Parse the given function name.
     *
     * @param {string} name - The function name, in one of the following formats:
     *   - "name": the name of the function, without arguments specified
     *   - "name(args, ...)": the name of the function, run with the given comma separated
     *     arguments. Arguments can be given in the following formats:
     *       - a number; e.g. "foo(1)" -> `foo(1)`
     *       - a string; e.g. "foo(bar)" -> `foo("bar")`
     *       - an object; e.g. "foo(x=1)" -> `foo({x: 1})`
     *       - an array; e.g. "foo(bar, [1,2])" -> `foo("bar", [1,2])`
     * @return {{name: string, args: ?Array}} An object containing data about the parsed action.
     */
    _parseAction(name) {
        let actionMatch = name.match(/^(\w+)(\((.+)\))?$/);

        if (actionMatch === null) {
            throw new Error("Action name in an invalid format: " + name);
        }

        let actionName = actionMatch[1];
        let actionArgs = null;

        if (actionMatch[2]) {
            actionArgs = [];

            // manually split arguments, to avoid complicated regexes
            let argsData = actionMatch[3];
            let buffer = "";
            for (let i = 0; i < argsData.length; i++) {
                let char = argsData[i];
                switch (char) {
                    case ",":
                        actionArgs.push(buffer);
                        buffer = "";
                        break;
                    case "[":
                        while (char !== "]") {
                            buffer += char;
                            i++;
                            char = argsData[i];
                        }
                        // don't break to add ending bracket
                    default:
                        buffer += char;
                }
            }
            actionArgs.push(buffer);

            // parse arguments
            actionArgs = $.map(actionArgs, arg => {
                arg = arg.trim();

                // float or array
                try {
                    return JSON.parse(arg);
                } catch (e) {}

                // object
                if (arg.indexOf("=") !== -1) {
                    let [key, val] = arg.split("=");
                    let floatVal = parseFloat(val);
                    return {
                        [key]: isNaN(floatVal) ? val : floatVal,
                    };
                }

                // string
                return arg;
            });
        }

        return {
            name: actionName,
            args: actionArgs,
        };
    };
}
