import type * as Three from "three";
import type { DemoPurposes } from "@/lib/privacy-learning-demo";

type Studio = {
  THREE: typeof Three;
  geometry: <T extends Three.BufferGeometry>(shape:T)=>T;
  material: <T extends Three.Material>(value:T)=>T;
  lettering:(text:string,width:number,height:number)=>Three.Mesh;
};

/** Authored, topic-specific objects. All allocations belong to the renderer's disposal lists. */
export function createPrivacyModels({THREE,geometry,material,lettering}:Studio) {
  const enamel=material(new THREE.MeshPhysicalMaterial({color:0xbad2a4,roughness:.3,metalness:.15,clearcoat:.7}));
  const dark=material(new THREE.MeshStandardMaterial({color:0x344f3e,roughness:.48,metalness:.25}));
  const brass=material(new THREE.MeshStandardMaterial({color:0xc9b48a,roughness:.28,metalness:.75}));
  const ivory=material(new THREE.MeshStandardMaterial({color:0xe6e8cf,roughness:.72,metalness:.05}));
  const rubber=material(new THREE.MeshStandardMaterial({color:0x26352c,roughness:.85}));
  const mesh=(shape:Three.BufferGeometry,finish:Three.Material,parent:Three.Object3D,x=0,y=0,z=0)=>{const node=new THREE.Mesh(geometry(shape),finish);node.position.set(x,y,z);parent.add(node);return node;};
  const box=(w:number,h:number,d:number,r=.08)=>{
    const shape=new THREE.Shape();const x=-w/2,y=-h/2;
    shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
    return new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:8});
  };
  const label=(text:string,w:number,h:number,parent:Three.Object3D,x:number,y:number,z:number)=>{const node=lettering(text,w,h);node.position.set(x,y,z);parent.add(node);return node;};
  const screws=(parent:Three.Object3D,w:number,h:number,z:number)=>{
    for(const x of [-w/2,w/2])for(const y of [-h/2,h/2]){
      const screw=mesh(new THREE.CylinderGeometry(.045,.045,.025,12),brass,parent,x,y,z);screw.rotation.x=Math.PI/2;
      mesh(new THREE.BoxGeometry(.04,.009,.01),dark,parent,x,y,z+.018);
    }
  };
  const curve=(points:Three.Vector3[],radius:number,finish:Three.Material,parent:Three.Object3D)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),48,radius,8,false),finish,parent);
  const cylinder=(radius:number,height:number,finish:Three.Material,parent:Three.Object3D,x:number,y:number,z:number)=>{const node=mesh(new THREE.CylinderGeometry(radius,radius,height,64),finish,parent,x,y,z);node.rotation.x=Math.PI/2;return node;};

  // Purpose: a machined compass routes data toward a named, bounded scope.
  const purpose=new THREE.Group();
  cylinder(1.28,.16,dark,purpose,0,0,0);
  cylinder(1.2,.12,brass,purpose,0,0,.12);
  cylinder(1.12,.07,ivory,purpose,0,0,.23);
  for(let tick=0;tick<48;tick++){
    const angle=tick*Math.PI/24;
    const mark=mesh(new THREE.BoxGeometry(.014,tick%4===0 ? .12 : .05,.013),dark,purpose,Math.sin(angle)*1.02,Math.cos(angle)*1.02,.29);mark.rotation.z=-angle;
  }
  const needle=new THREE.Group();purpose.add(needle);needle.position.z=.33;
  const arrow=new THREE.Shape();arrow.moveTo(0,.85);arrow.lineTo(.15,0);arrow.lineTo(0,-.64);arrow.lineTo(-.15,0);arrow.closePath();
  mesh(new THREE.ExtrudeGeometry(arrow,{depth:.045,bevelEnabled:true,bevelSegments:2,bevelSize:.015,bevelThickness:.015}),enamel,needle);
  cylinder(.105,.06,brass,purpose,0,0,.43);
  label("Purpose",.75,.2,purpose,0,.63,.32);label("Limited scope",1.1,.22,purpose,0,-.76,.32);
  const dataTiles=Array.from({length:5},(_,index)=>{
    const tile=new THREE.Group();purpose.add(tile);
    mesh(box(.33,.36,.09,.06),index%2 ? enamel : brass,tile);
    mesh(new THREE.BoxGeometry(.17,.02,.01),dark,tile,0,.06,.12);
    mesh(new THREE.BoxGeometry(.12,.02,.01),dark,tile,0,-.02,.12);
    return tile;
  });
  purpose.rotation.set(.15,-.22,-.08);purpose.position.z=.8;

  // Consent: two independent controls; indicators reflect recorded choices only.
  const consent=new THREE.Group();
  mesh(box(2.7,1.8,.22,.2),dark,consent);
  mesh(box(2.54,1.64,.045,.16),ivory,consent,0,0,.25);
  screws(consent,2.22,1.32,.32);
  label("Purpose controls",1.75,.23,consent,0,.56,.33);
  const toggles=["Analytics","Advertising"].map((text,index)=>{
    const x=index ? .62 : -.62;
    mesh(box(.86,.64,.06,.25),rubber,consent,x,-.08,.32);
    const lever=mesh(new THREE.CapsuleGeometry(.13,.16,6,16),enamel,consent,x,-.08,.45);lever.rotation.z=Math.PI/2;
    label(text,.95,.2,consent,x,-.58,.34);
    const light=mesh(new THREE.SphereGeometry(.045,16,12),material(new THREE.MeshStandardMaterial({color:0x7a876e,emissive:0x000000})),consent,x,.32,.36);
    return {lever,light,x};
  });
  const consentRoute=new THREE.Group();consent.add(consentRoute);
  for(const x of [-.62,.62])curve([new THREE.Vector3(x,-.84,.17),new THREE.Vector3(x,-1.1,.1),new THREE.Vector3(x*1.8,-1.25,.2)],.035,brass,consentRoute);
  consent.position.z=.9;consent.rotation.set(.14,-.18,0);

  // Withdrawal: opposing keyed connectors separate as the optional path closes.
  const withdrawal=new THREE.Group();
  const plugs=[new THREE.Group(),new THREE.Group()];plugs.forEach(group=>withdrawal.add(group));
  plugs.forEach((plug,index)=>{
    mesh(box(.8,.78,.5,.16),index ? enamel : ivory,plug,0,0,-.25);
    for(let band=0;band<4;band++)mesh(new THREE.BoxGeometry(.045,.62,.055),rubber,plug,(band-1.5)*.15,0,.285);
    const neck=mesh(new THREE.CylinderGeometry(.16,.23,.5,24),rubber,plug,index ? .56 : -.56,0,0);neck.rotation.z=Math.PI/2;
    if(!index)for(const y of [-.2,0,.2]){const pin=mesh(new THREE.CylinderGeometry(.035,.035,.34,12),brass,plug,.54,y,0);pin.rotation.z=Math.PI/2;}
    else for(const y of [-.2,0,.2]){const socket=mesh(new THREE.CylinderGeometry(.055,.055,.035,16),rubber,plug,-.42,y,0);socket.rotation.z=Math.PI/2;}
  });
  const cables=[-1,1].map(side=>curve([new THREE.Vector3(side*.65,0,-.1),new THREE.Vector3(side*1.3,-.7,-.2),new THREE.Vector3(side*1.6,-1,-.2),new THREE.Vector3(side*1.9,-.8,-.1)],.07,rubber,withdrawal));
  mesh(box(1.9,.38,.07,.1),ivory,withdrawal,0,.95,0);label("Withdraw / reconnect",1.75,.2,withdrawal,0,.95,.1);
  withdrawal.position.set(0,.1,.9);withdrawal.rotation.set(.16,-.22,-.08);

  // Responsibility: a vault with an inset door, locking wheel and six locking bolts.
  const responsibility=new THREE.Group();
  mesh(box(2.3,2.45,.72,.2),dark,responsibility,0,0,-.4);
  mesh(box(1.95,2.12,.08,.15),brass,responsibility,0,0,.35);
  mesh(box(1.76,1.94,.12,.13),enamel,responsibility,0,0,.46);
  screws(responsibility,1.48,1.68,.63);
  for(const y of [-.6,.6])mesh(new THREE.CylinderGeometry(.09,.09,.32,20),brass,responsibility,-1.02,y,.38);
  const wheel=new THREE.Group();responsibility.add(wheel);wheel.position.set(.1,0,.73);
  cylinder(.14,.18,brass,wheel,0,0,0);
  const rim=mesh(new THREE.TorusGeometry(.43,.045,10,64),dark,wheel,0,0,.1);
  for(let index=0;index<3;index++){const spoke=mesh(new THREE.BoxGeometry(.8,.045,.06),brass,wheel,0,0,.08);spoke.rotation.z=index*Math.PI/3;}
  label("Safeguards",1.25,.22,responsibility,0,.68,.62);
  for(const y of [-.72,.72])for(const x of [-.62,0,.62])mesh(new THREE.BoxGeometry(.15,.04,.08),dark,responsibility,x,y,.61);
  const feet=[-1,1].map(side=>mesh(box(.42,.18,.7,.04),rubber,responsibility,side*.74,-1.3,-.34));
  responsibility.rotation.set(.12,-.36,0);responsibility.position.z=.8;

  return {
    groups:{Purpose:purpose,Consent:consent,Withdrawal:withdrawal,Responsibility:responsibility},
    update(p:number,allowed:DemoPurposes,past:boolean,gate:number,blend:number[]){
      needle.rotation.z=-.65+Math.sin(p*Math.PI)*.9;
      dataTiles.forEach((tile,index)=>{const angle=index*Math.PI*2/5+p*.6;tile.position.set(Math.cos(angle)*1.64,Math.sin(angle)*1.64,-.1);tile.rotation.set(.15,angle*.3,-angle*.2);});
      toggles.forEach(({lever,light,x},index)=>{
        const enabled=index ? allowed.advertising : allowed.analytics;
        lever.position.x=x-.21+.42*blend[index];
        const finish=light.material as Three.MeshStandardMaterial;finish.color.setHex(enabled ? 0xbad990 : 0x7a876e);finish.emissive.setHex(enabled && !past ? 0x486326 : 0);
      });
      consentRoute.visible=allowed.analytics || allowed.advertising;
      const connected=Math.max(...blend);
      plugs.forEach((plug,index)=>{const side=index ? 1 : -1;plug.position.x=side*(1-.56*connected);plug.rotation.z=side*.12*(1-connected);});
      cables.forEach((cable,index)=>cable.position.x=(index ? 1 : -1)*.35*(1-connected));
      wheel.rotation.z=p*Math.PI*.6;rim.rotation.z=gate*.1;feet.forEach(foot=>foot.visible=true);
      responsibility.rotation.y=-.36+p*.2;
    },
  };
}
