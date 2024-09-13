import { utilities } from '@cornerstonejs/core';
import type { PublicToolProps } from '../../types';
import type { AnnotationRenderContext } from '../../types';
import { PlanarFreehandContourSegmentationAnnotation } from '../../types/ToolSpecificAnnotationTypes';
import { triggerSegmentationDataModified } from '../../stateManagement/segmentation/triggerSegmentationEvents';
import PlanarFreehandROITool from './PlanarFreehandROITool';

class PlanarFreehandContourSegmentationTool extends PlanarFreehandROITool {
  static toolName;

  constructor(toolProps: PublicToolProps) {
    const initialProps = utilities.deepMerge(
      {
        configuration: {
          calculateStats: false,
          /**
           * Allow open contours false means to not allow a final/complete
           * annotation to be done as an open contour.  This does not mean
           * that the contour won't be open during creation.
           */
          allowOpenContours: false,
        },
      },
      toolProps
    );

    super(initialProps);
  }

  static getContourSequence(toolData, metadataProvider) {
    const { data } = toolData;
    const { polyline: points } = data.contour;

    function getPointData(points) {
      const flatPoints = points.flat();
      // reduce the precision of the points to 2 decimal places
      const pointsArrayWithPrecision = flatPoints.map((point) => {
        return point.toFixed(2);
      });
      return pointsArrayWithPrecision;
    }

    function getContourImageSequence(imageId, metadataProvider) {
      const sopCommon = metadataProvider.get('sopCommonModule', imageId);
      return {
        ReferencedSOPClassUID: sopCommon.sopClassUID,
        ReferencedSOPInstanceUID: sopCommon.sopInstanceUID,
      };
    }

    const ContourData = getPointData(points);
    const ContourImageSequence = getContourImageSequence(
      toolData.metadata.referencedImageId,
      metadataProvider
    );

    return [
      {
        NumberOfContourPoints: Math.floor(ContourData.length / 3),
        ContourImageSequence,
        ContourGeometricType: 'OPEN_PLANAR',
        ContourData,
      },
    ];
  }

  protected isContourSegmentationTool(): boolean {
    // Re-enable contour segmentation behavior disabled by PlanarFreehandROITool
    return true;
  }

  protected renderAnnotationInstance(
    renderContext: AnnotationRenderContext
  ): boolean {
    const annotation =
      renderContext.annotation as PlanarFreehandContourSegmentationAnnotation;
    const { invalidated } = annotation;

    // Render the annotation before triggering events
    const renderResult = super.renderAnnotationInstance(renderContext);

    if (invalidated) {
      const { segmentationId } = annotation.data.segmentation;

      // This event is trigged by ContourSegmentationBaseTool but PlanarFreehandROITool
      // is the only contour class that does not call `renderAnnotationInstace` from
      // its base class.
      triggerSegmentationDataModified(segmentationId);
    }

    return renderResult;
  }
}

PlanarFreehandContourSegmentationTool.toolName =
  'PlanarFreehandContourSegmentationTool';

export default PlanarFreehandContourSegmentationTool;
