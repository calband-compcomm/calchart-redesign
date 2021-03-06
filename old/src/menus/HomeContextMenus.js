/**
 * @file All the context menus in the home page.
 */

import ContextMenu from "menus/ContextMenu";

import { IS_STUNT } from "utils/env";

export class ShowMenu extends ContextMenu {
    /**
     * @param {HomeController} controller
     * @param {Event} e
     */
    constructor(controller, e) {
        super(controller, e);
        this._show = $(e.currentTarget);
        this._slug = this._show.data("slug");
    }

    getItems() {
        let items = [
            {
                label: "Open in viewer...",
                action: `openShow(viewer, ${this._slug})`,
            },
        ];

        let type = this._show.data("type");
        if (type === "owned" || IS_STUNT) {
            items = items.concat(this.getOwnedItems());
        }

        if (type === "band" && IS_STUNT) {
            items = items.concat(this.getBandItems());
        }

        return items;
    }

    /**
     * Context menu items to add if the show is owned by the
     * current user.
     */
    getOwnedItems() {
        return [
            {
                label: "Open in editor...",
                action: `openShow(editor, ${this._slug})`,
            },
        ];
    }

    /**
     * Context menu items to add if the current show is for the band
     * and the current user is on Stunt.
     */
    getBandItems() {
        let published = this._show.data("published");
        return [
            {
                label: published ? "Unpublish" : "Publish",
                action: `publishShow(${!published}, ${this._slug})`,
            },
        ];
    }

    show() {
        super.show();
        this._show.addClass("active");
    }

    close() {
        super.close();
        this._show.removeClass("active");
    }
}
