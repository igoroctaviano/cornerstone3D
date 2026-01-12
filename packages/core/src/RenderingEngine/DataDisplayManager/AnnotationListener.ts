import eventTarget from '../../eventTarget';
import type { IDataDisplaySource } from './types';
import { Enums } from '@cornerstonejs/tools';
export class AnnotationListener implements IDataDisplaySource<any> {
  private annotationEventListeners = new Map<string, EventListener>();
  private annotationsMap = new Map<string, any>();
  private onDelete: any;
  private onUpdate: any;
  private onAdd: any;

  init(onDelete: any, onUpdate: any, onAdd: any): Map<string, any> {
    this.onDelete = onDelete;
    this.onUpdate = onUpdate;
    this.onAdd = onAdd;

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
        this.onAdd({ annotationUID: annotation.annotationUID, annotation });
        this.onUpdate({ annotationUID: annotation.annotationUID, annotation });
      }
    };

    const handleAnnotationModified = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { annotation } = customEvent.detail;
      if (annotation?.annotationUID) {
        this.annotationsMap.set(annotation.annotationUID, annotation);
        this.onUpdate({ annotationUID: annotation.annotationUID, annotation });
      }
    };

    const handleAnnotationRemoved = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { annotation } = customEvent.detail;
      if (annotation?.annotationUID) {
        this.annotationsMap.delete(annotation.annotationUID);
        this.onDelete({ annotationUID: annotation.annotationUID, annotation });
      }
    };

    const handleOtherAnnotationEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const annotationData = {
        event: customEvent.type,
        detail: customEvent.detail,
      };
      this.onUpdate(annotationData);
    };

    annotationEvents.forEach((eventName) => {
      let handler: EventListener;
      if (eventName === Enums.Events.ANNOTATION_ADDED) {
        console.debug('AnnotationListener: ANNOTATION_ADDED');
        handler = handleAnnotationAdded;
      } else if (eventName === Enums.Events.ANNOTATION_MODIFIED) {
        handler = handleAnnotationModified;
      } else if (eventName === Enums.Events.ANNOTATION_REMOVED) {
        handler = handleAnnotationRemoved;
      } else {
        handler = handleOtherAnnotationEvent;
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
