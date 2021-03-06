import DiagonalContinuity from "calchart/continuities/DiagonalContinuity";
import OrderedDotsContinuity from "calchart/continuities/OrderedDotsContinuity";
import Coordinate from "calchart/Coordinate";
import { FollowLeaderContinuityPopup } from "popups/ContinuityPopups";

import HTMLBuilder from "utils/HTMLBuilder";
import Iterator from "utils/Iterator";
import { setupTooltip } from "utils/UIUtils";

/**
 * A follow-the-leader continuity, where the sequence of dots is defined and
 * the path for the first dot is marked. Dots will move to each point using a
 * DMHS continuity.
 */
export default class FollowLeaderContinuity extends OrderedDotsContinuity {
    /**
     * @param {Sheet} sheet
     * @param {DotType} dotType
     * @param {Dot[]} order
     * @param {Coordinate[]} path - The coordinates for the path of the first dot.
     *   path[0] is the first coordinate to go to.
     * @param {object} [options] - Options for the continuity, including:
     *   - {string} stepType
     *   - {int} beatsPerStep
     */
    constructor(sheet, dotType, order, path, options) {
        super(sheet, dotType, order, options);

        this._path = path;
    }

    static deserialize(sheet, dotType, data) {
        let order = this.deserializeOrder(sheet, data);
        let path = data.path.map(coordData => Coordinate.deserialize(coordData));

        return new FollowLeaderContinuity(sheet, dotType, order, path, data);
    }

    serialize() {
        let path = this._path.map(coord => coord.serialize());

        return super.serialize({
            path: path,
        });
    }

    static get popupClass() {
        return FollowLeaderContinuityPopup;
    }

    get info() {
        return {
            type: "ftl",
            name: "Follow the Leader",
            label: "FTL",
        };
    }

    /**** METHODS ****/

    /**
     * Add the given point to the path at the given index.
     *
     * @param {int} index
     * @param {Coordinate} coordinate
     */
    addPoint(index, coordinate) {
        this._path.splice(index, 0, coordinate);
    }

    getContinuityText() {
        return "Follow the leader";
    }

    getMovements(dot, data) {
        let index = this.getOrderIndex(dot);
        let path = this._getPathIterator(index);

        path.next();
        let prev = path.get();
        let lastMove = null;
        let movements = [];
        let beats = 0;
        let maxDuration = this._getMaxDuration(data);

        while (beats < maxDuration && path.hasNext()) {
            // stop infinite loops #haltingproblemsolved
            if (path.hasCycled() && movements.length === 0) {
                return [];
            }

            path.next();
            let next = path.get();

            // DMHS to next position
            let movesToNext = DiagonalContinuity.getDiagonalMoves(prev.x, prev.y, next.x, next.y, {
                diagFirst: true,
                beatsPerStep: this.getBeatsPerStep(),
            });

            // update beats
            for (let i = 0; i < movesToNext.length; i++) {
                let move = movesToNext[0];
                let duration = move.getDuration();
                beats += duration;
                if (beats >= maxDuration) {
                    // truncate movement duration
                    move.setDuration(duration + maxDuration - beats);

                    // drop all further movements
                    movesToNext = _.take(movesToNext, i + 1);
                }
            }

            movements = movements.concat(movesToNext);

            // combine moves if in same direction
            if (lastMove && movesToNext.length > 0) {
                let currMove = movesToNext[0];
                let dir1 = lastMove.getDirection();
                let dir2 = currMove.getDirection();
                if (dir1 === dir2) {
                    let duration = lastMove.getDuration() + currMove.getDuration();
                    lastMove.setDuration(duration);
                    // remove currMove from movements
                    _.pull(movements, currMove);
                }
            }

            prev = next;
            lastMove = _.last(movements);
        }

        return movements;
    }

    getPanel(context) {
        let panel = super.getPanel(context);

        let editPath = HTMLBuilder.icon("crosshairs").click(e => {
            context.controller.loadContext("ftl-path", {
                continuity: this,
            });
        });
        setupTooltip(editPath, "Path");

        return _.concat(panel, editPath);
    }

    /**
     * @return {Coordinate[]}
     */
    getPath() {
        return this._path;
    }

    /**
     * Remove the point at the given index from the path.
     *
     * @param {int} index
     * @return {Coordinate} The point that was removed.
     */
    removePoint(index) {
        return this._path.splice(index, 1)[0];
    }

    /**
     * @param {Coordinate[]} path
     */
    setPath(path) {
        this._path = path;
    }

    /**
     * Set the point at the given index in the path to the given coordinate.
     *
     * @param {int} index
     * @param {Coordinate} coordinate
     */
    setPoint(index, coordinate) {
        this._path[index] = coordinate;
    }

    /**** HELPERS ****/

    /**
     * Get the path for the dot at the given index to follow. The first
     * element in the path should be the dot's initial position.
     *
     * @param {int} index - The index of the current dot in the order.
     * @return {Iterator<Coordinate>}
     */
    _getPathIterator(index) {
        let path = this._path;

        // add preceding dot positions as reference points
        for (let i = 0; i <= index; i++) {
            let dot = this._order[i];
            let position = this.sheet.getDotInfo(dot).position;
            path = [position].concat(path);
        }

        return new Iterator(path);
    }

    /**
     * Get the maximum number of beats this continuity's movements should
     * take.
     *
     * @param {Object} data - See getMovements
     * @return {int}
     */
    _getMaxDuration(data) {
        return data.remaining;
    }
}
