import MeasurementReport from "./MeasurementReport";
import { utilities } from "dcmjs";
import CORNERSTONE_3D_TAG from "./cornerstone3DTag";
import CodingScheme from "./CodingScheme";

const { Point: TID300Point } = utilities.TID300;

const DICOM_SR_DISPLAY = "DICOMSRDisplay";
const trackingIdentifierTextValue = `${CORNERSTONE_3D_TAG}:${DICOM_SR_DISPLAY}`;

const { codeValues, CodingSchemeDesignator } = CodingScheme;

class DICOMSRDisplay {
    static getMeasurementData(
        MeasurementGroup,
        sopInstanceUIDToImageIdMap,
        imageToWorldCoords,
        metadata
    ) {
        const { defaultState, SCOORD3DGroup } =
            MeasurementReport.getSetupMeasurementData(
                MeasurementGroup,
                sopInstanceUIDToImageIdMap,
                metadata,
                DICOMSRDisplay.toolType
            );

        const randomImageId = Object.values(sopInstanceUIDToImageIdMap)[0];

        const text = defaultState.annotation.metadata.label;

        const { GraphicData } = SCOORD3DGroup;

        const worldCoords = [];
        for (let i = 0; i < GraphicData.length; i += 2) {
            const point = imageToWorldCoords(randomImageId, [
                GraphicData[i],
                GraphicData[i + 1]
            ]);
            worldCoords.push(point);
        }

        // Since the DICOMSRDisplay measurement is just a point, to generate the tool state
        // we derive the second point based on the image size relative to the first point.
        if (worldCoords.length === 1) {
            const imagePixelModule = metadata.get(
                "imagePixelModule",
                randomImageId
            );

            let xOffset = 10;
            let yOffset = 10;

            if (imagePixelModule) {
                const { columns, rows } = imagePixelModule;
                xOffset = columns / 10;
                yOffset = rows / 10;
            }

            const secondPoint = imageToWorldCoords(randomImageId, [
                GraphicData[0] + xOffset,
                GraphicData[1] + yOffset
            ]);

            worldCoords.push(secondPoint);
        }

        const state = defaultState;

        state.annotation.data = {
            text,
            handles: {
                arrowFirst: true,
                points: [worldCoords[0], worldCoords[1]],
                activeHandleIndex: 0,
                textBox: {
                    hasMoved: false
                }
            },
            frameNumber: undefined
        };

        return state;
    }

    static getTID300RepresentationArguments(tool, worldToImageCoords) {
        const { data, metadata } = tool;
        let { finding, findingSites } = tool;
        const { referencedImageId } = metadata;

        if (!referencedImageId) {
            throw new Error(
                "DICOMSRDisplay.getTID300RepresentationArguments: referencedImageId is not defined"
            );
        }

        const { points, arrowFirst } = data.handles;

        let point;

        if (arrowFirst) {
            point = points[0];
        } else {
            point = points[1];
        }

        const pointImage = worldToImageCoords(referencedImageId, point);

        const TID300RepresentationArguments = {
            points: [
                {
                    x: pointImage[0],
                    y: pointImage[1]
                }
            ],
            trackingIdentifierTextValue,
            findingSites: findingSites || []
        };

        // If freetext finding isn't present, add it from the tool text.
        if (!finding || finding.CodeValue !== codeValues.CORNERSTONEFREETEXT) {
            finding = {
                CodeValue: codeValues.CORNERSTONEFREETEXT,
                CodingSchemeDesignator,
                CodeMeaning: data.text
            };
        }

        TID300RepresentationArguments.finding = finding;

        return TID300RepresentationArguments;
    }
}

DICOMSRDisplay.toolType = DICOM_SR_DISPLAY;
DICOMSRDisplay.utilityToolType = DICOM_SR_DISPLAY;
DICOMSRDisplay.TID300Representation = TID300Point;
DICOMSRDisplay.isValidCornerstoneTrackingIdentifier = TrackingIdentifier => {
    if (!TrackingIdentifier.includes(":")) {
        return false;
    }

    const [cornerstone3DTag, toolType] = TrackingIdentifier.split(":");

    if (cornerstone3DTag !== CORNERSTONE_3D_TAG) {
        return false;
    }

    return toolType === DICOM_SR_DISPLAY;
};

MeasurementReport.registerTool(DICOMSRDisplay);

export default DICOMSRDisplay;
