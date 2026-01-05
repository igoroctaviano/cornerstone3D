# Data Display Manager (generic + annotations)

> Why it exists: to unify “what data is viewable in a viewport” across **all** non-image data (annotations now; segmentations/overlays next) with a pluggable registry of filter providers and managers, plus global and per-viewport selection.

## Core concepts

- **DataDisplayManager**: named strategy that produces the set of items to show for a `dataType` (e.g., `annotations`, `segmentations`).
- **Filter Providers**: named functions `(viewport, data, filterOptions) -> data` that managers can compose.
- **Selection**:
  - Global per data type: `activeDataDisplayManagers[dataType]`
  - Per-viewport override per data type: `viewportDataDisplayManagers[viewportId][dataType]`
- **Compatibility**: legacy `filterAnnotationsForDisplay` still works; it now delegates to the annotation DataDisplayManager.

## Generic API (any data type)

Location: `packages/tools/src/stateManagement/dataDisplay/dataDisplayManager.ts`

- Register providers (follows the same pattern as metadata providers in cornerstone3d):
  ```ts
  registerFilter(dataType, name, (args) => filteredData);
  unregisterFilterProvider(dataType, name);
  ```
- Register managers:
  ```ts
  registerDataDisplayManager(dataType, name, manager);
  unregisterDataDisplayManager(dataType, name);
  ```
- Create a pipeline manager from provider names:
  ```ts
  createPipelineDataDisplayManager(dataType, name, ['providerA', 'providerB']);
  ```
- Select active manager:
  ```ts
  setActiveDataDisplayManager(dataType, name); // global
  registerDataDisplayManagerForViewport(viewportId, dataType, name); // per viewport
  unregisterDataDisplayManagerForViewport(viewportId, dataType);
  ```
- Get data to render:
  ```ts
  const visible = getDataForDisplay(dataType, viewport, rawData, filterOptions);
  ```

## Annotation-specific layer (built on generic)

Location: `packages/tools/src/stateManagement/dataDisplay/annotationDataDisplayManager.ts`

- Data type key: `annotations`
- Built-in filter providers (registered by default):
  - `default`: Preserves current `filterAnnotationsForDisplay` behavior for backward compatibility
  - `bySelectorId`: Filters based on selector IDs (e.g., groupIds, FrameOfReferenceUID)
  - `byReferenceImageId`: Strict `referencedImageId` matching - only show annotations from the same viewport image data
  - `byFrameOfReference`: FOR-based filtering + in-slice filtering for volume viewports
  - `byTime`: Filters by time/dimension group for 4D volumes (uses volume's activeDimensionGroup)
  - `referenceViewable`: Uses `viewport.isReferenceViewable(...)` logic
- Built-in managers (registered by default):
  - `default`: Uses `['default', 'bySelectorId']` pipeline (preserves existing behavior)
  - `byReferenceImageId`: Uses `['byReferenceImageId', 'bySelectorId']` pipeline
  - `byFrameOfReference`: Uses `['byFrameOfReference', 'bySelectorId']` pipeline
  - `bySelectorId`: Uses `['default', 'bySelectorId']` pipeline (for testing selector filtering independently)
- Helper:
  ```ts
  createAnnotationPipelineDataDisplayManager(name, ['providerA', ...]);
  ```
- Wrapper for legacy usage:
  ```ts
  import filterAnnotationsForDisplay from '../../utilities/planar/filterAnnotationsForDisplay';
  // now delegates to DataDisplayManager('annotations')
  ```

## Selecting managers at runtime

Global (per data type):
```ts
setActiveDataDisplayManager('annotations', 'byReferenceImageId');
```

Per viewport:
```ts
registerDataDisplayManagerForViewport(viewportId, 'annotations', 'byFrameOfReference');
```

Rendering:
```ts
const visibleAnnotations = getDataForDisplay('annotations', viewport, annotations, options);
```

## Extending to new data types (e.g., segmentations)

1) Define providers:
```ts
registerFilter('segmentations', 'visibility', ({ viewport, data }) => /* ... */);
```
2) Define a manager:
```ts
registerDataDisplayManager(
  'segmentations',
  'default',
  createPipelineDataDisplayManager('segmentations', 'default', ['visibility'])
);
```
3) Choose active (global or per viewport):
```ts
setActiveDataDisplayManager('segmentations', 'default');
registerDataDisplayManagerForViewport(viewportId, 'segmentations', 'default');
```
4) Use in rendering:
```ts
const visibleSegs = getDataForDisplay('segmentations', viewport, segs, {});
```

## State fields

`packages/tools/src/store/state.ts`
```ts
activeDataDisplayManagers: Record<string, string>;          // per data type
viewportDataDisplayManagers: Record<string, Record<string, string>>; // per viewport per data type
```

## isReferenceViewable tweaks (context)

Volume viewports now prefer exact `referencedImageId` when available before falling back to slice index, matching the meeting requirement for timing-aware matching. Stack viewports fixed range handling (`multiSliceReference`).

## Running Examples

Two examples demonstrate the DataDisplayManager functionality:

### 1. DataDisplayManager Demo (`dataDisplayManagerDemo`)

A focused example showing different filtering modes with stack and volume viewports side-by-side.

**To run:**
```bash
# From the root of the cornerstone3D repository
yarn run example dataDisplayManagerDemo
```

**Features:**
- Stack and volume viewports with same/different acquisitions
- Dropdown to switch between filtering modes: `default`, `bySelectorId`, `byReferenceImageId`, `byFrameOfReference`, `referenceViewable`
- Draw annotations and see how they're filtered based on the selected mode
- Demonstrates per-viewport manager configuration
- When using `bySelectorId` mode, you can create annotation groups and select which groups are visible per viewport

### 2. DataDisplayManager 4D/Time (`dataDisplayManager4D`)

Demonstrates time-based filtering for 4D volumes using dimension groups.

**To run:**
```bash
# From the root of the cornerstone3D repository
yarn run example dataDisplayManager4D
```

**Features:**
- Shows how annotations are filtered based on dimension group (time point)
- Slider to simulate dimension group changes
- Demonstrates the `byTime` filter provider
- In real 4D scenarios, annotations with `dimensionGroupNumber` metadata will only show at matching time points
- The volume's `activeDimensionGroup` property tells you which timepoint is currently active

### 3. PET-CT Example (`petCt`)

The existing PET-CT example has been enhanced with DataDisplayManager controls.

**To run:**
```bash
# From the root of the cornerstone3D repository
yarn run example petCt
```

**Features:**
- Full PET-CT fusion layout
- Dropdown to select DataDisplayManager mode
- Dropdown to select target viewports (ALL, CT, PT, FUSION, PETMIP)
- Apply different managers to different viewport groups

### General Instructions

1. **Prerequisites:**
   ```bash
   # Clone the repository
   git clone https://github.com/cornerstonejs/cornerstone3D.git
   cd cornerstone3D
   
   # Install dependencies
   yarn install --frozen-lockfile
   ```

2. **Run an example:**
   ```bash
   # From the root of the repository
   yarn run example <example-name>
   ```
   
   The example name is case-insensitive. Examples are located in:
   - `packages/tools/examples/dataDisplayManagerDemo/`
   - `packages/tools/examples/dataDisplayManager4D/`
   - `packages/tools/examples/petCt/`

3. **Access the example:**
   - The example will be served at `http://localhost:8080` (or the port shown in the terminal)
   - Open the URL in your browser
   - Use Chrome DevTools to debug (click on `index.ts` in the console to view source)

4. **View source code:**
   - Open Chrome DevTools (F12)
   - Check the console for a link to `index.ts`
   - Click the link to view and debug the source code
   - Set breakpoints to investigate variables and function calls

## Rationale vs. previous state

- Before: annotation-specific logic (`filterAnnotationsForDisplay`) tied to DOM dataset flags; no generic way to swap strategies per viewport or per data type.
- After: generic, registry-driven selection (global + per-viewport) for any data type; legacy behavior preserved via wrappers; built-in annotation strategies provided; ready to add segmentation/overlay pipelines.
