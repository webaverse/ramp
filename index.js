import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useActivate, useLoaders, usePhysics, useCleanup} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');
const localVector = new THREE.Vector3();

class PrismGeometry extends THREE.ExtrudeGeometry {
  constructor(vertices, depth) {
    var Shape = new THREE.Shape();

    ( function f( ctx ) {

        ctx.moveTo( vertices[0].x, vertices[0].y );
        for (var i=1; i < vertices.length; i++) {
            ctx.lineTo( vertices[i].x, vertices[i].y );
        }
        ctx.lineTo( vertices[0].x, vertices[0].y );

    } )( Shape );

    var settings = { };
    settings.depth = depth;
    settings.bevelEnabled = false;
    super(Shape, settings);
    
    const numPoints = this.attributes.position.array.length/3;
    const uvs = new Float32Array(numPoints*3);
    const boundingBox = new THREE.Box3()
      .setFromBufferAttribute(this.attributes.position);
    const size = boundingBox.getSize(new THREE.Vector3());
    const topRight = boundingBox.max;
    for (let i = 0; i < numPoints; i++) {
      localVector.fromArray(this.attributes.position.array, i*3);
      uvs[i*3] = (topRight.z - localVector.z) / size.z;
      uvs[i*3+1] = 1-(topRight.x - localVector.x) / size.x;
      uvs[i*3+2] = localVector.y;
    }
    this.setAttribute('uv2', new THREE.BufferAttribute(uvs, 3));
  }
}

export default () => {
  const app = useApp();
  const physics = usePhysics();
  
  const scale = 2;
  const A = new THREE.Vector2( 0, 0 ).multiplyScalar(scale);
  const B = new THREE.Vector2( 2, 0 ).multiplyScalar(scale);
  const C = new THREE.Vector2( 0, 1 ).multiplyScalar(scale);
  const depth = scale;
  const geometry = new PrismGeometry([ A, B, C ], depth)
    .applyMatrix4(new THREE.Matrix4().makeTranslation(-2*scale/2, 0, -scale/2));
  window.geometry = geometry;
  const baseMaterial = new THREE.MeshPhongMaterial( { color: 0x00b2fc, specular: 0x00ffff, shininess: 20 } );
  const stripeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTex: {
        type: 't',
        value: new THREE.Texture(),
        needsUpdate: true,
      },
      uTime: {
        type: 'f',
        value: 0,
        needsUpdate: true,
      },
    },
    vertexShader: `\
      precision highp float;
      precision highp int;

      uniform vec4 uSelectRange;

      attribute vec3 uv2;
      attribute float ao;
      attribute float skyLight;
      attribute float torchLight;

      varying vec3 vUv;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        vUv = uv2;
      }
    `,
    fragmentShader: `\
      precision highp float;
      precision highp int;

      #define PI 3.1415926535897932384626433832795

      uniform sampler2D uTex;
      uniform float uTime;
      uniform vec3 sunDirection;

      varying vec3 vViewPosition;
      varying vec3 vUv;

      void main() {
        if (vUv.x > 0. && vUv.x < 1. && vUv.y > 0. && vUv.y < 1. && vUv.z > 0.) {
          vec4 c1 = texture(uTex, vec2(vUv.x*0.5, vUv.y + uTime));
          vec4 c2 = texture(uTex, vec2(0.5 + vUv.x*0.5, vUv.y + uTime));
          vec3 c = (c1.rgb * (1. - c2.a)) + (c2.rgb * c2.a);
          gl_FragColor = vec4(c, 1.);
        } else {
          gl_FragColor = vec4(0.);
        }
      }
    `,
    // transparent: true,
    // depthWrite: false,
    // polygonOffset: true,
    // polygonOffsetFactor: -1,
    // polygonOffsetUnits: 1,
  });
  const mesh = new THREE.Mesh(geometry, [
    baseMaterial,
    stripeMaterial,
  ]);
  // mesh.rotation.x = -Math.PI  /  2;
  app.add(mesh);
  
  (async () => {
    const img = new Image();
    await new Promise((accept, reject) => {
      img.onload = accept;
      img.onerror = reject;
      img.crossOrigin = 'Anonymous';
      img.src = baseUrl + 'stripes.png';
    });
    stripeMaterial.uniforms.uTex.value.image = img;
    stripeMaterial.uniforms.uTex.value.needsUpdate = true;
    stripeMaterial.uniforms.uTex.value.wrapS = THREE.RepeatWrapping;
    stripeMaterial.uniforms.uTex.value.wrapT = THREE.RepeatWrapping;
  })();
  
  const physicsIds = [];
  {  
    mesh.updateMatrixWorld();
    const physicsMesh = physics.convertMeshToPhysicsMesh(mesh);
    physicsMesh.position.copy(mesh.position);
    physicsMesh.quaternion.copy(mesh.quaternion);
    physicsMesh.scale.copy(mesh.scale);

    app.add(physicsMesh);
    const physicsId = physics.addGeometry(physicsMesh);
    app.remove(physicsMesh);
    physicsIds.push(physicsId);
  }
  
  useFrame(() => {
    stripeMaterial.uniforms.uTime.value = ((performance.now()/1000) % 3)/3;
    stripeMaterial.uniforms.uTime.needsUpdate = true;
  });
  
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
  });

  return app;
};