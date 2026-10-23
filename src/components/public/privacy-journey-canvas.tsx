"use client";

import { useEffect, useRef, useState } from "react";
import type { MotionValue } from "motion/react";
import type { DemoPurposes } from "@/lib/privacy-learning-demo";
import { createPrivacyModels } from "./privacy-scene-models";

/** On-demand Three.js scene: scroll/interaction drives frames; no idle animation loop. */
export default function PrivacyJourneyCanvas({ progress, purposes, historical, chapter, inspectedObject, guardianRequired, onInspect }: { progress: MotionValue<number>; purposes: DemoPurposes; historical: boolean; chapter:string; inspectedObject:string|null; guardianRequired:boolean; onInspect:(id:string|null)=>void }) {
  const host = useRef<HTMLDivElement>(null);
  const controls = useRef<((progress: number, purposes: DemoPurposes, historical: boolean, chapter:string, inspectedObject:string|null, guardianRequired:boolean) => void) | null>(null);
  const latest = useRef({ purposes, historical, chapter, inspectedObject, guardianRequired, onInspect });
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { latest.current = { purposes, historical, chapter, inspectedObject, guardianRequired, onInspect }; controls.current?.(progress.get(), purposes, historical,chapter,inspectedObject,guardianRequired); }, [purposes, historical, progress, chapter, inspectedObject, guardianRequired,onInspect]);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    async function mount() {
      const THREE = await import("three");
      const container = host.current;
      if (!container || disposed) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.25 : 1.5));
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=.9;
      renderer.domElement.setAttribute("aria-hidden", "true");
      container.appendChild(renderer.domElement);
      cleanup=()=>{renderer.dispose();renderer.domElement.remove();};
      const scene = new THREE.Scene();
      const {RoomEnvironment}=await import("three/examples/jsm/environments/RoomEnvironment.js");
      if(disposed){cleanup?.();return;}
      const studio=new RoomEnvironment();
      const pmrem=new THREE.PMREMGenerator(renderer);
      const reflection=pmrem.fromScene(studio,.04);
      scene.environment=reflection.texture;
      scene.environmentIntensity=.65;
      studio.dispose();pmrem.dispose();
      const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
      const shapes: import("three").BufferGeometry[] = [];
      const materials: import("three").Material[] = [];
      const textures: import("three").Texture[]=[];
      cleanup=()=>{shapes.forEach(shape=>shape.dispose());materials.forEach(value=>value.dispose());textures.forEach(texture=>texture.dispose());reflection.dispose();renderer.dispose();renderer.domElement.remove();controls.current=null;};
      const geometry = <T extends import("three").BufferGeometry>(shape: T) => { shapes.push(shape); return shape; };
      const material = <T extends import("three").Material>(value: T) => { materials.push(value); return value; };
      const lettering=(text:string,width:number,height:number)=>{
        const surface=document.createElement("canvas");surface.width=512;surface.height=128;
        const context=surface.getContext("2d");
        if(context){context.font=`500 64px ${getComputedStyle(container).fontFamily}`;context.textAlign="center";context.textBaseline="middle";context.fillStyle="#23382c";context.fillText(text,256,64,480);}
        const texture=new THREE.CanvasTexture(surface);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);
        return new THREE.Mesh(geometry(new THREE.PlaneGeometry(width,height)),material(new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false})));
      };
      scene.add(new THREE.HemisphereLight(0xeef6ce, 0x22362e, 1.3));
      const key = new THREE.DirectionalLight(0xf6eed6, 2); key.position.set(-3, 5, 7); scene.add(key);
      const fill = new THREE.DirectionalLight(0x86bca0, 1); fill.position.set(4, -1, 2); scene.add(fill);
      const orb = new THREE.Group();
      const core = new THREE.Mesh(geometry(new THREE.IcosahedronGeometry(.9, 3)), material(new THREE.MeshStandardMaterial({ color: 0xd9e9bb, roughness: .27, metalness: .55 })));
      orb.add(core);
      const orbitMaterial = material(new THREE.MeshStandardMaterial({ color: 0x8cac85, roughness: .5, metalness: .45 }));
      const rings: import("three").Mesh[] = [];
      for (let index = 0; index < 3; index++) {
        const ring = new THREE.Mesh(geometry(new THREE.TorusGeometry(1.24 + index * .16, .012, 6, 100)), orbitMaterial);
        ring.rotation.set(index * .7, .4 + index * .8, .2); orb.add(ring); rings.push(ring);
      }
      scene.add(orb);
      // A quiet crystalline structure emerges only as the story reaches evidence.
      const structure = new THREE.LineSegments(geometry(new THREE.EdgesGeometry(geometry(new THREE.IcosahedronGeometry(.98, 1)))),material(new THREE.LineBasicMaterial({color:0xe5edc8,transparent:true,opacity:0})));
      orb.add(structure);
      const notice=new THREE.Group();
      const leaves=[-1,1].map(side=>{
        const hinge=new THREE.Group();
        const page=new THREE.Mesh(geometry(new THREE.BoxGeometry(1.12,1.65,.045)),material(new THREE.MeshStandardMaterial({color:0xe6edcf,roughness:.8,metalness:.05})));
        page.position.x=side*.56;hinge.add(page);
        const heading=lettering(side === -1 ? "Your data" : "The purpose",.92,.24);heading.position.set(0,.62,.035);page.add(heading);
        for(let row=0;row<4;row++) {
          const line=new THREE.Mesh(geometry(new THREE.BoxGeometry(row === 0 ? .65 : .82,.025,.01)),material(new THREE.MeshBasicMaterial({color:0x647d5a})));
          line.position.set(side*.56,.45-row*.24,.03);hinge.add(line);
        }
        notice.add(hinge);return hinge;
      });
      notice.position.z=1.2;scene.add(notice);
      // Bookbinding: layered paper edges, leather covers, spine, gold corners and ribbon.
      leaves.forEach((hinge,index)=>{
        const side=index ? 1 : -1;
        const leather=new THREE.Mesh(geometry(new THREE.BoxGeometry(1.18,1.74,.085)),material(new THREE.MeshStandardMaterial({color:0x456447,roughness:.7,metalness:.08})));
        leather.position.set(side*.56,0,-.09);hinge.add(leather);
        for(let sheet=0;sheet<5;sheet++){
          const paper=new THREE.Mesh(geometry(new THREE.BoxGeometry(1.09,1.61,.007)),material(new THREE.MeshStandardMaterial({color:sheet%2 ? 0xc3cfb1 : 0xe9edda,roughness:.85})));
          paper.position.set(side*.56,0,-.035-sheet*.009);hinge.add(paper);
        }
        for(const y of [-.76,.76]){
          const corner=new THREE.Mesh(geometry(new THREE.BoxGeometry(.14,.08,.015)),material(new THREE.MeshStandardMaterial({color:0xc9b48a,metalness:.65,roughness:.3})));
          corner.position.set(side*1.08,y,.033);hinge.add(corner);
        }
      });
      const spine=new THREE.Mesh(geometry(new THREE.CylinderGeometry(.075,.075,1.77,20)),material(new THREE.MeshStandardMaterial({color:0x456447,roughness:.7})));notice.add(spine);
      const ribbon=new THREE.Mesh(geometry(new THREE.BoxGeometry(.09,1.95,.013)),material(new THREE.MeshStandardMaterial({color:0xbaaa7d,roughness:.65})));ribbon.position.set(.15,-.12,-.01);notice.add(ribbon);
      const evidenceRecord=new THREE.Group();
      const evidenceNodes=[new THREE.Vector3(-.9,.7,.2),new THREE.Vector3(.8,.1,.45),new THREE.Vector3(-.5,-.8,.7)].map((position,index)=>{
        const node=new THREE.Mesh(geometry(new THREE.BoxGeometry(.85,.5,.08)),material(new THREE.MeshStandardMaterial({color:index === 1 ? 0x9eb77b : 0x95b68d,roughness:.55,metalness:.2,emissive:0x000000})));
        const heading=lettering(["Notice","Choice","Time"][index],.7,.2);heading.position.z=.05;node.add(heading);
        node.position.copy(position);evidenceRecord.add(node);return node;
      });
      const connectors=new THREE.Line(geometry(new THREE.BufferGeometry().setFromPoints(evidenceNodes.map(node=>node.position))),material(new THREE.LineBasicMaterial({color:0xd9e9bb})));
      evidenceRecord.add(connectors);evidenceRecord.position.z=1.4;scene.add(evidenceRecord);
      const archive=new THREE.Group();evidenceRecord.add(archive);
      const backing=new THREE.Mesh(geometry(new THREE.BoxGeometry(2.7,2.65,.16)),material(new THREE.MeshStandardMaterial({color:0x3b5740,roughness:.45,metalness:.3})));backing.position.set(0,0,-.32);archive.add(backing);
      for(let sheet=0;sheet<6;sheet++){
        const document=new THREE.Mesh(geometry(new THREE.BoxGeometry(2.4,2.4,.025)),material(new THREE.MeshStandardMaterial({color:sheet%2 ? 0xc2cdb0 : 0xe7ead5,roughness:.8})));
        document.position.set(-.04+sheet*.015,-.02+sheet*.018,-.2+sheet*.02);archive.add(document);
      }
      for(const x of [-1.03,1.03])for(const y of [-1.04,1.04]){
        const rivet=new THREE.Mesh(geometry(new THREE.SphereGeometry(.045,12,8)),material(new THREE.MeshStandardMaterial({color:0xc9b48a,metalness:.7,roughness:.3})));rivet.position.set(x,y,-.04);archive.add(rivet);
      }
      const seal=new THREE.Mesh(geometry(new THREE.CylinderGeometry(.2,.2,.075,48)),material(new THREE.MeshStandardMaterial({color:0xbba980,roughness:.35,metalness:.55})));seal.rotation.x=Math.PI/2;seal.position.set(.88,-.85,.04);archive.add(seal);
      const sealMark=lettering("Example",.32,.1);sealMark.position.set(.88,-.85,.085);archive.add(sealMark);
      const guardian=new THREE.Group();
      for(const side of [-1,1]) {
        const post=new THREE.Mesh(geometry(new THREE.BoxGeometry(.09,2.4,.09)),material(new THREE.MeshStandardMaterial({color:0xa9c69b,roughness:.55})));
        post.position.set(side*1.25,0,0);guardian.add(post);
      }
      const checkpoint=new THREE.Mesh(geometry(new THREE.BoxGeometry(2.5,.09,.09)),material(new THREE.MeshStandardMaterial({color:0xe6cfa4,roughness:.55})));
      guardian.add(checkpoint);guardian.position.z=1.3;scene.add(guardian);
      const arch=new THREE.CubicBezierCurve3(new THREE.Vector3(-1.25,1.15,0),new THREE.Vector3(-1.25,2.05,0),new THREE.Vector3(1.25,2.05,0),new THREE.Vector3(1.25,1.15,0));
      guardian.add(new THREE.Mesh(geometry(new THREE.TubeGeometry(arch,40,.07,10,false)),material(new THREE.MeshStandardMaterial({color:0xc9b48a,roughness:.3,metalness:.7}))));
      const base=new THREE.Mesh(geometry(new THREE.CylinderGeometry(1.68,1.8,.14,64)),material(new THREE.MeshStandardMaterial({color:0x456447,roughness:.55,metalness:.15})));base.position.set(0,-1.28,0);base.scale.z=.55;guardian.add(base);
      const figures=[-.45,.45].map((x,index)=>{
        const person=new THREE.Group();
        const scale=index ? .62 : 1;
        const body=new THREE.Mesh(geometry(new THREE.CapsuleGeometry(.17,.5,6,16)),material(new THREE.MeshStandardMaterial({color:index ? 0xe6d6b3 : 0xc4d6aa,roughness:.45,metalness:.2})));body.position.y=.34;person.add(body);
        const head=new THREE.Mesh(geometry(new THREE.SphereGeometry(.18,24,16)),body.material);head.position.y=.98;person.add(head);
        for(const side of [-1,1]){const leg=new THREE.Mesh(geometry(new THREE.CapsuleGeometry(.065,.32,4,12)),body.material);leg.position.set(side*.09,-.12,0);person.add(leg);}
        person.scale.setScalar(scale);person.position.set(x,-.81,.18);guardian.add(person);return person;
      });
      const guardianLock=new THREE.Mesh(geometry(new THREE.BoxGeometry(.32,.3,.09)),material(new THREE.MeshStandardMaterial({color:0xc9b48a,roughness:.3,metalness:.7})));guardianLock.position.set(0,.93,.14);guardian.add(guardianLock);
      const shackle=new THREE.Mesh(geometry(new THREE.TorusGeometry(.105,.024,8,32,Math.PI)),guardianLock.material);shackle.position.set(0,1.08,.14);guardian.add(shackle);
      const custom=["Purpose","Consent","Withdrawal","Responsibility"].includes(latest.current.chapter) ? createPrivacyModels({THREE,geometry,material,lettering}) : null;
      if(custom)Object.values(custom.groups).forEach(group=>scene.add(group));
      const forms={notice:0,evidence:0,guardian:0,noticeTarget:0,evidenceTarget:0,guardianTarget:0,gate:0,gateTarget:0};
      const particleCount=42;
      const particlePositions=new Float32Array(particleCount*3);
      const particleGeometry=geometry(new THREE.BufferGeometry());
      particleGeometry.setAttribute("position",new THREE.BufferAttribute(particlePositions,3));
      const particles=new THREE.Points(particleGeometry,material(new THREE.PointsMaterial({color:0xc9dfb1,size:.035,transparent:true,opacity:.62,depthWrite:false})));
      particles.frustumCulled=false;
      scene.add(particles);
      const branches = [new THREE.Vector3(2.3, 1.8, .4), new THREE.Vector3(2.3, -1.8, .4)].map((end, index) => {
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(.9, 0, .7), new THREE.Vector3(1.4, end.y, .6), end);
        const line = new THREE.Mesh(geometry(new THREE.TubeGeometry(curve, 45, .025, 6, false)), material(new THREE.MeshBasicMaterial({ color: index === 0 ? 0xcee8a9 : 0xe6cfa4, transparent: true, opacity: .85 })));
        const node = new THREE.Mesh(geometry(new THREE.SphereGeometry(.08, 12, 10)), material(new THREE.MeshBasicMaterial({ color: index === 0 ? 0xcee8a9 : 0xe6cfa4 }))); node.position.copy(end);
        const packets=Array.from({length:5},()=>{const packet=new THREE.Mesh(geometry(new THREE.SphereGeometry(.035,6,5)),material(new THREE.MeshBasicMaterial({color:index === 0 ? 0xcee8a9 : 0xe6cfa4})));scene.add(packet);return packet;});
        scene.add(line, node); return { line, node, curve, packets, amount:0, target:0, travel:0 };
      });
      let frame = 0, visible = true, contextLost=false, previousTime=0;
      const tilt={x:0,y:0,targetX:0,targetY:0};
      const cameraBase=new THREE.Vector3();
      // Short state transitions may request extra frames; there is no idle loop.
      const draw = () => { if (frame || disposed || !visible || document.hidden || contextLost) return; frame = requestAnimationFrame(time => {
        frame = 0; if(disposed || !visible || document.hidden || contextLost)return;
        const delta=previousTime ? Math.min(64,time-previousTime) : 16; previousTime=time;
        let settling=false;
        for(const name of ["notice","evidence","guardian","gate"] as const) {
          const target=forms[`${name}Target`];
          forms[name]+=(target-forms[name])*(1-Math.exp(-delta/95));
          if(Math.abs(target-forms[name])<.003)forms[name]=target;else settling=true;
        }
        const overview=latest.current.chapter === "Overview";
        orb.visible=overview;
        notice.visible=forms.notice>.003;notice.scale.setScalar((.25+forms.notice*.75)*(overview ? .58 : 1));
        leaves.forEach((leaf,index)=>leaf.rotation.y=(index === 0 ? -1 : 1)*(1-forms.notice)*Math.PI*.5);
        const responsibility=latest.current.chapter === "Responsibility";
        core.scale.setScalar(responsibility ? .2 : overview ? 1 : 1-Math.max(forms.notice,forms.evidence)*.68);
        rings.forEach(ring=>ring.visible=!responsibility && (overview || Math.max(forms.notice,forms.evidence)<.5));
        evidenceRecord.visible=forms.evidence>.003;
        evidenceRecord.scale.setScalar((.25+forms.evidence*.75)*(overview ? .65 : 1));
        evidenceNodes.forEach((node,index)=>node.position.z=.2+index*.25+(1-forms.evidence)*(index-1)*1.2);
        evidenceNodes.forEach((node,index)=>connectors.geometry.attributes.position.setXYZ(index,node.position.x,node.position.y,node.position.z));
        connectors.geometry.attributes.position.needsUpdate=true;
        guardian.visible=forms.guardian>.003;guardian.scale.setScalar((.3+forms.guardian*.7)*(overview ? .35 : 1));
        checkpoint.rotation.z=-forms.gate*Math.PI*.5;
        guardianLock.visible=shackle.visible=forms.gate<.7;
        figures[1].position.x=.45+forms.gate*.15;
        custom?.update(progress.get(),latest.current.purposes,latest.current.historical,forms.gate,branches.map(branch=>branch.amount));
        branches.forEach(branch=>{
          branch.amount+=(branch.target-branch.amount)*(1-Math.exp(-delta/65));
          if(Math.abs(branch.target-branch.amount)<.003)branch.amount=branch.target;else settling=true;
          const showRoutes=latest.current.chapter === "Consent";
          branch.line.visible=branch.node.visible=showRoutes && branch.amount>.003;
          const count=branch.line.geometry.index?.count ?? 0;
          branch.line.geometry.setDrawRange(0,Math.floor(count*branch.amount/6)*6);
          branch.node.position.copy(branch.curve.getPoint(branch.amount));
          branch.node.scale.setScalar(branch.amount);
          branch.travel+=delta/1100;
          branch.packets.forEach((packet,index)=>{
            packet.visible=showRoutes && branch.amount>.03 && (settling || branch.travel<1.2);
            const t=branch.target === 0 ? branch.amount*(1-(index/5+branch.travel)%1) : branch.amount*((index/5+branch.travel)%1);
            packet.position.copy(branch.curve.getPoint(t));
          });
          if(showRoutes && branch.amount>.03 && branch.travel<1.2)settling=true;
        });
        for(const axis of ["x","y"] as const){const target=axis === "x" ? tilt.targetX : tilt.targetY;tilt[axis]+=(target-tilt[axis])*(1-Math.exp(-delta/110));if(Math.abs(target-tilt[axis])>.002)settling=true;}
        camera.position.copy(cameraBase);camera.position.x+=tilt.x*.38;camera.position.y+=tilt.y*.26;camera.lookAt(0,.1,-.3);
        renderer.render(scene,camera);
        if(settling)draw();else previousTime=0;
      }); };
      const update = (value: number, allowed: DemoPurposes, past: boolean, currentChapter:string, inspected:string|null, needsGuardian:boolean) => {
        const p = Math.max(0, Math.min(1, value));
        const sweep=Math.sin(p*Math.PI*7);
        orb.position.set(0, .08*sweep, .8+.3*sweep);
        orb.scale.setScalar(1+.08*sweep);
        orb.rotation.set(p * 1.3, p * Math.PI * 2, p * .35);
        // Absolute scroll-based poses: each ring turns on its own axis, and
        // scrolling back retraces the pose without a free-running animation.
        rings.forEach((ring,index)=>{
          const direction=index%2 === 0 ? 1 : -1;
          const turn=p*Math.PI*2*(1.5+index*.6)*direction;
          ring.rotation.set(index*.7+Math.sin(turn)*.65,.4+index*.8+turn,.2+turn*.4);
        });
        const evidence=THREE.MathUtils.smoothstep(p,.8,.97);
        structure.rotation.set(p*.8,-p*.6,p*.35);
        (structure.material as import("three").LineBasicMaterial).opacity=evidence*.45;
        (core.material as import("three").MeshStandardMaterial).roughness=.27+evidence*.3;
        for(let index=0;index<particleCount;index++) {
          const phase=index*.618+p*Math.PI*5;
          const fraction=index/(particleCount-1);
          particlePositions[index*3]=Math.sin(phase)*(.4+fraction*.75);
          particlePositions[index*3+1]=-1.2-fraction*1.7+.18*Math.sin(phase*1.3);
          particlePositions[index*3+2]=-.6+.3*Math.cos(phase);
        }
        particleGeometry.attributes.position.needsUpdate=true;
        key.position.set(-3+Math.sin(p*Math.PI*2)*2,5,7);
        const overview=currentChapter === "Overview";
        cameraBase.set(.3*Math.sin(p*Math.PI*2), .5+.12*sweep, (overview ? 10 : 7.5)-.65*sweep);
        camera.position.copy(cameraBase);
        camera.lookAt(orb.position.x * .3, .1, -.3);
        notice.position.set(overview ? -1.9 : 0,overview ? 1.25 : 0,overview ? .2 : 1.2);
        evidenceRecord.position.set(overview ? 1.8 : 0,overview ? -1.2 : 0,overview ? .2 : 1.4);
        guardian.position.set(overview ? 2 : 0,overview ? 1.35 : 0,overview ? 0 : 1.3);
        forms.noticeTarget=currentChapter === "Notice" || overview ? 1 : 0;
        forms.evidenceTarget=currentChapter === "Evidence" || overview ? 1 : 0;
        forms.guardianTarget=currentChapter === "Children" || overview ? 1 : 0;
        if(custom)Object.entries(custom.groups).forEach(([name,group])=>group.visible=name === currentChapter);
        particles.visible=currentChapter === "Overview";
        archive.visible=!overview;
        notice.rotation.set(overview ? 0 : .12,overview ? 0 : -.16,overview ? 0 : -.03);
        evidenceRecord.rotation.set(overview ? 0 : .1,overview ? 0 : -.18,0);
        guardian.scale.setScalar(overview ? .35 : .9);
        forms.gateTarget=needsGuardian ? 0 : 1;
        leaves.forEach((leaf,index)=>((leaf.children[0] as import("three").Mesh).material as import("three").MeshStandardMaterial).color.setHex(inspected === ["notice-data","notice-purpose"][index] || inspected === "notice-rights" ? 0xd0e6a9 : 0xe6edcf));
        (checkpoint.material as import("three").MeshStandardMaterial).emissive.setHex(inspected === "guardian" ? 0x476332 : 0);
        evidenceNodes.forEach((node,index)=>(node.material as import("three").MeshStandardMaterial).emissive.setHex(inspected === ["evidence-notice","evidence-decision","evidence-time"][index] ? 0x476332 : 0));
        branches.forEach((branch,index) => { const target=(index === 0 ? allowed.analytics : allowed.advertising) ? 1 : 0; if(target !== branch.target)branch.travel=0;branch.target=target; (branch.line.material as import("three").MeshBasicMaterial).opacity = past ? .28 : .85; });
        draw();
      };
      controls.current = update;
      const refresh=(value:number)=>{const state=latest.current;update(value,state.purposes,state.historical,state.chapter,state.inspectedObject,state.guardianRequired);};
      const raycaster=new THREE.Raycaster();
      const pointer=new THREE.Vector2();
      const inspect=(event:PointerEvent)=>{
        const rect=renderer.domElement.getBoundingClientRect();
        pointer.set((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
        raycaster.setFromCamera(pointer,camera);
        const stage=latest.current.chapter;
        const targets=stage === "Overview" ? [...leaves.map(leaf=>leaf.children[0]),...evidenceNodes,...guardian.children] : stage === "Notice" && notice.visible ? leaves.map(leaf=>leaf.children[0]) : stage === "Evidence" && evidenceRecord.visible ? evidenceNodes : stage === "Children" && guardian.visible ? guardian.children : [];
        const hit=raycaster.intersectObjects(targets,false)[0];
        if(!hit)return;
        const index=targets.indexOf(hit.object);
        latest.current.onInspect(stage === "Overview" ? (["notice-data","notice-purpose","evidence-notice","evidence-decision","evidence-time"][index] ?? "guardian") : stage === "Notice" ? ["notice-data","notice-purpose"][index] : stage === "Evidence" ? ["evidence-notice","evidence-decision","evidence-time"][index] : "guardian");
      };
      const lean=(event:PointerEvent)=>{if(event.pointerType === "touch")return;const rect=renderer.domElement.getBoundingClientRect();tilt.targetX=(event.clientX-rect.left)/rect.width*2-1;tilt.targetY=1-(event.clientY-rect.top)/rect.height*2;draw();};
      const resetLean=()=>{tilt.targetX=tilt.targetY=0;draw();};
      renderer.domElement.addEventListener("pointermove",lean);
      renderer.domElement.addEventListener("pointerleave",resetLean);
      renderer.domElement.addEventListener("pointerup",inspect);
      const unsubscribe = progress.on("change", refresh);
      const resize = () => { const {width,height} = container.getBoundingClientRect(); if (!width || !height) return; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.25 : 1.5)); renderer.setSize(width,height); refresh(progress.get()); };
      const size = new ResizeObserver(resize); size.observe(container);
      const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) draw(); }); intersection.observe(container);
      const visibility = () => { if (!document.hidden) draw(); }; document.addEventListener("visibilitychange",visibility);
      const lost = (event: Event) => { event.preventDefault(); contextLost=true; visible=false; cancelAnimationFrame(frame); frame=0; setUnavailable(true); }; renderer.domElement.addEventListener("webglcontextlost",lost);
      cleanup = () => { unsubscribe(); cancelAnimationFrame(frame); size.disconnect(); intersection.disconnect(); document.removeEventListener("visibilitychange",visibility); renderer.domElement.removeEventListener("webglcontextlost",lost); renderer.domElement.removeEventListener("pointerup",inspect); renderer.domElement.removeEventListener("pointermove",lean); renderer.domElement.removeEventListener("pointerleave",resetLean); shapes.forEach(shape=>shape.dispose()); materials.forEach(value=>value.dispose()); textures.forEach(texture=>texture.dispose()); reflection.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); controls.current=null; };
      resize();
    }
    void mount().catch(()=>{ cleanup?.(); cleanup=undefined; if (!disposed) setUnavailable(true); });
    return () => { disposed=true; cleanup?.(); };
  }, [progress]);
  return <div className={`journey-webgl ${unavailable ? "is-unavailable" : ""}`} data-model={chapter} ref={host} aria-hidden="true"/>;
}
