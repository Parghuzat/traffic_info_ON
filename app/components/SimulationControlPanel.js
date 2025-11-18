"use client";

// SimulationControlPanel - small dev widget for controlling virtual car
import { useMemo, useState } from "react";
import {
  Card,
  CardBody,
  Button,
  Badge,
  Progress,
  Input,
  Label,
} from "reactstrap";
import usePosition from "@/hooks/usePosition";
import { DEFAULT_SIM_PATHS } from "@/hooks/simPaths";

export default function SimulationControlPanel({
  paths: pathsProp,
  durationMs = 300000,
  tickMs = 1000,
  defaultMode = "sim",
}) {
  const paths = pathsProp && pathsProp.length ? pathsProp : DEFAULT_SIM_PATHS;
  const [pathId, setPathId] = useState(paths[0]?.id);
  const selectedPath = useMemo(
    () => paths.find((p) => p.id === pathId) || paths[0],
    [paths, pathId]
  );

  const { position, direction, mode, setMode, simControls } = usePosition(
    defaultMode,
    {
      path: selectedPath,
      durationMs,
      tickMs,
    }
  );

  return (
    <Card className="mb-3">
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <Badge color={mode === "sim" ? "primary" : "secondary"}>
              Mode: {mode}
            </Badge>
            <Button
              size="sm"
              color={mode === "sim" ? "secondary" : "primary"}
              outline
              onClick={() => setMode(mode === "sim" ? "real" : "sim")}
            >
              Toggle Mode
            </Button>
          </div>
          <div>
            <small className="text-muted">
              {position ? (
                <span>
                  Lat: {position.lat.toFixed(5)} | Lng:{" "}
                  {position.lng.toFixed(5)}
                </span>
              ) : (
                <span>No position</span>
              )}
            </small>
          </div>
          <div>
            <Badge color="info">Dir: {direction}</Badge>
          </div>
        </div>

        {/* Path selector (sim mode only) */}
        {mode === "sim" && (
          <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
            <Label className="mb-0" htmlFor="simPathSelect">
              Path:
            </Label>
            <Input
              id="simPathSelect"
              type="select"
              bsSize="sm"
              value={pathId}
              onChange={(e) => setPathId(e.target.value)}
              style={{ maxWidth: 320 }}
            >
              {paths.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Input>
          </div>
        )}

        {/* Controls */}
        {mode === "sim" && simControls && (
          <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
            <Button
              size="sm"
              color="success"
              onClick={simControls.start}
              disabled={simControls.isRunning}
            >
              Start
            </Button>
            <Button
              size="sm"
              color="warning"
              onClick={simControls.pause}
              disabled={!simControls.isRunning}
            >
              Pause
            </Button>
            <Button size="sm" color="secondary" onClick={simControls.reset}>
              Reset
            </Button>
            <div style={{ minWidth: 180 }}>
              <Progress
                value={Math.round((simControls.progress ?? 0) * 100)}
                style={{ height: 6 }}
                color="primary"
              />
            </div>
            <small className="text-muted">
              {Math.round((simControls.progress ?? 0) * 100)}%
            </small>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
