import BasePopup from "popups/BasePopup";

import { NotImplementedError, ValidationError } from "utils/errors";
import HTMLBuilder from "utils/HTMLBuilder";
import { attempt } from "utils/JSUtils";
import { showError } from "utils/UIUtils";

/**
 * The base class for any popups that contain forms to be submitted.
 */
export default class FormPopup extends BasePopup {
    constructor() {
        super();

        // {Field[]}
        this._fields = null;
    }

    /**
     * Display this popup.
     */
    show() {
        super.show();

        // event listener to save popup
        this._popup.submit(e => {
            e.preventDefault();

            let data = attempt(() => {
                let data = {};

                this._fields.forEach(field => {
                    data[field.name] = field.clean();
                });

                return data;
            }, {
                class: ValidationError,
                callback: ex => {
                    showError(ex.message);
                },
            });

            if (_.isNull(data)) {
                return;
            }

            let result = this.onSave(data);

            // if onSave returned false explicitly don't hide the popup
            if (result !== false) {
                this.hide();
            }
        });

        // convert selects
        this._popup.find("select").dropdown();

        // auto focus on first input
        this._fields[0].getField().focus();
    }

    /**** METHODS ****/

    /**
     * @return {jQuery[]} The buttons in the popup.
     */
    getButtons() {
        return [
            HTMLBuilder.make("button.save", "Save"),
            HTMLBuilder.make("button.cancel", "Cancel").attr("type", "button"),
        ];
    }

    getContent() {
        this._fields = this.getFields();

        let form = HTMLBuilder.make("form");
        this._fields.forEach(field => {
            form.append(field.render());
        });

        HTMLBuilder.div("buttons", this.getButtons()).appendTo(form);

        return [form];
    }

    /**
     * @return {Field[]} The form fields in the popup.
     */
    getFields() {
        throw new NotImplementedError(this);
    }

    /**
     * Any actions to run when the Save button is clicked.
     *
     * @param {object} data - The data in the popup.
     * @return {(undefined|boolean)} Return an explicit false to prevent
     *   the popup from hiding.
     */
    onSave(data) {}
}
