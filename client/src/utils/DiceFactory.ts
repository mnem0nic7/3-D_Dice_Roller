import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { DiceType } from '../../../shared/src/types';

export interface DiceGeometry {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  type: DiceType;
  id: string;
}

export class DiceFactory {
  private static createDiceGeometry(type: DiceType): { geometry: THREE.BufferGeometry; shape: CANNON.Shape } {
    switch (type) {
      case 'd4':
        return {
          geometry: new THREE.TetrahedronGeometry(1),
          shape: new CANNON.Box(new CANNON.Vec3(0.8, 0.8, 0.8)) // Approximate with box for simplicity
        };
      
      case 'd6':
        return {
          geometry: new THREE.BoxGeometry(1, 1, 1),
          shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
        };
      
      case 'd8':
        return {
          geometry: new THREE.OctahedronGeometry(1),
          shape: new CANNON.Box(new CANNON.Vec3(0.7, 0.7, 0.7)) // Approximate with box
        };
      
      case 'd10':
        // Create a pentagonal trapezohedron approximation
        const d10Geometry = new THREE.ConeGeometry(0.8, 1.6, 10);
        return {
          geometry: d10Geometry,
          shape: new CANNON.Cylinder(0.8, 0.8, 1.6, 8)
        };
      
      case 'd12':
        return {
          geometry: new THREE.DodecahedronGeometry(1),
          shape: new CANNON.Box(new CANNON.Vec3(0.9, 0.9, 0.9)) // Approximate with box
        };
      
      case 'd20':
        return {
          geometry: new THREE.IcosahedronGeometry(1),
          shape: new CANNON.Box(new CANNON.Vec3(0.8, 0.8, 0.8)) // Approximate with box
        };
      
      case 'd100':
        // Use a larger icosahedron for d100
        return {
          geometry: new THREE.IcosahedronGeometry(1.2),
          shape: new CANNON.Box(new CANNON.Vec3(1, 1, 1))
        };
      
      default:
        return {
          geometry: new THREE.BoxGeometry(1, 1, 1),
          shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
        };
    }
  }

  private static getDiceColor(type: DiceType): number {
    const colors = {
      'd4': 0x4CAF50,    // Green
      'd6': 0xff6b6b,    // Red
      'd8': 0x2196F3,    // Blue
      'd10': 0xFF9800,   // Orange
      'd12': 0x9C27B0,   // Purple
      'd20': 0xFFEB3B,   // Yellow
      'd100': 0x607D8B   // Blue Gray
    };
    return colors[type] || 0xff6b6b;
  }

  public static createDice(type: DiceType, world: CANNON.World, scene: THREE.Scene): DiceGeometry {
    const { geometry, shape } = this.createDiceGeometry(type);
    const color = this.getDiceColor(type);
    
    // Create visual mesh
    const material = new THREE.MeshPhongMaterial({ 
      color,
      shininess: 100,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    scene.add(mesh);

    // Create physics body
    const body = new CANNON.Body({ mass: 1 });
    body.addShape(shape);
    body.material = new CANNON.Material({ 
      friction: 0.4, 
      restitution: 0.3 
    });
    world.addBody(body);

    return {
      mesh,
      body,
      type,
      id: Math.random().toString(36).substring(7)
    };
  }

  public static getMaxValue(type: DiceType): number {
    const values = {
      'd4': 4,
      'd6': 6,
      'd8': 8,
      'd10': 10,
      'd12': 12,
      'd20': 20,
      'd100': 100
    };
    return values[type] || 6;
  }

  public static getDiceFaceValue(type: DiceType, quaternion: CANNON.Quaternion): number {
    // For now, use random for simplicity. In a real implementation,
    // you'd calculate based on the actual orientation
    const maxValue = this.getMaxValue(type);
    return Math.floor(Math.random() * maxValue) + 1;
  }

  public static removeDice(dice: DiceGeometry, world: CANNON.World, scene: THREE.Scene): void {
    world.removeBody(dice.body);
    scene.remove(dice.mesh);
    dice.mesh.geometry.dispose();
    if (dice.mesh.material instanceof THREE.Material) {
      dice.mesh.material.dispose();
    }
  }
}
