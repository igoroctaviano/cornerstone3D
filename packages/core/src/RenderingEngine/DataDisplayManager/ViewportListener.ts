import { getRenderingEngines } from '../getRenderingEngine';
import eventTarget from '../../eventTarget';
import Events from '../../enums/Events';
import type { IDataDisplaySource } from './types';

const VIEWPORT_EVENTS = [
  Events.CAMERA_MODIFIED,
  Events.CAMERA_RESET,
  Events.VOI_MODIFIED,
  Events.PRESET_MODIFIED,
  Events.DISPLAY_AREA_MODIFIED,
  Events.IMAGE_RENDERED,
  Events.IMAGE_SPACING_CALIBRATED,
  Events.STACK_NEW_IMAGE,
  Events.VOLUME_NEW_IMAGE,
  Events.PRE_STACK_NEW_IMAGE,
  Events.VIEWPORT_NEW_IMAGE_SET,
  Events.STACK_VIEWPORT_SCROLL,
  Events.VOLUME_VIEWPORT_SCROLL,
  Events.VOLUME_VIEWPORT_NEW_VOLUME,
  Events.COLORMAP_MODIFIED,
  Events.ACTORS_CHANGED,
  Events.CLIPPING_PLANES_UPDATED,
];

export class ViewportListener implements IDataDisplaySource<any> {
  private viewportEventListeners = new Map<string, Map<string, EventListener>>();
  private elementEnabledListener: EventListener | null = null;
  private elementDisabledListener: EventListener | null = null;
  private onDelete: any;
  private onUpdate: any;
  private onAdd: any;

  init(onDelete: any, onUpdate: any, onAdd: any): Map<string, any> {
    this.onDelete = onDelete;
    this.onUpdate = onUpdate;
    this.onAdd = onAdd;

    const viewportsMap = new Map<string, any>();

    const subscribeToViewportEvents = (element: HTMLDivElement, viewportId: string) => {
      if (this.viewportEventListeners.has(viewportId)) {
        return;
      }

      const listeners = new Map<string, EventListener>();

      const handleViewportEvent = (event: Event) => {
        const customEvent = event as CustomEvent;
        const viewportData = {
          viewportId,
          event: customEvent.type,
          detail: customEvent.detail,
        };
        this.onUpdate(viewportData);
      };

      VIEWPORT_EVENTS.forEach((eventName) => {
        element.addEventListener(eventName, handleViewportEvent);
        listeners.set(eventName, handleViewportEvent);
      });

      this.viewportEventListeners.set(viewportId, listeners);
      viewportsMap.set(viewportId, { viewportId, element });
      this.onAdd({ viewportId, element });
    };

    const unsubscribeFromViewportEvents = (viewportId: string, values: Map<string, any>) => {
      const listeners = this.viewportEventListeners.get(viewportId);
      if (!listeners) {
        return;
      }

      const viewportData = values.get(viewportId);
      if (viewportData?.element) {
        listeners.forEach((listener, eventName) => {
          viewportData.element.removeEventListener(eventName, listener);
        });
      }

      this.viewportEventListeners.delete(viewportId);
      this.onDelete({ viewportId });
    };

    const handleElementEnabled = (evt: Event) => {
      const customEvent = evt as CustomEvent;
      const { element, viewportId } = customEvent.detail;
      subscribeToViewportEvents(element, viewportId);
    };

    const handleElementDisabled = (evt: Event) => {
      const customEvent = evt as CustomEvent;
      const { viewportId } = customEvent.detail;
      unsubscribeFromViewportEvents(viewportId, viewportsMap);
    };

    eventTarget.addEventListener(Events.ELEMENT_ENABLED, handleElementEnabled);
    this.elementEnabledListener = handleElementEnabled;

    eventTarget.addEventListener(Events.ELEMENT_DISABLED, handleElementDisabled);
    this.elementDisabledListener = handleElementDisabled;

    const renderingEngines = getRenderingEngines();
    if (renderingEngines) {
      renderingEngines.forEach((renderingEngine) => {
        const viewports = renderingEngine.getViewports();
        viewports.forEach((viewport) => {
          subscribeToViewportEvents(viewport.element, viewport.id);
        });
      });
    }

    return viewportsMap;
  }

  destroy(values: Map<string, any>): void {
    this.viewportEventListeners.forEach((listeners, viewportId) => {
      const viewportData = values.get(viewportId);
      if (viewportData?.element) {
        listeners.forEach((listener, eventName) => {
          viewportData.element.removeEventListener(eventName, listener);
        });
      }
      this.onDelete({ viewportId });
    });

    this.viewportEventListeners.clear();

    if (this.elementEnabledListener) {
      eventTarget.removeEventListener(Events.ELEMENT_ENABLED, this.elementEnabledListener);
      this.elementEnabledListener = null;
    }

    if (this.elementDisabledListener) {
      eventTarget.removeEventListener(Events.ELEMENT_DISABLED, this.elementDisabledListener);
      this.elementDisabledListener = null;
    }
  }
}
