/**
 * A song represents a collection of Sheets that comprise a Song. Songs can be used
 * to set defaults for continuities, such as west-facing songs.
 */
export default class Song {
    /**
     * @param {Show} show
     * @param {string} name - The name of the song
     * @param {(number[]|Sheet[])} sheets - The sheets contained in this song.
     * @param {Object} [options] - Optional information about the song, such as:
     *   - {string} fieldType - The field type, or "default" to use the same field
     *     type as the Show.
     *   - {(int|string)} beatsPerStep - The default number of beats per step for
     *       continuities in the Song, or "default" to get the number of beats per
     *       step from the Show.
     *   - {string} orientation - The default orientation for continuities in the
     *       Song, or "default" to get the orientation from the Show.
     *   - {string} stepType - The default step type for continuities in the Song,
     *       or "default" to get the step type from the Show.
     */
    constructor(show, name, sheets, options={}) {
        this._show = show;
        this._name = name;

        if (sheets.length > 0) {
            if (_.isNumber(sheets[0])) {
                sheets = sheets.map(i => this._show.getSheet(i));
            }
        }
        this._sheets = new Set(sheets);

        options = _.defaults({}, options, {
            fieldType: "default",
            beatsPerStep: "default",
            orientation: "default",
            stepType: "default",
        });

        this._fieldType = options.fieldType;
        this._beatsPerStep = options.beatsPerStep;
        this._orientation = options.orientation;
        this._stepType = options.stepType;
    }

    /**
     * Create a Song from the given serialized data
     *
     * @param {Show} show
     * @param {Object} data - The JSON data to initialize the Song with.
     * @return {Song}
     */
    static deserialize(show, data) {
        return new Song(show, data.name, data.sheets, data);
    }

    /**
     * Return the JSONified version of the Song.
     *
     * @return {Object}
     */
    serialize() {
        let data = {
            name: this._name,
            fieldType: this._fieldType,
            beatsPerStep: this._beatsPerStep,
            stepType: this._stepType,
            orientation: this._orientation,
        };

        data.sheets = [];
        this._sheets.forEach(sheet => {
            let index = sheet.getIndex();
            data.sheets.push(index);
        });

        return data;
    }

    /**
     * Add the given Sheet to the song.
     *
     * @param {Sheet} sheet
     */
    addSheet(sheet) {
        this._sheets.add(sheet);
    }

    /**
     * @return {string} The field type for the song, resolving any defaults.
     */
    getFieldType() {
        return this._fieldType === "default" ? this._show.getFieldType() : this._fieldType;
    }

    /**
     * @return {string}
     */
    getName() {
        return this._name;
    }

    /**
     * @return {int} The song's orientation, resolving any defaults.
     */
    getOrientationDegrees() {
        switch (this._orientation) {
            case "default":
                return this._show.getOrientationDegrees();
            case "east":
                return 0;
            case "west":
                return 180;
        }
        throw new Error(`Invalid orientation: ${this._orientation}`);
    }

    /**
     * @return {Sheet[]}
     */
    getSheets() {
        return this._sheets;
    }

    /**
     * @return {string} The song's step type, resolving any defaults. (@see CalchartUtils.STEP_TYPES)
     */
    getStepType() {
        return this._stepType === "default" ? this._show.getStepType() : this._stepType;
    }

    /**
     * Remove the given Sheet from the song.
     *
     * @param {Sheet} sheet
     */
    removeSheet(sheet) {
        this._sheets.remove(sheet);
    }
}
