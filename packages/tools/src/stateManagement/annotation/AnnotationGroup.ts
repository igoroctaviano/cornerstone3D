import { eventTarget, triggerEvent } from '@cornerstonejs/core';
import Events from '../../enums/Events';
import { getAnnotation } from './annotationState';

export type BaseEventDetail = {
  viewportId: string;
  renderingEngineId: string;
};

export interface AnnotationGroupOptions {
  isDefault?: boolean;
  color?: string;
}

export default class AnnotationGroup {
  public readonly id: string;
  public name: string;
  public readonly isDefault: boolean;
  public color?: string;

  private annotationUIDs = new Set<string>();
  private _isVisible = true;

  public visibleFilter: (uid: string) => boolean;

  constructor(id: string, name: string, options: AnnotationGroupOptions = {}) {
    this.id = id;
    this.name = name;
    this.isDefault = options.isDefault || false;
    this.color = options.color;
    this.visibleFilter = this.unboundVisibleFilter.bind(this);
  }

  public rename(newName: string): void {
    this.name = newName;
  }

  public setColor(color: string | undefined): void {
    this.color = color;
  }

  /**
   * Returns true if other groups are free to hide this annotation.
   * That is, if the annotation is not a member or is hidden.
   */
  protected unboundVisibleFilter(uid: string): boolean {
    return !this._isVisible || !this.annotationUIDs.has(uid);
  }

  public has(uid: string): boolean {
    return this.annotationUIDs.has(uid);
  }
  /**
   * Sets whether annotations belonging to this group are visible or not.
   * If there are multiple groups, then the set visible false should be called
   * before before re-enabling the other groups with setVisible true.
   */
  public setVisible(
    isVisible = true,
    baseEvent: BaseEventDetail,
    filter?: (annotationUID: string) => boolean
  ) {
    if (this._isVisible === isVisible) {
      return;
    }
    this._isVisible = isVisible;
    this.annotationUIDs.forEach((uid) => {
      const annotation = getAnnotation(uid);
      if (!annotation) {
        this.annotationUIDs.delete(uid);
        return;
      }
      if (annotation.isVisible === isVisible) {
        return;
      }
      if (!isVisible && filter?.(uid) === false) {
        return;
      }
      annotation.isVisible = isVisible;
      const eventDetail = {
        ...baseEvent,
        annotation,
      };
      triggerEvent(eventTarget, Events.ANNOTATION_MODIFIED, eventDetail);
    });
  }

  public get isVisible() {
    return this._isVisible;
  }

  /** Finds the nearby/next annotation in the given direction */
  public findNearby(uid: string, direction: 1) {
    const uids = [...this.annotationUIDs];
    if (uids.length === 0) {
      return null;
    }
    if (!uid) {
      return uids[direction === 1 ? 0 : uids.length - 1];
    }
    const index = uids.indexOf(uid);
    if (
      index === -1 ||
      index + direction < 0 ||
      index + direction >= uids.length
    ) {
      return null;
    }
    return uids[index + direction];
  }

  /**
   * Adds the annotation to the group
   * Does NOT change the visibility status of the annotation.
   */
  public add(...annotationUIDs: string[]) {
    annotationUIDs.forEach((annotationUID) =>
      this.annotationUIDs.add(annotationUID)
    );
  }

  /**
   * Removes the annotation from the group.
   * Does not affect the visibility status of the annotation.
   */
  public remove(...annotationUIDs: string[]) {
    annotationUIDs.forEach((annotationUID) =>
      this.annotationUIDs.delete(annotationUID)
    );
  }

  /**
   * Removes everything from the group.
   */
  public clear() {
    this.annotationUIDs.clear();
  }
}
