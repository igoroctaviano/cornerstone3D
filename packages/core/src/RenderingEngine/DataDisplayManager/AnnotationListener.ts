import eventTarget from '../../eventTarget';
import type { IDataDisplaySource } from './types';
import { Enums } from '@cornerstonejs/tools';
import { dataDisplayManager } from './DataDisplayManager';

export class AnnotationListener implements IDataDisplaySource<any> {
  private annotationEventListeners = new Map<string, EventListener>();
  private annotationsMap = new Map<string, any>();
  private sourceId: string;

  constructor(sourceId: string = 'annotations') {
    this.sourceId = sourceId;
  }

  init(): Map<string, any> {
    this.annotationsMap.clear();

    const annotationEvents = [
      Enums.Events.ANNOTATION_ADDED,
      Enums.Events.ANNOTATION_MODIFIED,
      Enums.Events.ANNOTATION_REMOVED,
    ];

    const handleAnnotationAdded = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { annotation } = customEvent.detail;
      if (annotation?.annotationUID) {
        this.annotationsMap.set(annotation.annotationUID, annotation);
      }
      dataDisplayManager.invalidateBySource(this.sourceId);
    };

    const handleAnnotationModified = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { annotation } = customEvent.detail;
      if (annotation?.annotationUID) {
        this.annotationsMap.set(annotation.annotationUID, annotation);
      }
      dataDisplayManager.invalidateBySource(this.sourceId);
    };

    const handleAnnotationRemoved = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { annotation } = customEvent.detail;
      if (annotation?.annotationUID) {
        this.annotationsMap.delete(annotation.annotationUID);
      }
      dataDisplayManager.invalidateBySource(this.sourceId);
    };

    annotationEvents.forEach((eventName) => {
      let handler: EventListener = () => {};
      if (eventName === Enums.Events.ANNOTATION_ADDED) {
        handler = handleAnnotationAdded;
      } else if (eventName === Enums.Events.ANNOTATION_MODIFIED) {
        handler = handleAnnotationModified;
      } else if (eventName === Enums.Events.ANNOTATION_REMOVED) {
        handler = handleAnnotationRemoved;
      }

      eventTarget.addEventListener(eventName, handler);
      this.annotationEventListeners.set(eventName, handler);
    });

    return this.annotationsMap;
  }

  destroy(values: Map<string, any>): void {
    this.annotationEventListeners.forEach((listener, eventName) => {
      eventTarget.removeEventListener(eventName, listener);
    });

    this.annotationEventListeners.clear();
    this.annotationsMap.clear();
  }
}
