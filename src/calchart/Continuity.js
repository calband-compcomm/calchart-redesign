import CounterMarchContinuity from "calchart/continuities/CounterMarchContinuity";
import DiagonalContinuity from "calchart/continuities/DiagonalContinuity";
import EvenContinuity from "calchart/continuities/EvenContinuity";
import FollowLeaderContinuity from "calchart/continuities/FollowLeaderContinuity";
import ForwardContinuity from "calchart/continuities/ForwardContinuity";
import FountainGridContinuity from "calchart/continuities/FountainGridContinuity";
import GateTurnContinuity from "calchart/continuities/GateTurnContinuity";
import GrapevineContinuity from "calchart/continuities/GrapevineContinuity";
import StopContinuity from "calchart/continuities/StopContinuity";
import TwoStepContinuity from "calchart/continuities/TwoStepContinuity";

/**
 * A proxy class for creating/deserializing all Continuity types, although
 * all Continuity types actually inherit from {@link BaseContinuity}. This
 * proxy class allows for ease of abstraction and prevents circular
 * dependencies.
 */
export default class Continuity {
    /**
     * Create a Continuity of the given type.
     *
     * @param {string} type - The type of Continuity to create (see partials/panel_edit_continuity.html).
     * @param {Sheet} sheet - The sheet the Continuity is for.
     * @param {DotType} dotType - The dot type the Continuity is for.
     * @return {Continuity}
     */
    static create(type, sheet, dotType) {
        let dots = sheet.getDotsOfType(dotType);
        let dotIds = dots.map(dot => dot.id);
        switch (type) {
            case "EWNS":
                return new FountainGridContinuity(sheet, dotType, true);
            case "NSEW":
                return new FountainGridContinuity(sheet, dotType, false);
            case "FM":
                return new ForwardContinuity(sheet, dotType, 0, 0);
            case "MT":
                return new StopContinuity(sheet, dotType, true, 0);
            case "MTRM":
                return new StopContinuity(sheet, dotType, true, null);
            case "CL":
                return new StopContinuity(sheet, dotType, false, null);
            case "EVEN":
                return new EvenContinuity(sheet, dotType);
            case "DMHS":
                return new DiagonalContinuity(sheet, dotType, true);
            case "HSDM":
                return new DiagonalContinuity(sheet, dotType, false);
            case "FTL":
                return new FollowLeaderContinuity(sheet, dotType, dotIds, []);
            case "CM":
                return new CounterMarchContinuity(sheet, dotType, null, dotIds);
            case "TWO":
                return new TwoStepContinuity(sheet, dotType, dotIds, []);
            case "GT":
                let reference = sheet.getDotInfo(dots[0]).position;
                return new GateTurnContinuity(sheet, dotType, 90, true, reference);
            case "GV":
                return new GrapevineContinuity(sheet, dotType, 0, 90);
        }
        throw new Error("No continuity of the type: " + type);
    }

    /**
     * Route the deserialization to the appropriate Continuity.
     *
     * @param {Sheet} sheet - The sheet the Continuity is for.
     * @param {DotType} dotType - The dot type the Continuity is for.
     * @param {Object} data - The JSON data to initialize the Continuity with.
     * @return {Continuity}
     */
    static deserialize(sheet, dotType, data) {
        switch (data.type) {
            case "FOUNTAIN":
                return FountainGridContinuity.deserialize(sheet, dotType, data);
            case "FORWARD":
                return ForwardContinuity.deserialize(sheet, dotType, data);
            case "STOP":
                return StopContinuity.deserialize(sheet, dotType, data);
            case "EVEN":
                return EvenContinuity.deserialize(sheet, dotType, data);
            case "DIAGONAL":
                return DiagonalContinuity.deserialize(sheet, dotType, data);
            case "FTL":
                return FollowLeaderContinuity.deserialize(sheet, dotType, data);
            case "CM":
                return CounterMarchContinuity.deserialize(sheet, dotType, data);
            case "TWO":
                return TwoStepContinuity.deserialize(sheet, dotType, data);
            case "GATE":
                return GateTurnContinuity.deserialize(sheet, dotType, data);
            case "GRAPEVINE":
                return GrapevineContinuity.deserialize(sheet, dotType, data);
        }
        throw new Error("No continuity of the type: " + data.type);
    }
}
