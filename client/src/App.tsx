import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { DiceType, DiceRoll } from '../../shared/src/types';
import { DiceSelector } from './components/DiceSelector';
import { RollResults } from './components/RollResults';
import { DiceFactory, DiceGeometry } from './utils/DiceFactory';

const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedDice, setSelectedDice] = useState<DiceType[]>(['d6']);
  const [isRolling, setIsRolling] = useState(false);
  const [rollResults, setRollResults] = useState<DiceRoll[]>([]);
  const [modifier, setModifier] = useState(0);

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

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    camera.position.set(8, 8, 8);
    camera.lookAt(0, 0, 0);

    // Store active dice
    let activeDice: DiceGeometry[] = [];

    // Roll function
    const rollDice = () => {
      if (selectedDice.length === 0) return;
      
      setIsRolling(true);
      setRollResults([]);
      
      // Clear existing dice
      activeDice.forEach(dice => {
        DiceFactory.removeDice(dice, world, scene);
      });
      activeDice = [];

      // Create new dice
      selectedDice.forEach((diceType, index) => {
        const dice = DiceFactory.createDice(diceType, world, scene);
        
        // Position dice in a spread pattern
        const angle = (index / selectedDice.length) * Math.PI * 2;
        const radius = Math.min(2, selectedDice.length * 0.5);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        dice.body.position.set(x, 5 + Math.random() * 2, z);
        
        // Apply random impulse
        const force = new CANNON.Vec3(
          (Math.random() - 0.5) * 8,
          2 + Math.random() * 3,
          (Math.random() - 0.5) * 8
        );
        dice.body.applyImpulse(force, dice.body.position);
        
        // Apply random torque
        const torque = new CANNON.Vec3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        );
        dice.body.torque = torque;

        activeDice.push(dice);
      });

      // Check for dice rest after a delay
      setTimeout(() => {
        const checkRest = () => {
          const allAtRest = activeDice.every(dice => 
            dice.body.velocity.length() < 0.1 && dice.body.angularVelocity.length() < 0.1
          );

          if (allAtRest) {
            setIsRolling(false);
            // Calculate results
            const results: DiceRoll[] = activeDice.map(dice => ({
              type: dice.type,
              result: DiceFactory.getDiceFaceValue(dice.type, dice.body.quaternion)
            }));
            setRollResults(results);
          } else {
            setTimeout(checkRest, 100);
          }
        };
        checkRest();
      }, 1500);
    };

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Step physics
      world.step(1/60);
      
      // Update visual dice positions and rotations from physics
      activeDice.forEach(dice => {
        dice.mesh.position.copy(dice.body.position as any);
        dice.mesh.quaternion.copy(dice.body.quaternion as any);
      });
      
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
    const handleClick = (event: MouseEvent) => {
      // Don't roll if clicking on UI elements
      const target = event.target as HTMLElement;
      if (target.closest('[data-ui]')) return;
      
      if (!isRolling && selectedDice.length > 0) {
        rollDice();
      }
    };
    
    renderer.domElement.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      
      // Clean up dice
      activeDice.forEach(dice => {
        DiceFactory.removeDice(dice, world, scene);
      });
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [selectedDice, isRolling]);

  return (
    <div>
      <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
      
      <div data-ui>
        <DiceSelector
          selectedDice={selectedDice}
          onDiceChange={setSelectedDice}
          isRolling={isRolling}
        />
      </div>

      <div data-ui>
        <RollResults
          results={rollResults}
          modifier={modifier}
          isRolling={isRolling}
        />
      </div>

      {/* Modifier Controls */}
      <div data-ui style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '15px',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Modifier:</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setModifier(Math.max(-20, modifier - 1))}
            disabled={isRolling}
            style={{
              background: isRolling ? '#666' : '#f44336',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: isRolling ? 'not-allowed' : 'pointer'
            }}
          >
            -1
          </button>
          <span style={{ 
            minWidth: '40px', 
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            {modifier > 0 ? '+' : ''}{modifier}
          </span>
          <button
            onClick={() => setModifier(Math.min(20, modifier + 1))}
            disabled={isRolling}
            style={{
              background: isRolling ? '#666' : '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: isRolling ? 'not-allowed' : 'pointer'
            }}
          >
            +1
          </button>
        </div>
        <button
          onClick={() => setModifier(0)}
          disabled={isRolling || modifier === 0}
          style={{
            background: isRolling || modifier === 0 ? '#666' : '#FF9800',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: isRolling || modifier === 0 ? 'not-allowed' : 'pointer',
            marginTop: '8px',
            width: '100%',
            fontSize: '12px'
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default App;
