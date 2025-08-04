import React from 'react';
import { DiceType } from '../../../shared/src/types';

interface DiceSelectorProps {
  selectedDice: DiceType[];
  onDiceChange: (dice: DiceType[]) => void;
  isRolling: boolean;
}

const DICE_TYPES: { type: DiceType; name: string; emoji: string }[] = [
  { type: 'd4', name: 'D4', emoji: '🔺' },
  { type: 'd6', name: 'D6', emoji: '🎲' },
  { type: 'd8', name: 'D8', emoji: '🔸' },
  { type: 'd10', name: 'D10', emoji: '🔟' },
  { type: 'd12', name: 'D12', emoji: '🌟' },
  { type: 'd20', name: 'D20', emoji: '⭐' },
  { type: 'd100', name: 'D100', emoji: '💯' },
];

export const DiceSelector: React.FC<DiceSelectorProps> = ({
  selectedDice,
  onDiceChange,
  isRolling
}) => {
  const addDie = (type: DiceType) => {
    if (!isRolling) {
      onDiceChange([...selectedDice, type]);
    }
  };

  const removeDie = (index: number) => {
    if (!isRolling) {
      const newDice = selectedDice.filter((_, i) => i !== index);
      onDiceChange(newDice);
    }
  };

  const clearAll = () => {
    if (!isRolling) {
      onDiceChange([]);
    }
  };

  const getDiceCount = (type: DiceType) => {
    return selectedDice.filter(d => d === type).length;
  };

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: 20,
      background: 'rgba(0, 0, 0, 0.8)',
      padding: '20px',
      borderRadius: '10px',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      minWidth: '250px'
    }}>
      <h3 style={{ margin: '0 0 15px 0' }}>🎲 Dice Roller</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Select Dice:</strong>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '8px', 
          marginTop: '8px' 
        }}>
          {DICE_TYPES.map(({ type, name, emoji }) => (
            <button
              key={type}
              onClick={() => addDie(type)}
              disabled={isRolling}
              style={{
                background: isRolling ? '#666' : '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '5px',
                cursor: isRolling ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>{emoji} {name}</span>
              {getDiceCount(type) > 0 && (
                <span style={{
                  background: 'rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>
                  {getDiceCount(type)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Selected Dice ({selectedDice.length}):</strong>
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '4px', 
          marginTop: '8px',
          minHeight: '30px'
        }}>
          {selectedDice.map((type, index) => (
            <span
              key={index}
              onClick={() => removeDie(index)}
              style={{
                background: '#ff6b6b',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '12px',
                cursor: isRolling ? 'not-allowed' : 'pointer',
                opacity: isRolling ? 0.5 : 1
              }}
            >
              {DICE_TYPES.find(d => d.type === type)?.emoji} {type.toUpperCase()}
            </span>
          ))}
          {selectedDice.length === 0 && (
            <span style={{ color: '#999', fontSize: '12px' }}>
              No dice selected
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={clearAll}
          disabled={isRolling || selectedDice.length === 0}
          style={{
            background: isRolling || selectedDice.length === 0 ? '#666' : '#f44336',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '5px',
            cursor: isRolling || selectedDice.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          Clear All
        </button>
      </div>

      <div style={{ marginTop: '15px', fontSize: '12px', color: '#ccc' }}>
        {selectedDice.length > 0 ? 'Click anywhere to roll!' : 'Add dice to get started'}
      </div>
    </div>
  );
};
