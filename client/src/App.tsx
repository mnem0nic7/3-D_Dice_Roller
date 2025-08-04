import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three-stdlib';
import { DiceType, DiceRoll } from '../../shared/src/types';
import { DiceSelector } from './components/DiceSelector';
import { RollResults } from './components/RollResults';
import { DiceFactory, DiceGeometry } from './utils/DiceFactory';

const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const activeDiceRef = useRef<DiceGeometry[]>([]);
  const worldRef = useRef<CANNON.World | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const currentBaseRef = useRef<any>(null);
  
  const [selectedDice, setSelectedDice] = useState<DiceType[]>(['d6']);
  const [isRolling, setIsRolling] = useState(false);
  const [rollResults, setRollResults] = useState<DiceRoll[]>([]);
  const [modifier, setModifier] = useState(0);
  const [hasAutoRolled, setHasAutoRolled] = useState(false);
  const [selectedBase, setSelectedBase] = useState<'simple' | 'elevated' | 'arena'>('simple');
  const [selectedTower, setSelectedTower] = useState<'none' | 'basic' | 'spiral' | 'funnel'>('none');
  const [currentMode, setCurrentMode] = useState<'dice' | 'tower'>('dice');
  const [isDragging, setIsDragging] = useState<'base' | 'tower' | null>(null);
  const [basePosition, setBasePosition] = useState({ x: 0, z: 0 });
  const [towerPosition, setTowerPosition] = useState({ x: 0, z: 0 });

  // Create rollDice function with useCallback to maintain reference
  const rollDice = useCallback(() => {
    console.log('rollDice function called, isRolling:', isRolling);
    
    if (selectedDice.length === 0) {
      console.log('No dice selected, returning');
      return;
    }
    
    if (isRolling) {
      console.log('Already rolling, returning');
      return;
    }

    setIsRolling(true);
    setRollResults([]); // Clear previous results
    console.log('Starting roll with dice:', selectedDice);

    // Clear previous dice only if we have any
    if (activeDiceRef.current.length > 0) {
      console.log('Clearing previous dice:', activeDiceRef.current.length);
      activeDiceRef.current.forEach(dice => {
        sceneRef.current?.remove(dice.mesh);
        worldRef.current?.removeBody(dice.body);
      });
      activeDiceRef.current = [];
    }

    // Create new dice
    const newDice: DiceGeometry[] = [];
    const spacing = 1.5; // Distance between dice
    
    selectedDice.forEach((diceType, index) => {
      console.log(`Creating dice ${index}: ${diceType}`);
      const dice = DiceFactory.createDice(diceType, worldRef.current!, sceneRef.current!);
      
      // Position dice above the base for rolling
      const basePos = currentBaseRef.current?.getTowerPosition() || { x: 0, y: 0.5, z: 0 };
      const x = (index - (selectedDice.length - 1) / 2) * 1.5; // Spread dice out
      dice.body.position.set(basePos.x + x, basePos.y + 3, basePos.z); // Drop from above base
      dice.mesh.position.copy(dice.body.position as any);
      console.log(`Dice ${index} positioned at:`, dice.body.position);
      
      // Add some random rotation and gentle force
      const rotX = (Math.random() - 0.5) * 1.0;
      const rotY = (Math.random() - 0.5) * 1.0;
      const rotZ = (Math.random() - 0.5) * 1.0;
      dice.body.angularVelocity.set(rotX, rotY, rotZ);
      
      // Add slight random horizontal force to make dice bounce around in tower
      const forceX = (Math.random() - 0.5) * 0.5;
      const forceY = 0; // Let gravity do the work
      const forceZ = (Math.random() - 0.5) * 0.5;
      dice.body.applyImpulse(new CANNON.Vec3(forceX, forceY, forceZ));
      console.log(`Applied force to dice ${index}:`, forceX, forceY, forceZ);
      
      newDice.push(dice);
    });

    activeDiceRef.current = newDice;

    // Wait for dice to settle and calculate results
    setTimeout(() => {
      const results: DiceRoll[] = activeDiceRef.current.map((dice, index) => {
        // Simple face detection based on final orientation
        let result = 1;
        
        switch (dice.type) {
          case 'd6':
            // For a cube, determine which face is pointing up based on rotation
            const upVector = new THREE.Vector3(0, 1, 0);
            dice.mesh.localToWorld(upVector);
            upVector.normalize();
            
            // Simple face detection - could be improved
            const faces = [
              { normal: new THREE.Vector3(0, 1, 0), value: 1 },
              { normal: new THREE.Vector3(0, -1, 0), value: 6 },
              { normal: new THREE.Vector3(1, 0, 0), value: 2 },
              { normal: new THREE.Vector3(-1, 0, 0), value: 5 },
              { normal: new THREE.Vector3(0, 0, 1), value: 3 },
              { normal: new THREE.Vector3(0, 0, -1), value: 4 }
            ];
            
            let maxDot = -1;
            faces.forEach(face => {
              const dot = upVector.dot(face.normal);
              if (dot > maxDot) {
                maxDot = dot;
                result = face.value;
              }
            });
            break;
            
          default:
            // For other dice types, use a simplified random result for now
            const maxValue = DiceFactory.getMaxValue(dice.type);
            result = Math.floor(Math.random() * maxValue) + 1;
            break;
        }
        
        console.log(`Dice ${index} (${dice.type}) result: ${result}`);
        
        return {
          type: dice.type,
          result
        };
      });
      
      setRollResults(results);
      console.log('Roll completed with results:', results);
      
      // Add a small delay before allowing next roll
      setTimeout(() => {
        setIsRolling(false);
      }, 500);
    }, 2000); // Reduced from 3000 to 2000ms
  }, [selectedDice, isRolling]);

  useEffect(() => {
    console.log('useEffect running, mountRef.current:', mountRef.current);
    if (!mountRef.current) return;

    // Check if canvas already exists to prevent duplicates
    const existingCanvas = mountRef.current.querySelector('canvas');
    if (existingCanvas) {
      console.log('Canvas already exists, skipping setup');
      return;
    }

    console.log('Setting up 3D scene...');
    // Scene setup with fog for atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 20, 60);
    sceneRef.current = scene;
    console.log('Scene created');

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(8, 8, 8); // Angled view to see into the tower
    console.log('Camera positioned at:', camera.position);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    console.log('Renderer created and canvas appended');

    // Add orbit controls for camera rotation
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth camera movement
    controls.dampingFactor = 0.1; // Increased for more responsive controls
    controls.screenSpacePanning = false;
    controls.minDistance = 5; // Minimum zoom distance
    controls.maxDistance = 50; // Maximum zoom distance
    controls.maxPolarAngle = Math.PI; // Allow full vertical rotation
    controls.target.set(0, 2, 0); // Focus on the tower base
    controls.autoRotate = false; // Ensure auto-rotate is disabled
    controls.update();
    console.log('Orbit controls enabled');

    // Enhanced Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    // Main directional light (sun-like)
    const directionalLight = new THREE.DirectionalLight(0xfff8dc, 1.2);
    directionalLight.position.set(12, 15, 8);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    directionalLight.shadow.bias = -0.001;
    scene.add(directionalLight);

    // Warm fill light
    const fillLight = new THREE.DirectionalLight(0xffa500, 0.3);
    fillLight.position.set(-8, 5, -5);
    scene.add(fillLight);

    // Soft top light for the tower interior
    const topLight = new THREE.PointLight(0xffffff, 0.6, 20);
    topLight.position.set(0, 12, 0);
    topLight.castShadow = true;
    scene.add(topLight);

    // Physics world
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    worldRef.current = world;

    // Enhanced Ground plane with texture-like appearance
    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x2d5016,
      transparent: true,
      opacity: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = -0.1; // Slightly below tower base
    scene.add(ground);

    // Add some ground details
    const grassPatches = [];
    for (let i = 0; i < 20; i++) {
      const patchGeometry = new THREE.PlaneGeometry(2, 2);
      const patchMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(0.25, 0.6, 0.2 + Math.random() * 0.2),
        transparent: true,
        opacity: 0.6
      });
      const patch = new THREE.Mesh(patchGeometry, patchMaterial);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(
        (Math.random() - 0.5) * 25,
        -0.05,
        (Math.random() - 0.5) * 25
      );
      patch.receiveShadow = true;
      scene.add(patch);
      grassPatches.push(patch);
    }

    // Physics ground
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0, material: new CANNON.Material({ friction: 0.3, restitution: 0.3 }) });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI / 2);
    world.addBody(groundBody);

    // Base System will be initialized by the selectedBase useEffect
    console.log('Scene setup complete - waiting for base initialization');

    // Add some mystical orbs floating around the scene
    const orbs: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const orbGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const orbMaterial = new THREE.MeshPhongMaterial({ 
        color: new THREE.Color().setHSL(0.6 + i * 0.1, 0.8, 0.6),
        transparent: true,
        opacity: 0.7,
        emissive: new THREE.Color().setHSL(0.6 + i * 0.1, 0.5, 0.2)
      });
      const orb = new THREE.Mesh(orbGeometry, orbMaterial);
      const angle = (i / 6) * Math.PI * 2;
      const radius = 8;
      orb.position.set(
        Math.cos(angle) * radius,
        3 + Math.sin(i * 2) * 2,
        Math.sin(angle) * radius
      );
      scene.add(orb);
      orbs.push(orb); // Store reference for animation
    }

    // Mouse click handler with camera interaction detection and dragging
    let mouseDownTime = 0;
    let mouseDownPosition = { x: 0, y: 0 };
    let lastMousePosition = { x: 0, y: 0 };
    
    const handleMouseDown = (event: MouseEvent) => {
      mouseDownTime = Date.now();
      mouseDownPosition = { x: event.clientX, y: event.clientY };
      lastMousePosition = { x: event.clientX, y: event.clientY };
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      if (currentMode !== 'tower') return;
      
      const deltaX = event.clientX - lastMousePosition.x;
      const deltaY = event.clientY - lastMousePosition.y;
      const movement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (movement > 2) { // Only process significant movement
        const dragSensitivity = 0.02;
        
        if (event.shiftKey) {
          // Drag base
          setBasePosition(prev => ({
            x: prev.x + deltaX * dragSensitivity,
            z: prev.z + deltaY * dragSensitivity
          }));
          setIsDragging('base');
        } else if (event.ctrlKey) {
          // Drag tower
          setTowerPosition(prev => ({
            x: prev.x + deltaX * dragSensitivity,
            z: prev.z + deltaY * dragSensitivity
          }));
          setIsDragging('tower');
        }
      }
      
      lastMousePosition = { x: event.clientX, y: event.clientY };
    };
    
    const handleMouseUp = () => {
      setIsDragging(null);
    };
    
    const handleClick = (event: MouseEvent) => {
      // Only allow dice rolling in dice mode
      if (currentMode !== 'dice') {
        console.log('Click ignored - not in dice mode');
        return;
      }
      
      const clickDuration = Date.now() - mouseDownTime;
      const mouseMovement = Math.sqrt(
        Math.pow(event.clientX - mouseDownPosition.x, 2) + 
        Math.pow(event.clientY - mouseDownPosition.y, 2)
      );
      
      // Only roll dice if it's a short click with minimal mouse movement
      // This prevents rolling when user is rotating the camera
      if (clickDuration < 200 && mouseMovement < 5) {
        console.log('Mouse click detected - rolling dice');
        rollDice();
      } else {
        console.log('Mouse click ignored - camera interaction detected');
      }
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('click', handleClick);

    // Animation loop
    let frameCount = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      
      frameCount++;
      if (frameCount % 60 === 0) { // Log every 60 frames (about once per second)
        console.log(`Animation frame ${frameCount}, active dice: ${activeDiceRef.current.length}`);
      }
      
      // No flag animation (flag removed)
      
      // Animate only the floating orbs (not tower elements)
      orbs.forEach((orb, index) => {
        orb.position.y += Math.sin(frameCount * 0.02 + index) * 0.005;
        orb.rotation.y += 0.01;
      });
      
      // Step physics
      world.step(1/60);
      
      // Update visual dice positions and rotations from physics
      activeDiceRef.current.forEach((dice, index) => {
        const oldPos = dice.mesh.position.clone();
        dice.mesh.position.copy(dice.body.position as any);
        dice.mesh.quaternion.copy(dice.body.quaternion as any);
        
        // Log position changes for debugging
        if (frameCount % 60 === 0 && index === 0) {
          console.log(`Dice 0 position: physics=(${dice.body.position.x.toFixed(2)}, ${dice.body.position.y.toFixed(2)}, ${dice.body.position.z.toFixed(2)}), visual=(${dice.mesh.position.x.toFixed(2)}, ${dice.mesh.position.y.toFixed(2)}, ${dice.mesh.position.z.toFixed(2)})`);
        }
        
        // Safety check: reset dice that fall too far from base or go too low
        const pos = dice.body.position;
        const collectionArea = currentBaseRef.current?.getCollectionArea() || { center: { x: 0, y: 0, z: 0 }, radius: 3 };
        const distanceFromCenter = Math.sqrt(
          Math.pow(pos.x - collectionArea.center.x, 2) + 
          Math.pow(pos.z - collectionArea.center.z, 2)
        );
        
        // More aggressive containment - reset if dice go too far or too low
        if (pos.y < -2 || distanceFromCenter > collectionArea.radius) {
          const basePos = currentBaseRef.current?.getTowerPosition() || { x: 0, y: 0.5, z: 0 };
          // Reset with some randomness to prevent stacking
          const randomX = (Math.random() - 0.5) * 2;
          const randomZ = (Math.random() - 0.5) * 2;
          dice.body.position.set(basePos.x + randomX, basePos.y + 2, basePos.z + randomZ);
          dice.body.velocity.set(0, 0, 0);
          dice.body.angularVelocity.set(0, 0, 0);
          console.log(`Reset escaped dice ${index} back to base`);
        }
      });
      
      // Update orbit controls only when needed
      if (controls.enableDamping) {
        controls.update();
      }
      
      renderer.render(scene, camera);
    };
    
    animate();

    // Auto-roll dice after 0.5 seconds for testing (only once)
    const autoRollTimeout = setTimeout(() => {
      console.log('Auto-roll timeout triggered, isRolling:', isRolling, 'hasAutoRolled:', hasAutoRolled);
      if (!isRolling && !hasAutoRolled) {
        console.log('Auto-rolling dice for testing...');
        setHasAutoRolled(true);
        rollDice();
      }
    }, 500);

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      console.log('useEffect cleanup running');
      clearTimeout(autoRollTimeout);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('click', handleClick);
      
      // Dispose of controls
      controls.dispose();
      
      // Clean up dice
      activeDiceRef.current.forEach(dice => {
        scene.remove(dice.mesh);
        world.removeBody(dice.body);
      });
      activeDiceRef.current = [];
      
      // Remove canvas from DOM
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [rollDice, hasAutoRolled, selectedBase, currentMode]);

  // Handle base changes
  useEffect(() => {
    if (!sceneRef.current || !worldRef.current) return;

    // Remove old base elements
    if (currentBaseRef.current) {
      currentBaseRef.current.elements.forEach((element: any) => {
        sceneRef.current!.remove(element.mesh);
        worldRef.current!.removeBody(element.body);
      });
    }

    // Create new base
    const createBase = (type: 'simple' | 'elevated' | 'arena') => {
      const baseMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        shininess: 30,
        specular: 0x444444
      });
      
      const basePhysicsMaterial = new CANNON.Material({ friction: 0.8, restitution: 0.2 });
      const baseElements: { mesh: THREE.Mesh, body: CANNON.Body }[] = [];
      
      switch (type) {
        case 'simple':
          // Simple flat platform base with low walls
          const simpleGeometry = new THREE.BoxGeometry(8, 0.5, 8);
          const simpleMesh = new THREE.Mesh(simpleGeometry, baseMaterial);
          simpleMesh.position.set(basePosition.x, 0.25, basePosition.z);
          simpleMesh.receiveShadow = true;
          simpleMesh.castShadow = true;
          sceneRef.current!.add(simpleMesh);
          
          const simpleShape = new CANNON.Box(new CANNON.Vec3(4, 0.25, 4));
          const simpleBody = new CANNON.Body({ mass: 0, material: basePhysicsMaterial });
          simpleBody.addShape(simpleShape);
          simpleBody.position.set(basePosition.x, 0.25, basePosition.z);
          worldRef.current!.addBody(simpleBody);
          
          baseElements.push({ mesh: simpleMesh, body: simpleBody });
          
          // Add high perimeter walls for better dice containment
          const simpleWallHeight = 2.0;
          const simpleWallThickness = 0.3;
          const simpleSize = 8;
          
          const simpleWallPositions = [
            { x: basePosition.x, z: basePosition.z + simpleSize/2 + simpleWallThickness/2, width: simpleSize + simpleWallThickness, depth: simpleWallThickness },
            { x: basePosition.x, z: basePosition.z - simpleSize/2 - simpleWallThickness/2, width: simpleSize + simpleWallThickness, depth: simpleWallThickness },
            { x: basePosition.x - simpleSize/2 - simpleWallThickness/2, z: basePosition.z, width: simpleWallThickness, depth: simpleSize },
            { x: basePosition.x + simpleSize/2 + simpleWallThickness/2, z: basePosition.z, width: simpleWallThickness, depth: simpleSize }
          ];
          
          simpleWallPositions.forEach(wall => {
            const wallGeometry = new THREE.BoxGeometry(wall.width, simpleWallHeight, wall.depth);
            const wallMesh = new THREE.Mesh(wallGeometry, baseMaterial);
            wallMesh.position.set(wall.x, 0.5 + simpleWallHeight/2, wall.z);
            wallMesh.receiveShadow = true;
            wallMesh.castShadow = true;
            sceneRef.current!.add(wallMesh);
            
            const wallShape = new CANNON.Box(new CANNON.Vec3(wall.width/2, simpleWallHeight/2, wall.depth/2));
            const wallBody = new CANNON.Body({ mass: 0, material: basePhysicsMaterial });
            wallBody.addShape(wallShape);
            wallBody.position.set(wall.x, 0.5 + simpleWallHeight/2, wall.z);
            worldRef.current!.addBody(wallBody);
            
            baseElements.push({ mesh: wallMesh, body: wallBody });
          });
          break;
          
        case 'elevated':
          // Elevated platform with steps and decorative walls
          const mainPlatformGeometry = new THREE.BoxGeometry(8, 1, 8);
          const mainPlatform = new THREE.Mesh(mainPlatformGeometry, baseMaterial);
          mainPlatform.position.set(basePosition.x, 0.5, basePosition.z);
          mainPlatform.receiveShadow = true;
          mainPlatform.castShadow = true;
          sceneRef.current!.add(mainPlatform);
          
          const mainPlatformShape = new CANNON.Box(new CANNON.Vec3(4, 0.5, 4));
          const mainPlatformBody = new CANNON.Body({ mass: 0, material: basePhysicsMaterial });
          mainPlatformBody.addShape(mainPlatformShape);
          mainPlatformBody.position.set(basePosition.x, 0.5, basePosition.z);
          worldRef.current!.addBody(mainPlatformBody);
          
          baseElements.push({ mesh: mainPlatform, body: mainPlatformBody });
          
          // Add elevated perimeter walls
          const elevatedWallHeight = 2.2;
          const elevatedWallThickness = 0.3;
          const elevatedSize = 8;
          
          const elevatedWallPositions = [
            { x: basePosition.x, z: basePosition.z + elevatedSize/2 + elevatedWallThickness/2, width: elevatedSize + elevatedWallThickness, depth: elevatedWallThickness },
            { x: basePosition.x, z: basePosition.z - elevatedSize/2 - elevatedWallThickness/2, width: elevatedSize + elevatedWallThickness, depth: elevatedWallThickness },
            { x: basePosition.x - elevatedSize/2 - elevatedWallThickness/2, z: basePosition.z, width: elevatedWallThickness, depth: elevatedSize },
            { x: basePosition.x + elevatedSize/2 + elevatedWallThickness/2, z: basePosition.z, width: elevatedWallThickness, depth: elevatedSize }
          ];
          
          elevatedWallPositions.forEach(wall => {
            const wallGeometry = new THREE.BoxGeometry(wall.width, elevatedWallHeight, wall.depth);
            const wallMesh = new THREE.Mesh(wallGeometry, baseMaterial);
            wallMesh.position.set(wall.x, 1 + elevatedWallHeight/2, wall.z);
            wallMesh.receiveShadow = true;
            wallMesh.castShadow = true;
            sceneRef.current!.add(wallMesh);
            
            const wallShape = new CANNON.Box(new CANNON.Vec3(wall.width/2, elevatedWallHeight/2, wall.depth/2));
            const wallBody = new CANNON.Body({ mass: 0, material: basePhysicsMaterial });
            wallBody.addShape(wallShape);
            wallBody.position.set(wall.x, 1 + elevatedWallHeight/2, wall.z);
            worldRef.current!.addBody(wallBody);
            
            baseElements.push({ mesh: wallMesh, body: wallBody });
          });
          
          // Add steps around the platform
          for (let i = 0; i < 4; i++) {
            const stepGeometry = new THREE.BoxGeometry(10, 0.3, 10);
            const stepMesh = new THREE.Mesh(stepGeometry, baseMaterial);
            stepMesh.position.set(basePosition.x, 0.15 - (i * 0.2), basePosition.z);
            stepMesh.receiveShadow = true;
            stepMesh.castShadow = true;
            sceneRef.current!.add(stepMesh);
            
            const stepShape = new CANNON.Box(new CANNON.Vec3(5, 0.15, 5));
            const stepBody = new CANNON.Body({ mass: 0, material: basePhysicsMaterial });
            stepBody.addShape(stepShape);
            stepBody.position.set(basePosition.x, 0.15 - (i * 0.2), basePosition.z);
            worldRef.current!.addBody(stepBody);
            
            baseElements.push({ mesh: stepMesh, body: stepBody });
          }
          break;
          
        case 'arena':
          // Arena-style base with raised walls
          const arenaFloorGeometry = new THREE.BoxGeometry(12, 0.5, 12);
          const arenaFloor = new THREE.Mesh(arenaFloorGeometry, baseMaterial);
          arenaFloor.position.set(basePosition.x, 0.25, basePosition.z);
          arenaFloor.receiveShadow = true;
          arenaFloor.castShadow = true;
          sceneRef.current!.add(arenaFloor);
          
          const arenaFloorShape = new CANNON.Box(new CANNON.Vec3(6, 0.25, 6));
          const arenaFloorBody = new CANNON.Body({ mass: 0, material: basePhysicsMaterial });
          arenaFloorBody.addShape(arenaFloorShape);
          arenaFloorBody.position.set(basePosition.x, 0.25, basePosition.z);
          worldRef.current!.addBody(arenaFloorBody);
          
          baseElements.push({ mesh: arenaFloor, body: arenaFloorBody });
          
          // Add high perimeter walls
          const wallHeight = 3.0;
          const wallThickness = 0.4;
          const arenaSize = 12;
          
          const wallPositions = [
            { x: basePosition.x, z: basePosition.z + arenaSize/2 + wallThickness/2, width: arenaSize + wallThickness, depth: wallThickness },
            { x: basePosition.x, z: basePosition.z - arenaSize/2 - wallThickness/2, width: arenaSize + wallThickness, depth: wallThickness },
            { x: basePosition.x - arenaSize/2 - wallThickness/2, z: basePosition.z, width: wallThickness, depth: arenaSize },
            { x: basePosition.x + arenaSize/2 + wallThickness/2, z: basePosition.z, width: wallThickness, depth: arenaSize }
          ];
          
          wallPositions.forEach(wall => {
            const wallGeometry = new THREE.BoxGeometry(wall.width, wallHeight, wall.depth);
            const wallMesh = new THREE.Mesh(wallGeometry, baseMaterial);
            wallMesh.position.set(wall.x, 0.5 + wallHeight/2, wall.z);
            wallMesh.receiveShadow = true;
            wallMesh.castShadow = true;
            sceneRef.current!.add(wallMesh);
            
            const wallShape = new CANNON.Box(new CANNON.Vec3(wall.width/2, wallHeight/2, wall.depth/2));
            const wallBody = new CANNON.Body({ mass: 0, material: basePhysicsMaterial });
            wallBody.addShape(wallShape);
            wallBody.position.set(wall.x, 0.5 + wallHeight/2, wall.z);
            worldRef.current!.addBody(wallBody);
            
            baseElements.push({ mesh: wallMesh, body: wallBody });
          });
          break;
      }
      
      return {
        type,
        elements: baseElements,
        getTowerPosition: () => ({ 
          x: basePosition.x, 
          y: type === 'elevated' ? 2.2 : (type === 'arena' ? 0.5 : 1.3), 
          z: basePosition.z 
        }),
        getCollectionArea: () => ({
          center: { x: basePosition.x, y: 0, z: basePosition.z },
          radius: type === 'arena' ? 4 : 3
        }),
        getWallHeight: () => {
          switch(type) {
            case 'simple': return 2.0;
            case 'elevated': return 2.2;
            case 'arena': return 3.0;
            default: return 2.0;
          }
        }
      };
    };

    const newBase = createBase(selectedBase);
    currentBaseRef.current = newBase;
    console.log(`Base changed to: ${selectedBase} at position (${basePosition.x}, ${basePosition.z})`);
  }, [selectedBase, basePosition]);

  // Tower creation system
  const currentTowerRef = useRef<any>(null);
  
  useEffect(() => {
    if (!sceneRef.current || !worldRef.current || selectedTower === 'none') {
      // Remove existing tower if any
      if (currentTowerRef.current) {
        currentTowerRef.current.elements.forEach((element: any) => {
          sceneRef.current!.remove(element.mesh);
          worldRef.current!.removeBody(element.body);
        });
        currentTowerRef.current = null;
      }
      return;
    }

    // Remove old tower elements
    if (currentTowerRef.current) {
      currentTowerRef.current.elements.forEach((element: any) => {
        sceneRef.current!.remove(element.mesh);
        worldRef.current!.removeBody(element.body);
      });
    }

    // Create tower
    const createTower = (type: 'basic' | 'spiral' | 'funnel') => {
      const towerMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x696969,
        shininess: 30,
        specular: 0x444444
      });
      
      const towerPhysicsMaterial = new CANNON.Material({ friction: 0.6, restitution: 0.3 });
      const towerElements: { mesh: THREE.Mesh, body: CANNON.Body }[] = [];
      
      switch (type) {
        case 'basic':
          // Simple tower with ramps
          const baseGeometry = new THREE.BoxGeometry(2, 0.3, 4);
          const baseMesh = new THREE.Mesh(baseGeometry, towerMaterial);
          baseMesh.position.set(towerPosition.x, 3, towerPosition.z);
          baseMesh.receiveShadow = true;
          baseMesh.castShadow = true;
          sceneRef.current!.add(baseMesh);
          
          const baseShape = new CANNON.Box(new CANNON.Vec3(1, 0.15, 2));
          const baseBody = new CANNON.Body({ mass: 0, material: towerPhysicsMaterial });
          baseBody.addShape(baseShape);
          baseBody.position.set(towerPosition.x, 3, towerPosition.z);
          worldRef.current!.addBody(baseBody);
          
          towerElements.push({ mesh: baseMesh, body: baseBody });
          break;
          
        case 'spiral':
          // Spiral tower with multiple levels
          for (let i = 0; i < 3; i++) {
            const levelGeometry = new THREE.BoxGeometry(1.5, 0.2, 3);
            const levelMesh = new THREE.Mesh(levelGeometry, towerMaterial);
            levelMesh.position.set(towerPosition.x + Math.sin(i * Math.PI/2) * 0.5, 3 + i * 0.8, towerPosition.z + Math.cos(i * Math.PI/2) * 0.5);
            levelMesh.rotation.y = i * Math.PI/2;
            levelMesh.receiveShadow = true;
            levelMesh.castShadow = true;
            sceneRef.current!.add(levelMesh);
            
            const levelShape = new CANNON.Box(new CANNON.Vec3(0.75, 0.1, 1.5));
            const levelBody = new CANNON.Body({ mass: 0, material: towerPhysicsMaterial });
            levelBody.addShape(levelShape);
            levelBody.position.set(towerPosition.x + Math.sin(i * Math.PI/2) * 0.5, 3 + i * 0.8, towerPosition.z + Math.cos(i * Math.PI/2) * 0.5);
            levelBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), i * Math.PI/2);
            worldRef.current!.addBody(levelBody);
            
            towerElements.push({ mesh: levelMesh, body: levelBody });
          }
          break;
          
        case 'funnel':
          // Funnel-shaped tower
          const funnelGeometry = new THREE.ConeGeometry(2, 2, 8);
          const funnelMesh = new THREE.Mesh(funnelGeometry, towerMaterial);
          funnelMesh.position.set(towerPosition.x, 4, towerPosition.z);
          funnelMesh.receiveShadow = true;
          funnelMesh.castShadow = true;
          sceneRef.current!.add(funnelMesh);
          
          // Create funnel walls as separate physics bodies
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const wallGeometry = new THREE.BoxGeometry(0.1, 2, 1);
            const wallMesh = new THREE.Mesh(wallGeometry, towerMaterial);
            wallMesh.position.set(
              towerPosition.x + Math.cos(angle) * 1.5,
              4,
              towerPosition.z + Math.sin(angle) * 1.5
            );
            wallMesh.rotation.y = angle;
            wallMesh.receiveShadow = true;
            wallMesh.castShadow = true;
            sceneRef.current!.add(wallMesh);
            
            const wallShape = new CANNON.Box(new CANNON.Vec3(0.05, 1, 0.5));
            const wallBody = new CANNON.Body({ mass: 0, material: towerPhysicsMaterial });
            wallBody.addShape(wallShape);
            wallBody.position.set(
              towerPosition.x + Math.cos(angle) * 1.5,
              4,
              towerPosition.z + Math.sin(angle) * 1.5
            );
            wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
            worldRef.current!.addBody(wallBody);
            
            towerElements.push({ mesh: wallMesh, body: wallBody });
          }
          
          towerElements.push({ mesh: funnelMesh, body: new CANNON.Body({ mass: 0 }) }); // Visual only
          break;
      }
      
      return {
        type,
        elements: towerElements
      };
    };

    const newTower = createTower(selectedTower);
    currentTowerRef.current = newTower;
    console.log(`Tower created: ${selectedTower} at position (${towerPosition.x}, ${towerPosition.z})`);
  }, [selectedTower, towerPosition]);

  const total = rollResults.reduce((sum, result) => sum + result.result, 0) + modifier;

  return (
    <div className="app">
      <div ref={mountRef} className="scene-container" />
      
      <div className="ui-overlay">
        <div className="dice-controls">
          <h2>3D Dice Tower</h2>
          
          {/* Mode Selector */}
          <div className="mode-selector" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                onClick={() => setCurrentMode('dice')}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: currentMode === 'dice' ? '#4ecdc4' : '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🎲 Dice Roller
              </button>
              <button
                onClick={() => setCurrentMode('tower')}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: currentMode === 'tower' ? '#ff6b6b' : '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🏗️ Tower Builder
              </button>
            </div>
          </div>

          {/* Base Selector - Available in both modes */}
          <div className="base-selector" style={{ marginBottom: '15px' }}>
            <label htmlFor="base-select">Base Style:</label>
            <select
              id="base-select"
              value={selectedBase}
              onChange={(e) => setSelectedBase(e.target.value as 'simple' | 'elevated' | 'arena')}
              className="base-select"
            >
              <option value="simple">Simple Platform</option>
              <option value="elevated">Elevated Steps</option>
              <option value="arena">Arena Walls</option>
            </select>
          </div>

          {/* Dice Roller Mode */}
          {currentMode === 'dice' && (
            <div className="dice-mode">
              <DiceSelector 
                selectedDice={selectedDice}
                onDiceChange={setSelectedDice}
                isRolling={isRolling}
              />
              
              <div className="modifier-control">
                <label htmlFor="modifier">Modifier:</label>
                <input
                  id="modifier"
                  type="number"
                  value={modifier}
                  onChange={(e) => setModifier(Number(e.target.value))}
                  className="modifier-input"
                />
              </div>
              
              <button 
                onClick={rollDice}
                disabled={isRolling || selectedDice.length === 0}
                className="roll-button"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: isRolling ? '#ccc' : '#4ecdc4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isRolling ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              >
                {isRolling ? 'Rolling...' : 'Roll Dice'}
              </button>
              
              <button 
                onClick={() => {
                  console.log('Force roll button clicked');
                  rollDice();
                }}
                className="roll-button"
                style={{ 
                  width: '100%',
                  padding: '8px',
                  background: '#ff6600', 
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  marginTop: '10px',
                  fontSize: '12px'
                }}
              >
                FORCE ROLL (DEBUG)
              </button>
            </div>
          )}

          {/* Tower Builder Mode */}
          {currentMode === 'tower' && (
            <div className="tower-mode">
              <div style={{ 
                padding: '15px', 
                backgroundColor: 'rgba(255,100,100,0.1)', 
                borderRadius: '8px',
                border: '2px solid #ff6b6b'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#ff6b6b' }}>🏗️ Tower Builder</h3>
                <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#ccc' }}>
                  Select a tower shape and drag to position your base and tower.
                </p>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Tower Shape:</label>
                  <select
                    value={selectedTower}
                    onChange={(e) => setSelectedTower(e.target.value as 'none' | 'basic' | 'spiral' | 'funnel')}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#333',
                      color: 'white',
                      border: '1px solid #666',
                      borderRadius: '5px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="none">No Tower</option>
                    <option value="basic">Basic Tower</option>
                    <option value="spiral">Spiral Tower</option>
                    <option value="funnel">Funnel Tower</option>
                  </select>
                </div>

                <div style={{ 
                  padding: '10px', 
                  backgroundColor: 'rgba(255,255,255,0.1)', 
                  borderRadius: '5px',
                  marginBottom: '15px'
                }}>
                  <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 'bold' }}>
                    Drag Controls:
                  </div>
                  <div style={{ fontSize: '12px', color: '#ccc' }}>
                    • Hold SHIFT + drag to move base<br/>
                    • Hold CTRL + drag to move tower<br/>
                    • Click normally to rotate camera
                  </div>
                </div>
                
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: 'rgba(100,255,100,0.1)', 
                  borderRadius: '5px',
                  marginBottom: '15px'
                }}>
                  <div style={{ fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>
                    Current Setup:
                  </div>
                  <div style={{ fontSize: '12px', color: '#ccc' }}>
                    Base: {selectedBase} at ({basePosition.x.toFixed(1)}, {basePosition.z.toFixed(1)})<br/>
                    Tower: {selectedTower} at ({towerPosition.x.toFixed(1)}, {towerPosition.z.toFixed(1)})
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setBasePosition({ x: 0, z: 0 });
                    setTowerPosition({ x: 0, z: 0 });
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#ffa502',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    marginBottom: '10px'
                  }}
                >
                  Reset Positions
                </button>

                <button
                  onClick={() => setCurrentMode('dice')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#2ecc71',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  � Test Your Setup
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Results - Only show in dice mode */}
        {currentMode === 'dice' && rollResults.length > 0 && (
          <RollResults 
            results={rollResults}
            modifier={modifier}
            isRolling={isRolling}
          />
        )}
      </div>
    </div>
  );
};

export default App;
