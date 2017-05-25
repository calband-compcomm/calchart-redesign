import HiddenContext from "calchart/contexts/HiddenContext";
import Coordinate from "calchart/Coordinate";

import HTMLBuilder from "utils/HTMLBuilder";
import { round } from "utils/MathUtils";

/**
 * The Context that allows a user to define the reference point
 * in a GateTurnContinuity
 */
export default class GateReferenceContext extends HiddenContext {
    constructor(controller) {
        super(controller);

        // GateTurnContinuity
        this._continuity = null;

        // helpers
        this._svg = null;
        this._helper = null;
        this._reference = null;
    }

    static get actions() {
        return ContextActions;
    }

    static get info() {
        return {
            name: "gate-reference",
        };
    }

    /**
     * @param {Object} options - Options to customize loading the Context:
     *    - {GateTurnContinuity} continuity - The gate turn continuity being edited
     */
    load(options) {
        super.load(options);

        this._svg = this._grapher.getSVG();
        this._continuity = options.continuity;

        let scale = this._grapher.getScale();
        let dotRadius = this._grapher.getDotRadius();

        this._helper = this._svg.append("circle")
            .classed("gate-reference-helper", true)
            .attr("r", dotRadius);
        this._reference = this._svg.append("circle")
            .classed("gate-reference-point", true)
            .attr("r", dotRadius);

        this._addEvents(".workspace", {
            mousemove: e => {
                let steps = this._eventToSnapSteps(e);
                let coord = scale.toDistanceCoordinates(steps);
                this._helper.attr("cx", coord.x).attr("cy", coord.y);
            },
            click: e => {
                let steps = this._eventToSnapSteps(e);
                this._controller.doAction("setReference", [steps]);
            },
        });
    }

    unload() {
        super.unload();

        // remove helpers
        this._helper.remove();
        this._reference.remove();

        this._controller.checkContinuities({
            dots: this._continuity.dotType,
        });
    }

    refresh() {
        super.refresh();

        // highlight dots
        let dots = $(`.dot.${this._continuity.dotType}`);
        this._controller.selectDots(dots);

        let scale = this._grapher.getScale();
        let point = scale.toDistanceCoordinates(this._continuity.reference);
        this._reference.attr("cx", point.x).attr("cy", point.y);
    }

    /**
     * Load continuity context if the user is done with this context.
     */
    exit() {
        this._controller.loadContext("continuity", {
            dotType: this._continuity.dotType,
        });
    }

    /**
     * Convert a MouseEvent into a coordinate for the current mouse position,
     * rounded to the nearest step.
     *
     * @param {Event} e
     * @return {Coordinate}
     */
    _eventToSnapSteps(e) {
        let [x, y] = $(".workspace").makeRelative(e.pageX, e.pageY);
        let steps = this._grapher.getScale().toStepCoordinates({x, y});
        return new Coordinate(round(steps.x, 1), round(steps.y, 1));
    }
}

class ContextActions {
    /**
     * Set the reference point to the given point
     *
     * @param {Coordinate} point
     * @param {GateTurnContinuity} [continuity=this._continuity]
     */
    static setReference(point, continuity=this._continuity) {
        let old = continuity.reference;
        continuity.setReference(point);
        continuity.sheet.updateMovements(continuity.dotType);
        this._controller.refresh("context");

        return {
            data: [point, continuity],
            undo: function() {
                continuity.setReference(old);
                continuity.sheet.updateMovements(continuity.dotType);
                this._controller.refresh("context");
            },
        };
    }
}
