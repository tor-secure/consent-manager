"use client";

import { useEffect, useRef, useState } from "react";
import type { GraphEdge, GraphNode } from "./privacy-graph-explorer";

export default function TwinTopology({ nodes, edges, onSelect }: { nodes: GraphNode[]; edges: GraphEdge[]; onSelect: (node: GraphNode) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const selection = useRef(onSelect);
  const commands = useRef<{ reset: () => void; rotate: (direction: number) => void; zoom: (factor: number) => void } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { selection.current = onSelect; }, [onSelect]);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    async function mount() {
      const [THREE, { OrbitControls }] = await Promise.all([import("three"), import("three/examples/jsm/controls/OrbitControls.js")]);
      const container = host.current;
      if (!container || disposed) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.domElement.setAttribute("aria-label", "Interactive configured dependency topology. Use the controls below or drag to rotate.");
      renderer.domElement.setAttribute("role", "img");
      container.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
      camera.position.set(4, 5, 23);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false; controls.minDistance = 10; controls.maxDistance = 60;
      controls.target.set(0, 0, 0); controls.update(); controls.saveState();
      const geometry = new THREE.SphereGeometry(0.28, 14, 10);
      const materials: import("three").Material[] = [];
      const geometries: import("three").BufferGeometry[] = [geometry];
      const textures: import("three").Texture[] = [];
      const points = new Map<string, import("three").Vector3>();
      const meshes: import("three").Mesh[] = [];
      const groups: Record<string, number> = { purpose: -7, vendor: 0, tracker: 7 };
      const counts: Record<string, number> = {};
      const visibleNodes = nodes.slice(0, 80);
      for (const node of visibleNodes) counts[node.type] = (counts[node.type] ?? 0) + 1;
      const indexes: Record<string, number> = {};
      visibleNodes.forEach((node) => {
        const index = indexes[node.type] ?? 0; indexes[node.type] = index + 1;
        const rows = Math.ceil(counts[node.type] / 3);
        const point = new THREE.Vector3(groups[node.type] ?? 0, (rows - 1) * 0.55 - Math.floor(index / 3) * 1.1, (index % 3 - 1) * 3);
        points.set(node.id, point);
        const color = node.type === "purpose" ? 0x8edccb : node.type === "vendor" ? 0xa9c9ee : 0xe9c685;
        const material = new THREE.MeshBasicMaterial({ color }); materials.push(material);
        const mesh = new THREE.Mesh(geometry, material); mesh.position.copy(point); mesh.userData.node = node; meshes.push(mesh); scene.add(mesh);
        const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.font = "36px system-ui"; ctx.fillStyle = "#ecf3f7"; ctx.fillText(node.label.length > 23 ? `${node.label.slice(0, 22)}…` : node.label, 10, 42, 492);
          const texture = new THREE.CanvasTexture(canvas); textures.push(texture);
          const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }); materials.push(spriteMaterial);
          const sprite = new THREE.Sprite(spriteMaterial); sprite.position.copy(point).add(new THREE.Vector3(1.5, 0.65, 0)); sprite.scale.set(6, 0.75, 1); scene.add(sprite);
        }
      });
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x497a8b, transparent: true, opacity: 0.5 }); materials.push(lineMaterial);
      edges.slice(0, 300).forEach((edge) => { const source = points.get(edge.source), target = points.get(edge.target); if (!source || !target) return; const shape = new THREE.BufferGeometry().setFromPoints([source, target]); geometries.push(shape); scene.add(new THREE.Line(shape, lineMaterial)); });
      let visible = true, frame = 0;
      const render = () => { if (disposed || !visible || document.hidden || frame) return; frame = requestAnimationFrame(() => { frame = 0; if (!disposed) renderer.render(scene, camera); }); };
      const resize = () => { const { width, height } = container.getBoundingClientRect(); if (!width || !height) return; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); render(); };
      const observer = new ResizeObserver(resize); observer.observe(container);
      const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) render(); }); intersection.observe(container);
      const raycaster = new THREE.Raycaster();
      let downX = 0, downY = 0;
      const pointerDown = (event: PointerEvent) => { downX = event.clientX; downY = event.clientY; };
      const pointerUp = (event: PointerEvent) => { if (Math.hypot(event.clientX - downX, event.clientY - downY) > 5) return; const rect = renderer.domElement.getBoundingClientRect(); raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera); const hit = raycaster.intersectObjects(meshes)[0]; if (hit) selection.current(hit.object.userData.node as GraphNode); };
      const contextLost = (event: Event) => { event.preventDefault(); setError("The 3D view is unavailable. Use the dependency map to inspect this data."); };
      renderer.domElement.addEventListener("pointerdown", pointerDown); renderer.domElement.addEventListener("pointerup", pointerUp); renderer.domElement.addEventListener("webglcontextlost", contextLost);
      controls.addEventListener("change", render); document.addEventListener("visibilitychange", render);
      commands.current = { reset: () => { controls.reset(); render(); }, rotate: (direction) => { camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * 0.2); camera.lookAt(controls.target); controls.update(); render(); }, zoom: (factor) => { const distance = camera.position.length() * factor; if (distance >= 10 && distance <= 60) camera.position.multiplyScalar(factor); controls.update(); render(); } };
      resize();
      cleanup = () => { cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); document.removeEventListener("visibilitychange", render); controls.dispose(); renderer.domElement.removeEventListener("pointerdown", pointerDown); renderer.domElement.removeEventListener("pointerup", pointerUp); renderer.domElement.removeEventListener("webglcontextlost", contextLost); geometries.forEach((item) => item.dispose()); materials.forEach((item) => item.dispose()); textures.forEach((item) => item.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); commands.current = null; };
    }
    void mount().catch(() => { if (!disposed) setError("Your browser could not start the 3D view. The dependency map contains the same information."); });
    return () => { disposed = true; cleanup?.(); };
  }, [nodes, edges]);
  return <div className="space-y-3">
    <div className="twin-stage"><div ref={host} className="h-full w-full" />{error && <p role="status" className="absolute inset-x-4 top-4 rounded-lg bg-white p-4 text-sm text-slate-800">{error}</p>}</div>
    <div className="flex flex-wrap items-center gap-2"><button className="btn btn-secondary btn-sm" onClick={() => commands.current?.rotate(-1)}>Rotate left</button><button className="btn btn-secondary btn-sm" onClick={() => commands.current?.rotate(1)}>Rotate right</button><button className="btn btn-secondary btn-sm" onClick={() => commands.current?.zoom(0.85)}>Zoom in</button><button className="btn btn-secondary btn-sm" onClick={() => commands.current?.zoom(1.15)}>Zoom out</button><button className="btn btn-ghost btn-sm" onClick={() => commands.current?.reset()}>Reset view</button><span className="text-xs text-[var(--muted-foreground)]">Up to 80 configured entities · no automatic rotation</span></div>
  </div>;
}
