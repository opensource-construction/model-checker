export interface PartialResult {
  globalId: string;
  name: string;
  entityId: string;
  shapeId?: string;
  storeyId?: string | null;
  passed: boolean;
}