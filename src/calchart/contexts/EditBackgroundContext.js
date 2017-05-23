import HiddenContext from "calchart/contexts/HiddenContext";

import HTMLBuilder from "utils/HTMLBuilder";
import { getDimensions } from "utils/MathUtils";
import { addHandles, resizeHandles } from "utils/UIUtils";

/**
 * The Context that allows a user to move and resize the background image
 */
export default class EditBackgroundContext extends HiddenContext {
    constructor(controller) {
        super(controller);

        // tracks how many times load has been called, to distinguish
        // sessions of editing backgrounds
        this._session = 0;

        // contains the context that was active before editing background image
        this._previousContext = undefined;

        // contains the div that contains the handles
        this._handles = undefined;
    }

    static get actions() {
        return ContextActions;
    }

    static get info() {
        return {
            name: "background",
            toolbar: "edit-background",
        };
    }

    /**
     * @param {Object} options - Options to customize loading the Context:
     *    - {string} [dotType=null] - The dot type to initially load.
     */
    load(options) {
        super.load(options);

        this._session++;
        this._previousContext = options.previousContext;
        this._grapher.setOptions({
            backgroundVisible: true,
        });

        this._handles = HTMLBuilder.div("background-image-handles", null, ".workspace");
        addHandles(this._handles);

        this._addEvents(this._handles, "mousedown", e => {
            // for saveBackground
            let oldData = this._getImageData();

            let mousemove = $(e.target).is(".handle")
                ? this.mousedownResize(e)
                : this.mousedownMove(e);

            $(document).on({
                "mousemove.edit-background": mousemove,
                "mouseup.edit-background": e => {
                    this._controller.doAction("saveBackground", [oldData]);
                    $(document).off(".edit-background");
                }
            });
        });
    }

    unload() {
        super.unload();
        this._grapher.setOptions({
            backgroundVisible: false,
        });

        this._handles.remove();
    }

    refresh() {
        let image = this._getImage();
        let dimensions = image.getDimensions();

        this._handles.css({
            left: image.attr("x"),
            top: image.attr("y"),
            width: dimensions.width,
            height: dimensions.height,
        });
    }

    exit() {
        this._controller.loadContext(this._previousContext);
    }

    /**
     * Handle the mousedown event on the image, to move the image.
     *
     * @param {Event} e
     * @return {Function}
     */
    mousedownMove(e) {
        let image = this._getImage();
        let [deltaX, deltaY] = this._handles.makeRelative(e.pageX, e.pageY);

        return e => {
            let [endX, endY] = $(".workspace").makeRelative(e.pageX, e.pageY);
            let x = endX - deltaX;
            let y = endY - deltaY;

            this._handles.css({
                left: x,
                top: y,
            });
            image.attr("x", x).attr("y", y);
        };
    }

    /**
     * Handle the mousedown event on a handle, to resize the image.
     *
     * @param {Event} e
     * @return {Function}
     */
    mousedownResize(e) {
        let handle = $(e.target).data("handle-id");
        let image = this._getImage();
        let dimensions = image.getDimensions();

        let start = {
            top: parseInt(image.attr("y")),
            left: parseInt(image.attr("x")),
            width: dimensions.width,
            height: dimensions.height,
        };

        return e => {
            let data = resizeHandles(handle, start, e);
            image
                .attr("x", data.left)
                .attr("width", data.width)
                .attr("y", data.top)
                .attr("height", data.height);
            this._handles.css(data);
        };
    }

    /**
     * Revert all changes made to the background image.
     */
    revert() {
        this._controller.revertWhile(action => {
            return action.session === this._session;
        });
        this.exit();
    }

    /**
     * @return {jQuery} the background image
     */
    _getImage() {
        return this._grapher.getGraph().find("image.background-image");
    }

    /**
     * @return {Object} data of the background image to pass to
     *   Sheet.saveBackground
     */
    _getImageData() {
        let image = this._getImage();
        let dimensions = image[0].getBBox();
        let scale = this._grapher.getScale();
        let position = scale.toStepCoordinates({
            x: parseInt(image.attr("x")),
            y: parseInt(image.attr("y")),
        });
        return {
            x: position.x,
            y: position.y,
            width: scale.toSteps(dimensions.width),
            height: scale.toSteps(dimensions.height),
        };
    }
}

class ContextActions {
    /**
     * Save the background image's position and size after modifying it.
     *
     * @param {Object} oldData - The previous position/size of the image
     * @param {Object} [newData] - The position/size to save for the
     *   image. Defaults to the current position/size of the image.
     */
    static saveBackground(oldData, newData) {
        if (_.isUndefined(newData)) {
            newData = this._getImageData();
        }

        this._sheet.saveBackground(newData);
        this._controller.refresh();

        return {
            session: this._session,
            data: [oldData, newData],
            undo: function() {
                this._sheet.saveBackground(oldData);
                this._controller.refresh();
            },
        };
    }
}
