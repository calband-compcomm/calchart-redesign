import $ from 'jquery';
import {
    assign,
    cloneDeepWith,
    defaults,
    defaultTo,
    each,
    isNull,
    isString,
    isUndefined,
    last,
    map,
    pull,
    range,
} from 'lodash';

import { StepCoordinate } from 'calchart/Coordinate';
import Continuity from 'calchart/Continuity';
// import TwoStepContinuity from 'calchart/continuities/TwoStepContinuity';
import Dot from 'calchart/Dot';
import DotType from 'calchart/DotType';
import FieldType from 'calchart/FieldType';
import MovementCommand from 'calchart/MovementCommand';
import Orientation from 'calchart/Orientation';
import StepType from 'calchart/StepType';
import { AnimationStateError } from 'utils/errors';
import { mapSome, moveElem, runAsync, uniqueId } from 'utils/JSUtils';
// import { isEqual, roundSmall } from 'utils/MathUtils';

/**
 * A Sheet represents a stuntsheet, containing the following information:
 *  - the Show this sheet is a part of
 *  - the index of the Sheet in the Show
 *  - an optional label for the Sheet
 *  - the number of beats in the stuntsheet
 *  - the default number of beats per step for continuities in the Sheet
 *  - the default orientation for continuities in the Sheet
 *  - the default step type for continuities in the Sheet
 *  - each dot's information (see Sheet.getDotInfo)
 *  - each dot type's continuities
 */
export default class Sheet {
    /**
     * @param {Show} show - The Show this sheet is part of.
     * @param {String} id - The ID of the sheet.
     * @param {int} index - The index of this Sheet in the Show.
     * @param {int} numBeats - The number of beats in the stuntsheet.
     * @param {Object} [options] - Optional information about a stuntsheet,
     *   such as:
     *   - {string} label - A label for the Sheet.
     *   - {?string} song - The name of the song this sheet is a part of.
     *   - {string} [background] - The URL for the background image
     *   - {FieldType} [fieldType] - The default field type for continuities in
     *     the Sheet.
     *   - {?int} [beatsPerStep] - The default number of beats per step for
     *     continuities in the Sheet, or null to get the number of beats per
     *     step from the associated song/show.
     *   - {Orientation} [orientation] - The default orientation for
     *     continuities in the Sheet.
     *   - {StepType} [stepType] - The default step type for continuities in the
     *     Sheet.
     */
    constructor(show, id, index, numBeats, options) {
        this._show = show;
        this._id = id;
        this._index = index;
        this._numBeats = numBeats;

        options = defaults({}, options, {
            label: null,
            song: null,
            background: undefined,
            fieldType: FieldType.DEFAULT,
            beatsPerStep: null,
            orientation: Orientation.DEFAULT,
            stepType: StepType.DEFAULT,
        });

        this._label = options.label;
        this._background = options.background;
        this._fieldType = FieldType.fromValue(options.fieldType);
        this._beatsPerStep = options.beatsPerStep;
        this._orientation = Orientation.fromValue(options.orientation);
        this._stepType = StepType.fromValue(options.stepType);

        // {?string} the name of the song
        this._song = options.song;

        // @type {Object[]} see Sheet.getDotInfo
        this._dots = [];

        // @type {Object.<string, Continuity[]>}
        this._continuities = {};
    }

    /**
     * Create a stuntsheet from the given number of beats and the given
     * number of dots.
     *
     * @param {Show} show
     * @param {int} index
     * @param {int} numBeats
     * @param {int} numDots
     * @return {Sheet}
     */
    static create(show, index, numBeats, numDots) {
        let sheet = new Sheet(show, uniqueId(), index, numBeats);

        // initialize dots as plain dots
        sheet._dots = range(numDots).map(i => {
            return {
                type: DotType.PLAIN,
                position: new StepCoordinate(0, 0),
                movements: [],
                collisions: new Set(),
            };
        });

        sheet._continuities[DotType.ALL_BEFORE] = [];
        sheet._continuities[DotType.PLAIN] = [];
        sheet._continuities[DotType.ALL_AFTER] = [];

        return sheet;
    }

    /**
     * Create a Sheet from the given serialized data
     *
     * @param {Show} show
     * @param {Object} data - The JSON data to initialize the Sheet with.
     * @return {Sheet}
     */
    static deserialize(show, data) {
        let sheet = new Sheet(
            show,
            data.id,
            data.index,
            data.numBeats,
            data.options
        );

        sheet._dots = data.dots.map(dotData => {
            return {
                type: DotType.fromValue(dotData.type),
                position: StepCoordinate.deserialize(dotData.position),
                movements: dotData.movements.map(
                    movementData => MovementCommand.deserialize(movementData)
                ),
                collisions: new Set(dotData.collisions),
            };
        });

        each(data.continuities, function(continuitiesData, dotType) {
            sheet._continuities[dotType] = continuitiesData.map(
                data => Continuity.deserialize(sheet, dotType, data)
            );
        });

        return sheet;
    }

    /**
     * Return the JSONified version of the Sheet.
     *
     * @return {Object}
     */
    serialize() {
        let data = {
            numBeats: this._numBeats,
            id: this._id,
            index: this._index,
        };

        data.options = {
            label: this._label,
            song: this._song,
            background: this._background,
            fieldType: this._fieldType.value,
            beatsPerStep: this._beatsPerStep,
            orientation: this._orientation.value,
            stepType: this._stepType.value,
        };

        data.dots = this._dots.map(dotInfo => {
            return {
                type: dotInfo.type.value,
                position: dotInfo.position.serialize(),
                movements: dotInfo.movements.map(
                    movement => movement.serialize()
                ),
                collisions: Array.from(dotInfo.collisions),
            };
        });

        data.continuities = {};
        each(this._continuities, function(continuities, dotType) {
            data.continuities[dotType] = continuities.map(
                continuity => continuity.serialize()
            );
        });

        return data;
    }

    // getter methods to access raw properties instead of resolving defaults
    get beatsPerStep() { return this._beatsPerStep; }
    get fieldType() { return this._fieldType; }
    get label() { return this._label; }
    get orientation() { return this._orientation; }
    get stepType() { return this._stepType; }

    /**
     * Get the Sheet's ID.
     *
     * @return {String}
     */
    get id() {
        return this._id;
    }

    /**
     * Get the parent of this Sheet for resolving defaults.
     *
     * @return {(Song|Show)}
     */
    get parent() {
        return defaultTo(this.getSong(), this.show);
    }

    get show() {
        return this._show;
    }

    /**** METHODS ****/

    /**
     * Add the given continuity to the given dot type.
     *
     * @param {DotType} dotType
     * @param {Continuity} continuity
     */
    addContinuity(dotType, continuity) {
        this._continuities[dotType].push(continuity);
        this.updateMovements(dotType);
    }

    /**
     * Change the dot types of the given dots.
     *
     * @param {Dot[]} dots - The dots to change dot types.
     * @param {DotType} dotType - The dot type to change to.
     */
    changeDotTypes(dots, dotType) {
        dots.forEach(dot => {
            this._dots[dot.id].type = dotType;
        });

        if (isUndefined(this._continuities[dotType])) {
            this._continuities[dotType] = [];
        }

        this.updateMovements(dots);
    }

    /**
     * Clone this sheet. The new Sheet's data should be completely disassociated
     * from this sheet (a deep clone); e.g. changing the new Sheet's dot
     * positions should not update this Sheet's dot positions.
     *
     * @return {Sheet}
     */
    clone() {
        let allContinuities = [];

        let clone = cloneDeepWith(this, (val, key) => {
            switch (key) {
                // make sure to not clone foreign keys
                case '_show':
                case '_song':
                    return val;
                case '_continuities': {
                    let dotContinuities = {};
                    each(val, (continuities, dotType) => {
                        dotContinuities[dotType] = continuities.map(
                            continuity => {
                                let clone = cloneDeepWith(continuity,
                                    (val, key) => continuity.clone(key, val)
                                );

                                allContinuities.push(clone);
                                // if (clone instanceof TwoStepContinuity) {
                                //     let nested = clone.getContinuities();
                                //     allContinuities =
                                //         allContinuities.concat(nested);
                                // }

                                return clone;
                            }
                        );
                    });
                    return dotContinuities;
                }
            }
        });

        // manually set the sheet of all continuities
        allContinuities.forEach(continuity => {
            continuity.setSheet(clone);
        });

        return clone;
    }

    /**
     * @return {?Sheet} Either the sheet before or the sheet after this sheet
     *   in the show.
     */
    getAdjacentSheet() {
        return defaultTo(this.getPrevSheet(), this.getNextSheet());
    }

    /**
     * Return an AnimationState object that describes the given Dot's position,
     * orientation, etc. for the Sheet.
     *
     * @param {Dot} dot
     * @param {int} beatNum - The beat to get the state for.
     * @return {?AnimationState} An AnimationState that describes the given Dot
     *   at a moment of the show. If the Dot has no movements in this Sheet,
     *   return null. If the Dot has no position at the specified beat, throw an
     *   AnimationStateError.
     */
    getAnimationState(dot, beatNum) {
        let movements = this.getDotInfo(dot).movements;
        if (movements.length === 0) {
            return null;
        }

        let remaining = beatNum;

        for (let i = 0; i < movements.length; i++) {
            let movement = movements[i];
            let duration = movement.getDuration(); // eslint-disable-line

            // let beats = roundSmall(remaining - duration);
            // if (beats <= 0) {
            //     return movement.getAnimationState(remaining);
            // } else {
            //     remaining = beats;
            // }
        }

        throw new AnimationStateError(
            `Ran out of movements for ${dot.label}: ` +
            `${remaining} beats remaining`
        );
    }

    /**
     * @return {undefined|Object} the info for the background image, including:
     *   - {string} url
     *   - {number} width - The width of the image, in steps
     *   - {number} height - The height of the image, in steps
     *   - {number} x - The number of steps from the south endzone
     *   - {number} y - The number of steps from the west sideline
     */
    getBackground() {
        return this._background;
    }

    /**
     * Get the number of beats per step for this sheet, resolving any defaults.
     *
     * @return {int}
     */
    getBeatsPerStep() {
        return isNull(this._beatsPerStep) ?
            this.parent.getBeatsPerStep() :
            this._beatsPerStep;
    }

    /**
     * Get the dots that collide at the given beat.
     *
     * @param {int} beatNum
     * @return {Dot[]}
     */
    getCollisions(beatNum) {
        return mapSome(this._dots, (info, id) => {
            if (info.collisions.has(beatNum)) {
                return this.show.getDot(id);
            }
        });
    }

    /**
     * Get the continuities for the given dot type.
     *
     * @param {DotType} dotType
     * @return {Continuity[]}
     */
    getContinuities(dotType) {
        return defaultTo(this._continuities[dotType], []);
    }

    /**
     * Get the info for the given Dot for this stuntsheet.
     *
     * @param {Dot} dot - The dot to retrieve info for.
     * @return {Object} The dot's information for this stuntsheet, containing:
     *   - {DotType} type - The dot's type.
     *   - {StepCoordinate} position - The dot's starting position.
     *   - {MovementCommand[]} movements - The dot's movements in the sheet.
     *   - {Set.<int>} collisions - All beats where this dot collides with
     *     another dot.
     */
    getDotInfo(dot) {
        return this._dots[dot.id];
    }

    /**
     * Get all dots of the given dot type.
     *
     * @param {DotType} dotType
     * @return {Dot[]}
     */
    getDotsOfType(dotType) {
        if (DotType.isAll(dotType)) {
            return this.show.getDots();
        } else {
            return mapSome(this._dots, (info, i) => {
                if (info.type === dotType) {
                    return this.show.getDot(i);
                }
            });
        }
    }

    /**
     * Get the dot type of the given dot.
     *
     * @param {Dot} dot - The dot to get the dot type of.
     * @return {DotType}
     */
    getDotType(dot) {
        return this.getDotInfo(dot).type;
    }

    /**
     * @return {DotType[]} The dot types in this sheet, sorted by DotType.
     */
    getDotTypes() {
        let dotTypes = new Set(map(this._dots, 'type'));

        // always include continuities for ALL
        dotTypes.add(DotType.ALL_BEFORE);
        dotTypes.add(DotType.ALL_AFTER);

        return DotType.sort(dotTypes);
    }

    /**
     * @return {int} The number of beats in the Sheet.
     */
    getDuration() {
        return this._numBeats;
    }

    /**
     * @return {BaseFieldType} The field type for the stuntsheet, resolving any
     *   defaults.
     */
    getFieldType() {
        return this._fieldType === FieldType.DEFAULT ?
            this.parent.getFieldType() :
            this._fieldType;
    }

    /**
     * Get the position of the given dot at the end of the sheet.
     *
     * @param {Dot} dot
     * @return {StepCoordinate}
     */
    getFinalPosition(dot) {
        let dotInfo = this.getDotInfo(dot);
        if (dotInfo.movements.length === 0) {
            return dotInfo.position;
        } else {
            return last(dotInfo.movements).getEndPosition();
        }
    }

    /**
     * @return {int} The index of this sheet.
     */
    getIndex() {
        return this._index;
    }

    /**
     * @return {string} The label for this Sheet.
     */
    getLabel() {
        return defaultTo(this._label, String(this._index + 1));
    }

    /**
     * @return {?Sheet} The sheet after this sheet in the show, or null if this
     *   is the last sheet.
     */
    getNextSheet() {
        return this.show.getSheet(this._index + 1) || null;
    }

    /**
     * @return {int} The sheet's orientation in Calchart degrees, resolving any
     *   defaults.
     */
    getOrientationDegrees() {
        if (this._orientation === Orientation.DEFAULT) {
            return this.parent.getOrientationDegrees();
        } else {
            return this._orientation.angle;
        }
    }

    /**
     * Get the position of the dot at the beginning of the sheet.
     *
     * @param {Dot} dot
     * @return {StepCoordinate}
     */
    getPosition(dot) {
        return this.getDotInfo(dot).position;
    }

    /**
     * @return {?Sheet} The sheet before this sheet in the show, or null if
     *   this is the first sheet.
     */
    getPrevSheet() {
        return this.show.getSheet(this._index - 1) || null;
    }

    /**
     * @return {?Song}
     */
    getSong() {
        if (this._song) {
            return this.show.getSong(this._song);
        } else {
            return null;
        }
    }

    /**
     * @return {BaseStepType} The sheet's step type, resolving any defaults.
     */
    getStepType() {
        return this._stepType === StepType.DEFAULT ?
            this.parent.getStepType() :
            this._stepType;
    }

    /**
     * @return {boolean} true if this Sheet is the first sheet in the Show.
     */
    isFirstSheet() {
        return this._index === 0;
    }

    /**
     * @return {boolean} true if this Sheet is the last sheet in the Show.
     */
    isLastSheet() {
        return this._index === this.show.getSheets().length - 1;
    }

    /**
     * Move the continuity at the given index to the specified index.
     *
     * @param {DotType} dotType
     * @param {int} from
     * @param {int} to
     */
    moveContinuity(dotType, from, to) {
        let continuities = this._continuities[dotType];
        moveElem(continuities, from, to);
        this.updateMovements(dotType);
    }

    /**
     * Remove the background of the Sheet.
     */
    removeBackground() {
        this._background = undefined;
    }

    /**
     * Remove the given continuity from the given dot type.
     *
     * @param {DotType} dotType
     * @param {Continuity} continuity
     */
    removeContinuity(dotType, continuity) {
        let continuities = this._continuities[dotType];
        pull(continuities, continuity);
        this.updateMovements(dotType);
    }

    /**
     * Save the background with the given data.
     *
     * @param {Object} data - See getBackground
     */
    saveBackground(data) {
        assign(this._background, data);
    }

    /**
     * Set the background of the Sheet.
     *
     * @param {string} url
     */
    setBackground(url) {
        this._background = {
            url: url,
            width: undefined,
            height: undefined,
            x: 0,
            y: 0,
        };

        // set width and height
        $('<img>')
            .css({
                position: 'absolute',
                left: '-1000%',
                top: '-1000%',
            })
            .attr('src', url)
            .on('load', e => {
                // set to 20 yards wide
                let width = 32;
                let target = $(e.currentTarget);
                let ratio = target.height() / target.width();
                let height = width * ratio;

                this._background.width = width;
                this._background.height = height;

                $(e.currentTarget).remove();
            })
            .appendTo('body');
    }

    /**
     * Updates the index of the Sheet
     *
     * @param {int} index
     */
    setIndex(index) {
        this._index = index;
    }

    /**
     * Set the position of the given Dot.
     *
     * @param {Dot} dot
     * @param {int} x - The x-coordinate of the new position, in steps.
     * @param {int} y - The y-coordinate of the new position, in steps.
     */
    setPosition(dot, x, y) {
        this.getDotInfo(dot).position = new StepCoordinate(x, y);
    }

    /**
     * Set the song of this Sheet.
     *
     * @param {?Song} song - The song to set. Null if unset a song from the
     *   Sheet.
     */
    setSong(song) {
        this._song = song;
    }

    /**
     * Swap the positions of the two given dots.
     *
     * @param {Dot} dot1
     * @param {Dot} dot2
     */
    swapDots(dot1, dot2) {
        let info1 = this.getDotInfo(dot1);
        let info2 = this.getDotInfo(dot2);

        let temp = info1.position;
        info1.position = info2.position;
        info2.position = temp;
    }

    /**
     * Update the movements for the given dots.
     *
     * @param {(string|Dot|Dot[])} [dots] - The dots to update movements for, as
     *   either the dot type, the Dot, or a list of Dots. If undefined, updates
     *   all dots.
     */
    updateMovements(dots) {
        if (isString(dots)) {
            dots = this.getDotsOfType(dots);
        } else if (isUndefined(dots)) {
            dots = this.show.getDots();
        } else if (dots instanceof Dot) {
            dots = [dots];
        }

        let allBefore = this._continuities[DotType.ALL_BEFORE];
        let allAfter = this._continuities[DotType.ALL_AFTER];

        dots.forEach(dot => {
            let info = this.getDotInfo(dot);
            let continuities = this._continuities[info.type];

            // continuities for all dot types
            continuities = allBefore.concat(continuities).concat(allAfter);

            info.movements = Continuity.buildMovements(
                continuities, dot, info.position, this._numBeats
            );
        });

        // update collisions
        runAsync(() => {
            let allDots = this.show.getDots();
            this._dots.forEach(info => info.collisions.clear());

            for (let beat = 0; beat < this._numBeats; beat++) {
                for (let i = 0; i < allDots.length; i++) {
                    let dot1 = allDots[i];
                    let state1 = this.getAnimationState(dot1, beat);
                    if (isNull(state1)) {
                        continue;
                    }

                    for (let j = i + 1; j < allDots.length; j++) {
                        let dot2 = allDots[j];
                        let state2 = this.getAnimationState(dot2, beat);
                        if (isNull(state2)) {
                            continue;
                        }

                        // if (
                        //     isEqual(state1.x, state2.x) &&
                        //     isEqual(state1.y, state2.y)
                        // ) {
                        //     this.getDotInfo(dot1).collisions.add(beat);
                        //     this.getDotInfo(dot2).collisions.add(beat);
                        //     break;
                        // }
                    }
                }
            }
        });
    }
}
