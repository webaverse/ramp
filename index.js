import * as THREE from 'three';
// import easing from './easing.js';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useActivate, useLoaders, usePhysics, useCleanup} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

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
  }
}

export default () => {
  const app = useApp();
  const physics = usePhysics();
  
  const scale = 2;
  var A = new THREE.Vector2( 0, 0 ).multiplyScalar(scale);
  var B = new THREE.Vector2( 2, 0 ).multiplyScalar(scale);
  var C = new THREE.Vector2( 0, 1 ).multiplyScalar(scale);
  var depth = scale;
  var geometry = new PrismGeometry( [ A, B, C ], depth )
    .applyMatrix4(new THREE.Matrix4().makeTranslation(-2*scale/2, 0, -scale/2));
  var material = new THREE.MeshPhongMaterial( { color: 0x00b2fc, specular: 0x00ffff, shininess: 20 } );
  var mesh = new THREE.Mesh( geometry, material );
  // mesh.rotation.x = -Math.PI  /  2;
  app.add(mesh);
  
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
  
  
  
  
  
  
  
  
  
  
  
  let frameCb = null;
  useFrame(() => {
    frameCb && frameCb();
  });
  
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
  });

  return app;
};