import React from 'react';
import { DiceRoll } from '../../../shared/src/types';

interface RollResultsProps {
  results: DiceRoll[];
  modifier: number;
  isRolling: boolean;
}

export const RollResults: React.FC<RollResultsProps> = ({
  results,
  modifier,
  isRolling
}) => {
  const total = results.reduce((sum, roll) => sum + roll.result, 0) + modifier;
  
  const getDiceEmoji = (type: string) => {
    const emojis = {
      'd4': '🔺',
      'd6': '🎲',
      'd8': '🔸',
      'd10': '🔟',
      'd12': '🌟',
      'd20': '⭐',
      'd100': '💯'
    };
    return emojis[type as keyof typeof emojis] || '🎲';
  };

  if (isRolling) {
    return (
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '20px',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        minWidth: '250px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: '18px'
        }}>
          🎲 Rolling dice...
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: 20,
      background: 'rgba(0, 0, 0, 0.8)',
      padding: '20px',
      borderRadius: '10px',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      minWidth: '250px'
    }}>
      <h3 style={{ margin: '0 0 15px 0' }}>🎯 Roll Results</h3>
      
      <div style={{ marginBottom: '15px' }}>
        {results.map((roll, index) => (
          <div 
            key={index}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '5px 0',
              borderBottom: index < results.length - 1 ? '1px solid #333' : 'none'
            }}
          >
            <span>
              {getDiceEmoji(roll.type)} {roll.type.toUpperCase()}
            </span>
            <span style={{ 
              fontSize: '18px', 
              fontWeight: 'bold',
              color: '#4CAF50'
            }}>
              {roll.result}
            </span>
          </div>
        ))}
      </div>

      {modifier !== 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '5px 0',
          borderTop: '1px solid #333',
          color: '#FFC107'
        }}>
          <span>Modifier:</span>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
            {modifier > 0 ? '+' : ''}{modifier}
          </span>
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderTop: '2px solid #555',
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#FFD700'
      }}>
        <span>Total:</span>
        <span>{total}</span>
      </div>
    </div>
  );
};
