export type PointType = "corner" | "smooth" | "quadratic" | "arc";

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
  // arc-specific (type === "arc")
  rx?: number;
  ry?: number;
  largeArc?: boolean;
  sweep?: boolean;
}

export type PreviewMode = "solid" | "checkerboard" | "image";

export interface CanvasSettings {
  width: number;
  height: number;
  previewMode: PreviewMode;
  previewColor: string;
  previewImage?: string; // base64 data URL
  imagePosition?: { x: number; y: number }; // background-position in percent
  imageSize?: number; // background-size percentage (100 = natural width = container width)
}

export interface EditorState {
  points: PathPoint[];
  canvasSettings: CanvasSettings;
}
