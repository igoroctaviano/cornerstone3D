import type { Types } from '@cornerstonejs/core';
import {
  RenderingEngine,
  Enums,
  setVolumesForViewports,
  volumeLoader,
  getRenderingEngine,
  cache,
  eventTarget,
} from '@cornerstonejs/core';
import {
  initDemo,
  createImageIdsAndCacheMetaData,
  setTitleAndDescription,
  addDropdownToToolbar,
  addSliderToToolbar,
} from '../../../../utils/demo/helpers';
import * as cornerstoneTools from '@cornerstonejs/tools';

const {
  ToolGroupManager,
  Enums: csToolsEnums,
  WindowLevelTool,
  PanTool,
  ZoomTool,
  StackScrollTool,
  LengthTool,
} = cornerstoneTools;

const { MouseBindings } = csToolsEnums;
const { ViewportType, Events } = Enums;

const renderingEngineId = 'myRenderingEngine';
const volumeLoaderScheme = 'cornerstoneStreamingImageVolume';
const volumeName = 'CT_VOLUME_ID';
const volumeId = `${volumeLoaderScheme}:${volumeName}`;

const viewportId = 'VOLUME_VIEWPORT';

// ======== Set up page ======== //
setTitleAndDescription(
  'Data Display Manager - 4D/Time Example',
  'Demonstrates time-based filtering for 4D volumes. This example shows how annotations can be filtered based on dimension groups (time points).\n\n' +
    'Note: This example uses a regular volume to demonstrate the concept. In a real 4D scenario, annotations would have dimensionGroupNumber metadata, ' +
    'and the time filter would show only annotations matching the current dimension group.'
);

const size = '600px';
const content = document.getElementById('content');
const element = document.createElement('div');
element.oncontextmenu = () => false;

element.style.width = size;
element.style.height = size;

content.appendChild(element);

const instructions = document.createElement('p');
instructions.innerText =
  'This example demonstrates time-based filtering:\n' +
  '- Use the dropdown to select a DataDisplayManager mode\n' +
  '- The "time" filter provider filters annotations based on dimension group (time point)\n' +
  '- For 4D volumes, annotations with dimensionGroupNumber metadata will only show at matching time points\n' +
  '- Left click to draw length measurements';
instructions.style.marginTop = '10px';
instructions.style.whiteSpace = 'pre-line';
content.appendChild(instructions);
// ============================= //

// DataDisplayManager demo controls
const annotationDisplayManagerValues = [
  'default',
  'displaySet',
  'frameOfReference',
  'referenceViewable',
] as const;

let annotationDisplayManagerName:
  | (typeof annotationDisplayManagerValues)[number] = 'default';

let renderingEngine: RenderingEngine;
let currentDimensionGroup = 1;

/**
 * Creates mock annotations with dimensionGroupNumber metadata
 * In a real scenario, these would be created by tools and stored with the dimension group info
 */
function createMockAnnotationsWithTimePoints(): void {
  // Note: In a real implementation, you would use:
  // const annotationManager = cornerstoneTools.annotation.state.getAnnotationManager();
  // annotationManager.addAnnotation(annotation);
  // For this demo, we're just showing the concept - annotations would be created by tools
  
  // Example annotation structure for different "time points" (dimension groups)
  // In a real 4D scenario, these would be created at different time points
  const exampleAnnotations = [
    {
      annotationUID: 'time-1-annotation-1',
      metadata: {
        referencedImageId: volumeId,
        dimensionGroupNumber: 1, // Time point 1
        toolName: 'Length',
      },
      data: {
        handles: {
          points: [
            [100, 100, 50],
            [200, 200, 50],
          ],
        },
        label: 'Time Point 1',
      },
      highlighted: false,
      invalidated: false,
      isVisible: true,
    },
    {
      annotationUID: 'time-2-annotation-1',
      metadata: {
        referencedImageId: volumeId,
        dimensionGroupNumber: 2, // Time point 2
        toolName: 'Length',
      },
      data: {
        handles: {
          points: [
            [150, 150, 50],
            [250, 250, 50],
          ],
        },
        label: 'Time Point 2',
      },
      highlighted: false,
      invalidated: false,
      isVisible: true,
    },
    {
      annotationUID: 'time-3-annotation-1',
      metadata: {
        referencedImageId: volumeId,
        dimensionGroupNumber: 3, // Time point 3
        toolName: 'Length',
      },
      data: {
        handles: {
          points: [
            [200, 200, 50],
            [300, 300, 50],
          ],
        },
        label: 'Time Point 3',
      },
      highlighted: false,
      invalidated: false,
      isVisible: true,
    },
  ];

  // Note: In a real implementation, you would use:
  // const annotationManager = cornerstoneTools.annotation.state.getAnnotationManager();
  // exampleAnnotations.forEach(ann => annotationManager.addAnnotation(ann));
  // For this demo, we're just showing the concept
  console.log('Example annotation structure for time points 1, 2, and 3:');
  console.log(exampleAnnotations);
  console.log('In a real 4D scenario, the time filter would show only annotations matching the current dimension group');
}

/**
 * Runs the demo
 */
async function run() {
  await initDemo();

  // Add tools
  cornerstoneTools.addTool(LengthTool);
  cornerstoneTools.addTool(WindowLevelTool);
  cornerstoneTools.addTool(PanTool);
  cornerstoneTools.addTool(ZoomTool);
  cornerstoneTools.addTool(StackScrollTool);

  // Create tool group
  const toolGroupId = 'VOLUME_TOOL_GROUP';
  const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

  // Add tools to tool group
  toolGroup.addTool(LengthTool.toolName);
  toolGroup.addTool(WindowLevelTool.toolName);
  toolGroup.addTool(PanTool.toolName);
  toolGroup.addTool(ZoomTool.toolName);
  toolGroup.addTool(StackScrollTool.toolName);

  toolGroup.setToolActive(LengthTool.toolName, {
    bindings: [{ mouseButton: MouseBindings.Primary }],
  });
  toolGroup.setToolActive(WindowLevelTool.toolName, {
    bindings: [{ mouseButton: MouseBindings.Secondary }],
  });
  toolGroup.setToolActive(PanTool.toolName, {
    bindings: [{ mouseButton: MouseBindings.Auxiliary }],
  });
  toolGroup.setToolActive(ZoomTool.toolName, {
    bindings: [{ mouseButton: MouseBindings.Primary, modifierKey: 'Shift' }],
  });
  toolGroup.setToolActive(StackScrollTool.toolName, {
    bindings: [{ mouseButton: MouseBindings.Wheel }],
  });

  // Get Cornerstone imageIds and fetch metadata into RAM
  const imageIds = await createImageIdsAndCacheMetaData({
    StudyInstanceUID:
      '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
    SeriesInstanceUID:
      '1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',
    wadoRsRoot: 'https://d14fa38qiwhyfd.cloudfront.net/dicomweb',
  });

  // Load volume
  const volume = await volumeLoader.createAndCacheVolume(volumeId, {
    imageIds,
  });
  volume.load();

  // Instantiate a rendering engine
  renderingEngine = new RenderingEngine(renderingEngineId);

  // Create viewport
  const viewportInputArray = [
    {
      viewportId: viewportId,
      type: ViewportType.ORTHOGRAPHIC,
      element: element,
      defaultOptions: {
        orientation: Enums.OrientationAxis.AXIAL,
        background: [0.2, 0, 0.2] as Types.Point3,
      },
    },
  ];

  renderingEngine.setViewports(viewportInputArray);

  // Set volumes on viewport
  await setVolumesForViewports(renderingEngine, [{ volumeId }], [viewportId]);

  // Set tool group
  toolGroup.addViewport(viewportId, renderingEngineId);

  // Render
  renderingEngine.renderViewports([viewportId]);

  // Set initial DataDisplayManager
  updateDataDisplayManager(annotationDisplayManagerName);

  // Create mock annotations
  createMockAnnotationsWithTimePoints();

  // Listen for dimension group changes (for real 4D volumes)
  eventTarget.addEventListener(
    Events.DYNAMIC_VOLUME_DIMENSION_GROUP_CHANGED,
    (evt: any) => {
      const { dimensionGroupNumber } = evt.detail;
      currentDimensionGroup = dimensionGroupNumber;
      const vp = renderingEngine?.getViewport(viewportId);
      vp?.render();
    }
  );
}

function updateDataDisplayManager(managerName: string) {
  annotationDisplayManagerName = managerName as any;

  cornerstoneTools.dataDisplay.annotation.registerAnnotationDataDisplayManagerForViewport(
    viewportId,
    annotationDisplayManagerName
  );
  const vp = renderingEngine?.getViewport(viewportId);
  vp?.render();
}

addDropdownToToolbar({
  id: 'annotationDisplayManager',
  options: {
    values: [...annotationDisplayManagerValues],
    defaultValue: annotationDisplayManagerName,
  },
  onSelectedValueChange: (value) => {
    updateDataDisplayManager(String(value));
  },
});

// Add a slider to simulate dimension group changes (for demo purposes)
// In a real 4D scenario, this would be controlled by the volume's dimensionGroupNumber
addSliderToToolbar({
  title: 'Simulated Time Point',
  range: [1, 3],
  defaultValue: 1,
  onSelectedValueChange: (value) => {
    currentDimensionGroup = Number(value);
    const volume = cache.getVolume(volumeId);
    if (volume && typeof (volume as any).dimensionGroupNumber !== 'undefined') {
      (volume as Types.IDynamicImageVolume).dimensionGroupNumber = currentDimensionGroup;
    }
    const vp = renderingEngine?.getViewport(viewportId);
    vp?.render();
  },
});

run();
