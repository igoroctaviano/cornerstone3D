import eventTarget from '../../eventTarget';
import type { IDataDisplaySource } from './types';

let ToolsEvents: any;
let getAllAnnotations: (() => any[]) | null = null;
try {
  const toolsModule = require('@cornerstonejs/tools');
  ToolsEvents = toolsModule.Enums?.Events;
  if (toolsModule.annotation?.state?.getAllAnnotations) {
    getAllAnnotations = toolsModule.annotation.state.getAllAnnotations;
  }
} catch (e) {
  ToolsEvents = null;
  getAllAnnotations = null;
}

const getAnnotationEvents = () => {
  if (!ToolsEvents) {
    return [];
  }
  return [
    ToolsEvents.ANNOTATION_ADDED,
    ToolsEvents.ANNOTATION_COMPLETED,
    ToolsEvents.ANNOTATION_MODIFIED,
    ToolsEvents.ANNOTATION_REMOVED,
    ToolsEvents.ANNOTATION_SELECTION_CHANGE,
    ToolsEvents.ANNOTATION_LOCK_CHANGE,
    ToolsEvents.ANNOTATION_VISIBILITY_CHANGE,
    ToolsEvents.ANNOTATION_RENDERED,
    ToolsEvents.ANNOTATION_CUT_MERGE_PROCESS_COMPLETED,
    ToolsEvents.ANNOTATION_INTERPOLATION_PROCESS_COMPLETED,
    ToolsEvents.INTERPOLATED_ANNOTATIONS_REMOVED,
  ];
};

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

    if (getAllAnnotations) {
      const existingAnnotations = getAllAnnotations();
      existingAnnotations.forEach((annotation) => {
        if (annotation?.annotationUID) {
          this.annotationsMap.set(annotation.annotationUID, annotation);
          this.onAdd({ annotationUID: annotation.annotationUID, annotation });
        }
      });
    }

    const annotationEvents = getAnnotationEvents();
    if (annotationEvents.length === 0) {
      return this.annotationsMap;
    }

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
      if (eventName === ToolsEvents.ANNOTATION_ADDED) {
        handler = handleAnnotationAdded;
      } else if (eventName === ToolsEvents.ANNOTATION_MODIFIED) {
        handler = handleAnnotationModified;
      } else if (eventName === ToolsEvents.ANNOTATION_REMOVED) {
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
