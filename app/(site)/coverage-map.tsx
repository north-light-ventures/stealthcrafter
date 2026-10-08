"use client";

/* =====================================================================
   THE COVERAGE MAP — the public home's picture of the register.

   ACCESSIBILITY POSITION, stated up front because it decides the design:
   this map is a PROGRESSIVE ENHANCEMENT over the table at /countries, and
   the table is the real content. MapLibre paints into a WebGL canvas,
   which no screen reader, find-in-page, translation tool or search
   crawler can read. Rather than pretend otherwise with a scatter of ARIA
   on a canvas, the map is marked aria-hidden, every country it shows is
   published as a real row in a real table one click away, and the
   keyboard route to any country is the select beside it. Nobody gets a
   worse answer for not being able to use the map — they get the same
   answer in a form that was always going to be better.

   No raster basemap. The outlines are ours, the research is ours, and
   there is no third-party tile request on this page at all.
   ===================================================================== */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MlMap, MapMouseEvent } from "maplibre-gl";

type Props = {
  fc: GeoJSON.FeatureCollection;
  fill: Record<string, string>;
  /** Legend rows, already counted on the server. */
  legend: { state: string; glyph: string; word: string; count: number }[];
};

/* Four textures, one per state. "reporting" is deliberately plain: the
   country we can actually read is the one with nothing laid over it, which
   reads correctly even to someone who never sees the legend. */
const TEXTURE: Record<string, "hatch" | "dots" | "cross"> = {
  "built-not-on": "hatch",
  "not-machine-readable": "dots",
  "nothing-found": "cross",
};

/** A small repeating tile, drawn on a canvas so it costs no request and no
    font. Returns null where there is no 2D context to draw into, and the
    caller simply skips the overlay — colour still works, the table still
    carries the word, and nothing breaks. */
function texture(kind: "hatch" | "dots" | "cross"): ImageData | null {
  const S = 16;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d");
  if (!g) return null;
  g.clearRect(0, 0, S, S);

  if (kind === "dots") {
    g.fillStyle = "rgba(255,255,255,0.95)";
    for (const [x, y] of [[4, 4], [12, 12]]) {
      g.beginPath();
      g.arc(x, y, 1.6, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    g.strokeStyle = kind === "cross" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.9)";
    g.lineWidth = kind === "cross" ? 1.2 : 2.6;
    // Draw the wrapped copies too, or the tile seams visibly at the repeat.
    const diag = (dir: 1 | -1) => {
      for (let i = -S; i <= S * 2; i += 8) {
        g.beginPath();
        g.moveTo(i, dir === 1 ? 0 : S);
        g.lineTo(i + S, dir === 1 ? S : 0);
        g.stroke();
      }
    };
    diag(1);
    if (kind === "cross") diag(-1);
  }
  return g.getImageData(0, 0, S, S);
}

/** The frame. Matches the register's remit rather than the whole continent,
    so Europe fills the panel instead of floating in ocean. */
const FRAME: [[number, number], [number, number]] = [
  [-12, 34],
  [31, 68],
];

export default function CoverageMap({ fc, fill, legend }: Props) {
  const router = useRouter();
  const host = useRef<HTMLDivElement | null>(null);
  const map = useRef<MlMap | null>(null);
  const hovered = useRef<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; name: string; word: string; glyph: string; system: string | null } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!host.current || map.current) return;
    let dead = false;

    (async () => {
      try {
        const maplibregl = (await import("maplibre-gl")).default;
        if (dead || !host.current) return;

        const reduced =
          typeof window !== "undefined" &&
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

        const m = new maplibregl.Map({
          container: host.current,
          // No tile sources at all: the style is our own geometry on a flat
          // ground, so the map makes no external request.
          style: {
            version: 8,
            sources: {},
            layers: [{ id: "bg", type: "background", paint: { "background-color": "#0a1722" } }],
          },
          bounds: FRAME,
          fitBoundsOptions: { padding: 12 },
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchZoomRotate: false,
          // The map is decorative-plus; it must never swallow a page scroll.
          scrollZoom: false,
        });
        map.current = m;
        m.touchZoomRotate?.disableRotation();

        m.on("load", () => {
          if (dead) return;
          m.addSource("countries", { type: "geojson", data: fc, promoteId: "iso2" });

          // Context countries first, so a researched neighbour always draws
          // over an unresearched one at a shared border.
          m.addLayer({
            id: "ctx",
            type: "fill",
            source: "countries",
            filter: ["!=", ["get", "researched"], true],
            paint: { "fill-color": "#16222f", "fill-opacity": 0.55 },
          });

          m.addLayer({
            id: "fills",
            type: "fill",
            source: "countries",
            filter: ["==", ["get", "researched"], true],
            paint: {
              "fill-color": [
                "match",
                ["get", "state"],
                "reporting", fill.reporting,
                "built-not-on", fill["built-not-on"],
                "not-machine-readable", fill["not-machine-readable"],
                "nothing-found", fill["nothing-found"],
                "#2b3a4c",
              ],
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false], 0.98,
                0.82,
              ],
            },
          });

          m.addLayer({
            id: "lines",
            type: "line",
            source: "countries",
            paint: {
              "line-color": "#0a1722",
              "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2, 0.7],
            },
          });

          /* COLOUR IS NEVER THE ONLY SIGNAL — the standing rule on this
             project, and Ace is colour-blind. The obvious implementation
             was a symbol layer carrying each state's glyph, but a MapLibre
             style needs a `glyphs` URL to render ANY text, and every such
             URL is an external request — which would put back exactly the
             third-party dependency this map exists without.

             So the second signal is TEXTURE, drawn into the map at runtime
             from a canvas: no font, no network, and a difference that
             survives any form of colour-blindness and a black-and-white
             print. The legend paints the same four textures in CSS. */
          for (const [state, kind] of Object.entries(TEXTURE)) {
            const img = texture(kind);
            if (img && !m.hasImage(`tx-${state}`)) {
              m.addImage(`tx-${state}`, img, { pixelRatio: 2 });
            }
          }

          m.addLayer({
            id: "texture",
            type: "fill",
            source: "countries",
            filter: [
              "all",
              ["==", ["get", "researched"], true],
              ["!=", ["get", "state"], "reporting"],
            ],
            paint: {
              "fill-pattern": ["concat", "tx-", ["get", "state"]],
              "fill-opacity": 0.55,
            },
          });

          const clear = () => {
            if (hovered.current) {
              m.setFeatureState({ source: "countries", id: hovered.current }, { hover: false });
              hovered.current = null;
            }
            setTip(null);
          };

          m.on("mousemove", "fills", (e: MapMouseEvent & { features?: any[] }) => {
            const f = e.features?.[0];
            if (!f) return;
            const id = f.properties?.iso2 as string;
            if (hovered.current !== id) {
              if (hovered.current) m.setFeatureState({ source: "countries", id: hovered.current }, { hover: false });
              hovered.current = id;
              m.setFeatureState({ source: "countries", id }, { hover: true });
            }
            m.getCanvas().style.cursor = "pointer";
            setTip({
              x: e.point.x,
              y: e.point.y,
              name: f.properties?.name,
              word: f.properties?.word,
              glyph: f.properties?.glyph,
              system: f.properties?.system || null,
            });
          });

          m.on("mouseleave", "fills", () => {
            m.getCanvas().style.cursor = "";
            clear();
          });

          m.on("click", "fills", (e: MapMouseEvent & { features?: any[] }) => {
            const id = e.features?.[0]?.properties?.iso2;
            if (id) router.push(`/countries#${id}`);
          });

          if (!reduced) {
            m.easeTo({ padding: { top: 10, bottom: 10, left: 10, right: 10 }, duration: 420 });
          }
        });

        m.on("error", () => setFailed(true));
      } catch {
        // A WebGL-less browser, a blocked worker, anything: the table below is
        // the real content and the page must not lose its headline because a
        // canvas would not start.
        if (!dead) setFailed(true);
      }
    })();

    return () => {
      dead = true;
      map.current?.remove();
      map.current = null;
    };
  }, [fc, fill, router]);

  return (
    <figure className="pb-map">
      <div className="pb-mapbox">
        {failed ? (
          <div className="pb-mapfail">
            <p>
              The map could not start in this browser. Everything it shows is in the table on{" "}
              <a href="/countries">By country</a> — that is the real version of it.
            </p>
          </div>
        ) : (
          <>
            <div className="pb-mapcanvas" ref={host} aria-hidden="true" />
            {tip ? (
              <div
                className="pb-maptip"
                style={{ left: tip.x, top: tip.y }}
                aria-hidden="true"
              >
                <strong>{tip.name}</strong>
                <span>
                  <i>{tip.glyph}</i> {tip.word}
                </span>
                {tip.system ? <em>{tip.system}</em> : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      <figcaption className="pb-maplegend">
        <span className="pb-maplegtitle">Can anyone read this country&rsquo;s civil-protection feed?</span>
        <ul>
          {legend.map((l) => (
            <li key={l.state}>
              <i className={`pb-mapswatch tx-${l.state}`} style={{ background: fill[l.state] }} aria-hidden="true" />
              {l.word}
              <b>{l.count}</b>
            </li>
          ))}
        </ul>
        <p>
          Click a country for its row. Every country on this map is also a line in the table on{" "}
          <a href="/countries">By country</a>, which is the readable version and the one to use with
          a screen reader.
        </p>
      </figcaption>
    </figure>
  );
}
