import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// All objects, including the articulated hands and eyes, share this one scene.
export function createLoginScene(host,initial){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.setClearColor(0xeaf0fa,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.98;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.VSMShadowMap;
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),world=new THREE.Group();scene.add(world);
  const camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,80);
  camera.position.set(5.2,3.9,10);camera.lookAt(0,1.55,0);
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;
  scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xf4f7ff,0xa3acc6,1.15));
  const key=new THREE.DirectionalLight(0xfff6e8,2.7);key.position.set(-3,10,6);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-6,right:6,top:7,bottom:-5,near:.5,far:24});
  key.shadow.bias=-.0005;key.shadow.normalBias=.025;key.shadow.radius=5;key.shadow.blurSamples=8;scene.add(key);
  const fill=new THREE.DirectionalLight(0xd8e4ff,.7);fill.position.set(5,3,-4);scene.add(fill);
  const clay=color=>new THREE.MeshPhysicalMaterial({color,roughness:.68,metalness:0,clearcoat:.025,clearcoatRoughness:.8});
  const blue=clay(0x315ee5),palmBlue=clay(0x4d78ef),ivory=clay(0xfff9e8),palmIvory=clay(0xfff3d8),ink=clay(0x152746),white=clay(0xffffff),lineMat=clay(0x9aacd7);
  const sphere=new THREE.SphereGeometry(1,32,24),limb=new THREE.CapsuleGeometry(1,1,8,20);
  const mesh=(geometry,material,parent,position=[0,0,0],scale=[1,1,1])=>{const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const rounded=(w,h,d,r,material,parent,position)=>mesh(new RoundedBoxGeometry(w,h,d,6,r),material,parent,position);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({opacity:.12}));ground.rotation.x=-Math.PI/2;ground.position.y=-.04;ground.receiveShadow=true;scene.add(ground);
  rounded(5.45,.20,3.7,.10,ivory,world,[0,.02,0]);
  const platformTrim=new THREE.MeshStandardMaterial({color:0xc8d4f3,roughness:.7});
  rounded(5.32,.14,3.6,.065,platformTrim,world,[0,-.09,0]);

  // An oversized roadmap is a prop from this product's own work, not scenery.
  const board=new THREE.Group();board.position.set(.65,2.18,-1.08);board.rotation.set(-.12,-.17,-.11);world.add(board);
  rounded(3.65,2.55,.19,.17,ivory,board,[0,0,0]);
  function route(points,material,radius=.027){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),48,radius,8,false),material,board);}
  route([[-1.25,-.64,.13],[-.65,-.64,.13],[-.2,-.38,.13],[.08,.06,.13],[.62,.43,.13],[1.25,.43,.13]],blue);
  route([[-.22,-.36,.13],[-.52,.15,.13],[-.78,.57,.13]],lineMat,.021);
  for(const [x,y,color] of [[-1.25,-.64,blue],[-.78,.57,lineMat],[.08,.06,blue],[1.25,.43,blue]]){
    const node=mesh(new THREE.CylinderGeometry(.12,.12,.052,40),color,board,[x,y,.16]);node.rotation.x=Math.PI/2;
    const inner=mesh(new THREE.CylinderGeometry(.055,.055,.058,32),ivory,board,[x,y,.19]);inner.rotation.x=Math.PI/2;
  }
  function textTexture(language){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,256);ctx.fillStyle='#24395c';ctx.font='500 70px Arial, Microsoft YaHei, sans-serif';ctx.textBaseline='middle';
    ctx.fillText(language==='en'?'A direction of your own':'找到自己的方向',25,95);
    ctx.fillStyle='#667593';ctx.font='34px Arial, Microsoft YaHei, sans-serif';ctx.fillText(language==='en'?'Explore. Try. Keep going.':'了解职业  ·  试着行动  ·  留下成果',27,184);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
  }
  let boardTexture=textTexture(initial.language);
  const labelMaterial=new THREE.MeshBasicMaterial({map:boardTexture,transparent:true,toneMapped:false});
  const label=mesh(new THREE.PlaneGeometry(3.05,.76),labelMaterial,board,[-.03,.76,.105]);label.castShadow=false;label.receiveShadow=false;
  // Two sturdy feet hold the board in the same physical world as the companions.
  rounded(.22,.55,.55,.10,blue,world,[-.65,.36,-1.12]);rounded(.22,.55,.55,.10,blue,world,[1.67,.36,-1.12]);

  function makeCharacter({x,z,size,color,palm,short=false}){
    const root=new THREE.Group();root.position.set(x,.14,z);root.scale.setScalar(size);root.rotation.y=.28;world.add(root);
    const body=short?rounded(1.42,1.72,1.08,.40,color,root,[0,1.03,0]):mesh(new THREE.CapsuleGeometry(.66,1.27,16,48),color,root,[0,1.48,0],[1,1,.83]);
    const eyeY=short?1.32:2.02,front=short?.55:.51;
    const eyes=new THREE.Group();root.add(eyes);
    const eyeParts=[];
    for(const side of [-1,1]){
      const eye=new THREE.Group();eye.position.set(side*.225,eyeY,front);eyes.add(eye);
      mesh(sphere,white,eye,[0,0,0],[.187,.222,.105]);
      const pupil=mesh(sphere,ink,eye,[.025,0,.096],[.075,.103,.042]);
      mesh(sphere,white,eye,[.048,.035,.132],[.020,.026,.009]);eyeParts.push({eye,pupil});
    }
    const smile=mesh(new THREE.TorusGeometry(.094,.017,8,28,Math.PI),ink,root,[0,eyeY-.30,front+.02],[1.16,.8,1]);smile.rotation.z=Math.PI;
    if(!short){
      const badge=mesh(new THREE.CylinderGeometry(.19,.19,.035,40),ivory,root,[0,1.17,.55]);badge.rotation.x=Math.PI/2;
      const pointer=new THREE.Shape();pointer.moveTo(.085,.09);pointer.lineTo(.035,-.035);pointer.lineTo(-.085,-.09);pointer.lineTo(-.035,.035);pointer.closePath();
      mesh(new THREE.ShapeGeometry(pointer),blue,root,[0,1.17,.577]);
    }
    const feet=[];for(const side of [-1,1])feet.push(mesh(sphere,color,root,[side*.37,.10,.19],[.28,.17,.40]));
    const arms=[];
    for(const side of [-1,1]){
      const upper=mesh(limb,color,root),lower=mesh(limb,color,root),hand=mesh(sphere,palm,root,[side*.80,eyeY-.98,.29],[.28,.33,.19]);
      const thumb=mesh(sphere,palm,hand,[side*-.65,-.20,.08],[.36,.46,.8]);
      arms.push({side,upper,lower,hand,thumb});
    }
    return {root,body,eyes,eyeParts,arms,eyeY,front,feet,short,baseX:x,baseZ:z};
  }
  const guide=makeCharacter({x:-1.22,z:.36,size:1.05,color:blue,palm:palmBlue});
  const explorer=makeCharacter({x:1.04,z:.99,size:.82,color:ivory,palm:palmIvory,short:true});
  const characters=[guide,explorer],up=new THREE.Vector3(0,1,0);
  let state={...initial},raf=0,last=performance.now(),alive=true,visible=true,cover=initial.secret?1:0,lookX=0,lookY=0,tx=0,ty=0,greeting=0,waveStart=0,blinkStart=-10000,lastLanguage=initial.language;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
  function segment(object,a,b,radius){const direction=new THREE.Vector3().subVectors(b,a);object.position.copy(a).add(b).multiplyScalar(.5);object.quaternion.setFromUnitVectors(up,direction.clone().normalize());object.scale.set(radius,direction.length()/3,radius);}
  function pose(character,coverValue,elapsed){
    const {root,eyeParts,arms,eyeY,front,short}=character;
    const activeWave=!state.secret&&greeting>0&&!reduce.matches;
    root.rotation.y=.28+(state.secret?-.04:lookX*.16);
    root.rotation.z=reduce.matches?0:(activeWave?Math.sin(elapsed*4)*.025:lookX*.015);
    const blink=state.secret?1:(!reduce.matches&&elapsed-blinkStart<.17?.12:1);
    for(const {eye,pupil} of eyeParts){eye.scale.y=blink;pupil.position.x=.025+(state.secret?0:lookX*.035);pupil.position.y=state.secret?0:lookY*.045;}
    for(const arm of arms){
      const side=arm.side,shoulder=new THREE.Vector3(side*.62,eyeY-.57,.05);
      const idle=new THREE.Vector3(side*.82,eyeY-.93,.27),closed=new THREE.Vector3(side*.225,eyeY,front+.24);
      const handPos=idle.lerp(closed,coverValue);
      const elbow=new THREE.Vector3(side*(.86-coverValue*.13),eyeY-.65+coverValue*.37,.08+coverValue*.43);
      if(activeWave&&side===-1){const w=Math.sin(Math.min(greeting*3,1)*Math.PI/2);handPos.x-=w*.27;handPos.y+=w*(.95+Math.sin(elapsed*12)*.09);handPos.z+=w*.12;elbow.y+=w*.35;}
      segment(arm.upper,shoulder,elbow,.135);segment(arm.lower,elbow,handPos,.14);
      arm.hand.position.copy(handPos);arm.hand.rotation.z=side*(-.15+coverValue*.24);
    }
  }
  function draw(now=performance.now()){
    raf=0;if(!alive||!visible)return;
    const dt=THREE.MathUtils.clamp((now-last)/1000,0,.05);last=now;const elapsed=now/1000;
    const desired=state.secret?1:0;
    const blend=reduce.matches?1:1-Math.exp(-dt*15);
    cover=THREE.MathUtils.lerp(cover,desired,blend);lookX=THREE.MathUtils.lerp(lookX,tx,blend);lookY=THREE.MathUtils.lerp(lookY,ty,blend);
    greeting=state.hello&&!state.secret?Math.min((now-waveStart)/1000,.9):Math.max(0,greeting-dt*4);
    for(const character of characters)pose(character,cover,elapsed);
    host.dataset.pose=cover>.995?'covered':greeting>0?'greeting':'open';
    renderer.render(scene,camera);
    if(Math.abs(cover-desired)>.001||Math.abs(lookX-tx)>.001||Math.abs(lookY-ty)>.001||(!reduce.matches&&(state.hello||greeting>0||elapsed-blinkStart<.21)))schedule();
  }
  function schedule(){if(alive&&!raf&&visible)raf=requestAnimationFrame(draw);}
  function resize(){const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);const aspect=width/height;const view=Math.max(4.75,6.6/aspect);camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;camera.updateProjectionMatrix();schedule();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  const page=host.closest('.auth-page');
  function move(event){if(reduce.matches||!fine.matches||state.secret)return;const r=host.getBoundingClientRect();tx=THREE.MathUtils.clamp((event.clientX-r.x-r.width*.5)/r.width,-.8,.8);ty=THREE.MathUtils.clamp(-(event.clientY-r.y-r.height*.45)/r.height,-.7,.7);schedule();}
  function leave(){tx=0;ty=0;schedule();}
  page.addEventListener('pointermove',move);page.addEventListener('pointerleave',leave);
  function visibility(){visible=!document.hidden;if(visible)schedule();}
  document.addEventListener('visibilitychange',visibility);
  const blinkTimer=setInterval(()=>{if(!state.secret&&!reduce.matches&&visible){blinkStart=performance.now()/1000;schedule();}},5100);
  function update(next){
    if(next.hello&&!state.hello)waveStart=performance.now();state={...next};
    if(next.language!==lastLanguage){lastLanguage=next.language;const old=boardTexture;boardTexture=textTexture(lastLanguage);labelMaterial.map=boardTexture;labelMaterial.needsUpdate=true;old.dispose();}
    if(state.focus==='email'&&!state.secret){tx=.65;ty=-.04;}else if(!state.secret){tx=0;ty=0;}
    schedule();
  }
  function mediaChange(){update(state);}
  reduce.addEventListener('change',mediaChange);resize();update(initial);
  return {update,dispose(){
    alive=false;cancelAnimationFrame(raf);clearInterval(blinkTimer);observer.disconnect();page.removeEventListener('pointermove',move);page.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',visibility);reduce.removeEventListener('change',mediaChange);
    const geometries=new Set(),materials=new Set();scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)for(const m of Array.isArray(object.material)?object.material:[object.material])materials.add(m);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());boardTexture.dispose();environment.dispose();renderer.dispose();renderer.domElement.remove();
  }};
}
