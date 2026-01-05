import type AnnotationGroupSelector from './AnnotationGroupSelector';
import type {
  Annotation,
  Annotations,
  AnnotationState,
  GroupSpecificAnnotations,
} from './AnnotationTypes';

/**
 * The interface for any annotation manager (custom or default)
 */
interface IAnnotationManager {
  /**
   * Unique identifier for this manager instance.
   * Used in events and to allow selecting between multiple managers.
   */
  readonly uid: string;

  /**
   * Annotations are stored in Groups. Our default annotation manager
   * groups the annotations based on FrameOfReferenceUID, but it is possible
   * that you can group them based on different aspects or you only have one group
   * totally.
   *
   * This function returns the selector ID associated with the specified
   * annotationGroupSelector. The annotationGroupSelector can be an HTML element
   * or a string. The selectorId is a generic identifier that can represent
   * FrameOfReferenceUID, annotation groups, or other grouping mechanisms.
   *
   * @param annotationGroupSelector - The annotation group selector.
   * @returns The selector ID associated with the element.
   */
  getGroupKey: (annotationGroupSelector: AnnotationGroupSelector) => string;

  /**
   * Adds an annotation to the specified group.
   * @param annotation - The annotation to add.
   * @param selectorId - The selector ID to add the annotation to (e.g., FrameOfReferenceUID or group ID).
   */
  addAnnotation: (annotation: Annotation, selectorId: string) => void;

  /**
   * Returns the annotations associated with the specified group, if the
   * toolName is specified, it will return the annotations for the specified
   * tool.
   * @param selectorId - The selector ID to retrieve annotations for (e.g., FrameOfReferenceUID or group ID).
   * @param toolName - The name of the tool to retrieve annotations for.
   *
   * @returns The annotations associated with the specified group and tool.
   */
  getAnnotations: (
    selectorId: string,
    toolName?: string
  ) => GroupSpecificAnnotations | Annotations;

  /**
   * Returns the annotation with the specified UID.
   * @param annotationUID - The UID of the annotation to retrieve.
   * @returns The annotation with the specified UID.
   */
  getAnnotation: (annotationUID: string) => Annotation | undefined;

  /**
   * Returns all annotations as a single flat array.
   * WARNING: Implementations may return internal references; do not mutate.
   */
  getAllAnnotations: () => Annotations;

  /**
   * Returns the list of available group keys (e.g. FrameOfReferenceUIDs)
   * for managers that support it (default manager does).
   */
  getFramesOfReference: () => Array<string>;

  /**
   * Removes the annotation with the specified UID.
   * @param annotationUID - The UID of the annotation to remove.
   */
  removeAnnotation: (annotationUID: string) => void;

  /**
   * Removes all annotations associated with the specified group.
   * @param selectorId - The selector ID to remove annotations for (e.g., FrameOfReferenceUID or group ID).
   */
  removeAnnotations: (selectorId: string, toolName?: string) => Annotations;

  /**
   * Removes all annotations.
   */
  removeAllAnnotations: () => Annotations;

  /**
   * Returns the number of annotations associated with the specified group.
   * If the toolName is specified, it will return the number of annotations
   *
   * @param selectorId - The selector ID to count annotations for (e.g., FrameOfReferenceUID or group ID).
   * @param toolName - The name of the tool to count annotations for.
   * @returns The number of annotations associated with the specified group.
   */
  getNumberOfAnnotations: (selectorId: string, toolName?: string) => number;

  /**
   * Returns the total number of annotations across all groups.
   * @returns The total number of annotations across all groups.
   */
  getNumberOfAllAnnotations: () => number;

  /**
   * Optional serialization helpers (supported by the default manager).
   */
  saveAnnotations?: (
    selectorId?: string,
    toolName?: string
  ) => AnnotationState | GroupSpecificAnnotations | Annotations | undefined;

  restoreAnnotations: (
    state: AnnotationState | GroupSpecificAnnotations | Annotations,
    selectorId?: string,
    toolName?: string
  ) => void;

  /**
   * Optional hook to normalize annotations as they are stored.
   */
  setPreprocessingFn?: (fn: (annotation: Annotation) => Annotation) => void;
}

export type { IAnnotationManager as default };
