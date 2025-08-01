import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState<number | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Three.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x2c3e50);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Cannon.js physics world setup
    const world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });
    world.broadphase = new CANNON.NaiveBroadphase();
    (world.solver as any).iterations = 10;

    // Create physics ground
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
    world.addBody(groundBody);

    // Visual ground
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x404040 });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Create dice (cube) physics body
    const diceShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
    const diceBody = new CANNON.Body({ mass: 1 });
    diceBody.addShape(diceShape);
    diceBody.position.set(0, 5, 0);
    diceBody.material = new CANNON.Material({ friction: 0.4, restitution: 0.3 });
    world.addBody(diceBody);

    // Visual dice (cube)
    const diceGeometry = new THREE.BoxGeometry(1, 1, 1);
    const diceMaterial = new THREE.MeshPhongMaterial({ color: 0xff6b6b });
    const diceMesh = new THREE.Mesh(diceGeometry, diceMaterial);
    diceMesh.castShadow = true;
    scene.add(diceMesh);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // Roll function
    const rollDice = () => {
      setIsRolling(true);
      setDiceResult(null);
      
      // Reset dice position and apply random force
      diceBody.position.set(0, 5, 0);
      diceBody.velocity.set(0, 0, 0);
      diceBody.angularVelocity.set(0, 0, 0);
      
      // Apply random impulse
      const force = new CANNON.Vec3(
        (Math.random() - 0.5) * 10,
        2,
        (Math.random() - 0.5) * 10
      );
      diceBody.applyImpulse(force, diceBody.position);
      
      // Apply random torque
      const torque = new CANNON.Vec3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      );
      diceBody.torque = torque;

      // Check for dice rest after a delay
      setTimeout(() => {
        const checkRest = () => {
          if (diceBody.velocity.length() < 0.1 && diceBody.angularVelocity.length() < 0.1) {
            setIsRolling(false);
            // Simple face detection - check which face is up
            const result = getDiceFace(diceBody.quaternion);
            setDiceResult(result);
          } else {
            setTimeout(checkRest, 100);
          }
        };
        checkRest();
      }, 1000);
    };

    // Simple dice face detection based on orientation
    const getDiceFace = (quaternion: CANNON.Quaternion) => {
      const tempVec = new CANNON.Vec3(0, 1, 0);
      quaternion.vmult(tempVec, tempVec);
      
      // Check which axis is most aligned with up (Y)
      const faces = [
        { normal: new CANNON.Vec3(0, 1, 0), value: 1 },   // top
        { normal: new CANNON.Vec3(0, -1, 0), value: 6 },  // bottom  
        { normal: new CANNON.Vec3(1, 0, 0), value: 2 },   // right
        { normal: new CANNON.Vec3(-1, 0, 0), value: 5 },  // left
        { normal: new CANNON.Vec3(0, 0, 1), value: 3 },   // front
        { normal: new CANNON.Vec3(0, 0, -1), value: 4 },  // back
      ];

      let maxDot = -1;
      let result = 1;
      
      faces.forEach(face => {
        const dot = tempVec.dot(face.normal);
        if (dot > maxDot) {
          maxDot = dot;
          result = face.value;
        }
      });

      return result;
    };

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Step physics
      world.step(1/60);
      
      // Update visual dice position and rotation from physics
      diceMesh.position.copy(diceBody.position as any);
      diceMesh.quaternion.copy(diceBody.quaternion as any);
      
      renderer.render(scene, camera);
    };
    
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);

    // Click handler for rolling
    const handleClick = () => {
      if (!isRolling) {
        rollDice();
      }
    };
    
    renderer.domElement.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div>
      <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
      <div style={{ 
        position: 'absolute', 
        top: 20, 
        left: 20, 
        color: 'white',
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h2>3D Dice Roller with Physics!</h2>
        <p>Click anywhere to roll the dice</p>
        {isRolling && <p>🎲 Rolling...</p>}
        {diceResult && !isRolling && <p>🎯 Result: {diceResult}</p>}
      </div>
    </div>
  );
};

export default App;
