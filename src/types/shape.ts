export type PointType = "corner" | "smooth";

export interface ControlPoint {
  x: number;
  y: number;
}

export interface PathPoint {
  id: string;
  x: number;
  y: number;
  type: PointType;
  cp1?: ControlPoint; // incoming bezier handle
  cp2?: ControlPoint; // outgoing bezier handle
}

export type PreviewMode = "solid" | "checkerboard" | "image";

export interface CanvasSettings {
  width: number;
  height: number;
  previewMode: PreviewMode;
  previewColor: string;
  previewImage?: string; // base64 data URL
}

export interface EditorState {
  points: PathPoint[];
  canvasSettings: CanvasSettings;
}
