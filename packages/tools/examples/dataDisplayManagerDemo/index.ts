import type { Types } from '@cornerstonejs/core';
import {
  RenderingEngine,
  Enums,
  setVolumesForViewports,
  volumeLoader,
  getRenderingEngine,
  eventTarget,
} from '@cornerstonejs/core';
import {
  initDemo,
  createImageIdsAndCacheMetaData,
  setTitleAndDescription,
  addDropdownToToolbar,
  addButtonToToolbar,
} from '../../../../utils/demo/helpers';
import * as cornerstoneTools from '@cornerstonejs/tools';
import { annotationRenderingEngine } from '../../src/stateManagement/annotation/AnnotationRenderingEngine';

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
const { ViewportType } = Enums;

const renderingEngineId = 'myRenderingEngine';
const volumeLoaderScheme = 'cornerstoneStreamingImageVolume';
const volumeName = 'CT_VOLUME_ID';
const volumeId = `${volumeLoaderScheme}:${volumeName}`;

const viewportIds = {
  STACK: 'STACK_VIEWPORT',
  VOLUME: 'VOLUME_VIEWPORT',
};

// ======== Set up page ======== //
setTitleAndDescription(
  'Data Display Manager Demo',
  'Demonstrates DataDisplayManager filtering modes. Create annotations and switch between filtering modes to see how annotations are filtered across viewports with different acquisitions.'
);

const size = '500px';
const content = document.getElementById('content');
const viewportGrid = document.createElement('div');

viewportGrid.style.display = 'flex';
viewportGrid.style.flexDirection = 'row';
viewportGrid.style.gap = '10px';

const element1 = document.createElement('div');
const element2 = document.createElement('div');
element1.oncontextmenu = () => false;
element2.oncontextmenu = () => false;

element1.style.width = size;
element1.style.height = size;
element2.style.width = size;
element2.style.height = size;

viewportGrid.appendChild(element1);
viewportGrid.appendChild(element2);
content.appendChild(viewportGrid);

const instructions = document.createElement('p');
instructions.innerText =
  'Use the dropdown to switch between DataDisplayManager modes:\n' +
  '- default: Preserves current filtering behavior (backward compatible)\n' +
  '- bySelectorId: Test selector ID filter independently (default + bySelectorId)\n' +
  '- byReferenceImageId: Only show annotations from the same viewport image data + bySelectorId\n' +
  '- byFrameOfReference: Show annotations from same FOR + in-slice filtering + bySelectorId\n' +
  '- referenceViewable: Uses viewport.isReferenceViewable() logic + bySelectorId\n\n' +
  'Left click to draw length measurements. The annotations will be filtered based on the selected mode.\n\n' +
  'When using "bySelectorId" mode, you can create groups and select which groups are visible per viewport. ' +
  'New annotations are assigned to the "default" group.';
instructions.style.marginTop = '10px';
instructions.style.whiteSpace = 'pre-line';
content.appendChild(instructions);
// ============================= //

// DataDisplayManager demo controls
const annotationDisplayManagerValues = [
  'default',
  'bySelectorId',
  'byReferenceImageId',
  'byFrameOfReference',
  'referenceViewable',
] as const;

let annotationDisplayManagerName:
  | (typeof annotationDisplayManagerValues)[number] = 'default';

let renderingEngine: RenderingEngine;

// Group management
interface AnnotationGroup {
  id: string;
  name: string;
}

const groups: AnnotationGroup[] = [{ id: 'default', name: 'Default' }];
let groupCounter = 1;

// Active group for new annotations
let activeGroupId = 'default';

// Per-viewport visible groups
const viewportVisibleGroups: Record<string, string[]> = {
  [viewportIds.STACK]: ['default'],
  [viewportIds.VOLUME]: ['default'],
};

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

  // Create tool groups
  const stackToolGroupId = 'STACK_TOOL_GROUP';
  const volumeToolGroupId = 'VOLUME_TOOL_GROUP';

  const stackToolGroup = ToolGroupManager.createToolGroup(stackToolGroupId);
  const volumeToolGroup = ToolGroupManager.createToolGroup(volumeToolGroupId);

  // Add tools to tool groups
  [stackToolGroup, volumeToolGroup].forEach((toolGroup) => {
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

  // Create viewports
  const viewportInputArray = [
    {
      viewportId: viewportIds.STACK,
      type: ViewportType.STACK,
      element: element1,
      defaultOptions: {
        background: [0.2, 0, 0.2] as Types.Point3,
      },
    },
    {
      viewportId: viewportIds.VOLUME,
      type: ViewportType.ORTHOGRAPHIC,
      element: element2,
      defaultOptions: {
        orientation: Enums.OrientationAxis.AXIAL,
        background: [0.2, 0, 0.2] as Types.Point3,
      },
    },
  ];

  renderingEngine.setViewports(viewportInputArray);

  // Set volumes on viewports
  await setVolumesForViewports(
    renderingEngine,
    [{ volumeId }],
    [viewportIds.VOLUME]
  );

  // Set stack on stack viewport
  const stackViewport = renderingEngine.getViewport(
    viewportIds.STACK
  ) as Types.IStackViewport;
  await stackViewport.setStack(imageIds, 0);

  // Set tool groups
  stackToolGroup.addViewport(viewportIds.STACK, renderingEngineId);
  volumeToolGroup.addViewport(viewportIds.VOLUME, renderingEngineId);

  // Render
  renderingEngine.renderViewports([viewportIds.STACK, viewportIds.VOLUME]);

  // Set initial DataDisplayManager
  updateDataDisplayManager(annotationDisplayManagerName);

  // Initialize visible groups on viewport elements
  updateViewportVisibleGroups(viewportIds.STACK);
  updateViewportVisibleGroups(viewportIds.VOLUME);

  // Listen for annotation creation to allow group assignment
  setupAnnotationGroupAssignment();
}

function setupAnnotationGroupAssignment() {
  // Listen for annotation added events
  const { Events } = csToolsEnums;

  eventTarget.addEventListener(Events.ANNOTATION_ADDED, (evt: any) => {
    const { annotation, viewportId } = evt.detail;
    
    // Assign new annotations to the active group
    // Replace any existing groupIds to ensure it's only in the active group
    annotation.groupIds = [activeGroupId];
    
    // Ensure the active group is visible in the viewport where annotation was created
    if (viewportId && viewportVisibleGroups[viewportId]) {
      const visibleGroups = viewportVisibleGroups[viewportId];
      if (!visibleGroups.includes(activeGroupId)) {
        visibleGroups.push(activeGroupId);
        updateViewportVisibleGroups(viewportId);
        // Update UI to reflect the change
        updateGroupSelectionUI();
      } else {
        // Still trigger render to show the new annotation
        const viewport = renderingEngine?.getViewport(viewportId);
        if (viewport?.element) {
          annotationRenderingEngine.renderViewport(viewport.element as HTMLDivElement);
        }
      }
    } else if (viewportId) {
      // If viewportId exists but not in our map, initialize it
      viewportVisibleGroups[viewportId] = [activeGroupId];
      updateViewportVisibleGroups(viewportId);
      updateGroupSelectionUI();
    }
  });
}

function updateViewportVisibleGroups(viewportId: string) {
  const viewport = renderingEngine?.getViewport(viewportId);
  if (!viewport?.element) {
    return;
  }

  const visibleGroups = viewportVisibleGroups[viewportId] || ['default'];
  const element = viewport.element as HTMLDivElement;
  element.dataset.visibleAnnotationGroups = visibleGroups.join(',');
  
  // Trigger viewport render
  viewport.render();
  
  // Trigger annotation re-render
  annotationRenderingEngine.renderViewport(element);
}

function createGroup() {
  const groupName = prompt('Enter group name:', `Group ${groupCounter}`);
  if (!groupName) {
    return;
  }

  const groupId = `group-${groupCounter++}`;
  groups.push({ id: groupId, name: groupName });

  // Add to visible groups for all viewports by default
  Object.keys(viewportVisibleGroups).forEach((vpId) => {
    if (!viewportVisibleGroups[vpId].includes(groupId)) {
      viewportVisibleGroups[vpId].push(groupId);
    }
  });

  // Update UI
  updateGroupSelectionUI();
  updateViewportVisibleGroups(viewportIds.STACK);
  updateViewportVisibleGroups(viewportIds.VOLUME);
}

function toggleGroupForViewport(viewportId: string, groupId: string) {
  const visibleGroups = viewportVisibleGroups[viewportId] || [];
  const index = visibleGroups.indexOf(groupId);

  if (index >= 0) {
    visibleGroups.splice(index, 1);
    
    // Don't allow hiding all groups - ensure at least the active group is visible
    // This prevents issues where you can't draw annotations because no groups are visible
    if (visibleGroups.length === 0) {
      // Keep at least the active group visible
      visibleGroups.push(activeGroupId);
      // Update UI to reflect this
      setTimeout(() => updateGroupSelectionUI(), 0);
    }
  } else {
    visibleGroups.push(groupId);
  }

  viewportVisibleGroups[viewportId] = visibleGroups;
  updateViewportVisibleGroups(viewportId);
  updateGroupSelectionUI();
}

function updateGroupSelectionUI() {
  // Remove existing group UI
  const existingUI = document.getElementById('group-selection-ui');
  if (existingUI) {
    existingUI.remove();
  }

  // Only show group UI when "bySelectorId" manager is selected
  if (annotationDisplayManagerName !== 'bySelectorId') {
    return;
  }

  const groupUI = document.createElement('div');
  groupUI.id = 'group-selection-ui';
  groupUI.style.marginTop = '10px';
  groupUI.style.padding = '10px';
  groupUI.style.border = '1px solid #ccc';
  groupUI.style.borderRadius = '4px';

  const title = document.createElement('h4');
  title.textContent = 'Annotation Groups';
  title.style.margin = '0 0 10px 0';
  groupUI.appendChild(title);

  // Active group selector
  const activeGroupSection = document.createElement('div');
  activeGroupSection.style.marginBottom = '15px';
  activeGroupSection.style.padding = '10px';
  activeGroupSection.style.backgroundColor = '#e8f4f8';
  activeGroupSection.style.borderRadius = '4px';

  const activeGroupLabel = document.createElement('label');
  activeGroupLabel.textContent = 'Active Group (for new annotations): ';
  activeGroupLabel.style.fontWeight = 'bold';
  activeGroupLabel.style.marginRight = '10px';
  activeGroupSection.appendChild(activeGroupLabel);

  const activeGroupSelect = document.createElement('select');
  activeGroupSelect.id = 'active-group-select';
  groups.forEach((group) => {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = group.name;
    if (group.id === activeGroupId) {
      option.selected = true;
    }
    activeGroupSelect.appendChild(option);
  });
  activeGroupSelect.onchange = () => {
    activeGroupId = activeGroupSelect.value;
  };
  activeGroupSelect.style.padding = '5px';
  activeGroupSection.appendChild(activeGroupSelect);
  groupUI.appendChild(activeGroupSection);

  // Create group button
  const createBtn = document.createElement('button');
  createBtn.textContent = '+ Create Group';
  createBtn.onclick = () => {
    createGroup();
    // Update active group dropdown
    const select = document.getElementById('active-group-select') as HTMLSelectElement;
    if (select) {
      select.innerHTML = '';
      groups.forEach((group) => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        if (group.id === activeGroupId) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    }
  };
  createBtn.style.marginBottom = '10px';
  groupUI.appendChild(createBtn);

  // Per-viewport group selection
  Object.entries(viewportIds).forEach(([label, vpId]) => {
    const viewportSection = document.createElement('div');
    viewportSection.style.marginBottom = '15px';

    const viewportLabel = document.createElement('strong');
    viewportLabel.textContent = `${label} Viewport:`;
    viewportLabel.style.display = 'block';
    viewportLabel.style.marginBottom = '5px';
    viewportSection.appendChild(viewportLabel);

    groups.forEach((group) => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `group-${vpId}-${group.id}`;
      checkbox.checked = (viewportVisibleGroups[vpId] || []).includes(group.id);
      checkbox.onchange = () => toggleGroupForViewport(vpId, group.id);

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = group.name;
      label.style.marginLeft = '5px';
      label.style.cursor = 'pointer';

      const container = document.createElement('div');
      container.style.marginLeft = '10px';
      container.appendChild(checkbox);
      container.appendChild(label);
      viewportSection.appendChild(container);
    });

    groupUI.appendChild(viewportSection);
  });

  const instructions = document.querySelector('p');
  if (instructions) {
    instructions.parentNode?.insertBefore(groupUI, instructions.nextSibling);
  }
}

function updateDataDisplayManager(managerName: string) {
  annotationDisplayManagerName = managerName as any;

  // Apply to all viewports
  Object.values(viewportIds).forEach((viewportId) => {
    cornerstoneTools.dataDisplay.annotation.registerAnnotationDataDisplayManagerForViewport(
      viewportId,
      annotationDisplayManagerName
    );
    const vp = renderingEngine?.getViewport(viewportId);
    vp?.render();
  });

  // Update group UI visibility
  updateGroupSelectionUI();
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

run();
