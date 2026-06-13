'use client';

import React, { useState, useRef } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';

export default function ScientificCalculator() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [history, setHistory] = useState<string[]>([]);

  const handleNumber = (num: string) => {
    if (display === '0') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOperation = (op: string) => {
    const currentValue = parseFloat(display);
    
    if (previousValue === null) {
      setPreviousValue(currentValue);
    } else if (operation) {
      const result = calculate(previousValue, currentValue, operation);
      setDisplay(result.toString());
      setPreviousValue(result);
    }
    
    setOperation(op);
    setDisplay('0');
  };

  const calculate = (prev: number, current: number, op: string): number => {
    switch (op) {
      case '+': return prev + current;
      case '-': return prev - current;
      case '×': return prev * current;
      case '÷': return prev / current;
      case '%': return prev % current;
      case '^': return Math.pow(prev, current);
      default: return current;
    }
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      const currentValue = parseFloat(display);
      const result = calculate(previousValue, currentValue, operation);
      const expression = `${previousValue} ${operation} ${currentValue} = ${result}`;
      setHistory([expression, ...history.slice(0, 9)]);
      setDisplay(result.toString());
      setPreviousValue(null);
      setOperation(null);
    }
  };

  const handleScientific = (func: string) => {
    const current = parseFloat(display);
    let result: number;

    switch (func) {
      case 'sin': result = Math.sin(current * Math.PI / 180); break;
      case 'cos': result = Math.cos(current * Math.PI / 180); break;
      case 'tan': result = Math.tan(current * Math.PI / 180); break;
      case 'log': result = Math.log10(current); break;
      case 'ln': result = Math.log(current); break;
      case 'sqrt': result = Math.sqrt(current); break;
      case '1/x': result = 1 / current; break;
      case 'x²': result = current * current; break;
      default: result = current;
    }

    setDisplay(result.toFixed(8).replace(/\.?0+$/, ''));
  };

  const handleClear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
  };

  const handleBackspace = () => {
    if (display.length === 1) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handleDecimal = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans pointer-events-auto">
      {/* Calculator Panel */}
      <div className={`bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${
        isCollapsed ? 'w-14 h-14' : 'w-80'
      }`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 flex items-center justify-between cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
          <span className="text-white font-bold text-sm">🧮 Calculator</span>
          <button className="text-white hover:bg-blue-800 p-1 rounded transition-all">
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="p-4 space-y-3">
            
            {/* Display */}
            <div className="bg-black rounded-lg p-4 border border-zinc-700">
              <div className="text-right text-white text-3xl font-mono font-bold truncate">{display}</div>
              <div className="text-right text-zinc-500 text-xs mt-2 h-5">
                {previousValue !== null && operation ? `${previousValue} ${operation}` : ''}
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="bg-zinc-950 rounded-lg p-2 max-h-20 overflow-y-auto border border-zinc-800">
                <p className="text-xs text-zinc-500 font-bold mb-1">History:</p>
                {history.map((item, idx) => (
                  <div key={idx} className="text-xs text-zinc-400 font-mono truncate">{item}</div>
                ))}
              </div>
            )}

            {/* Scientific Functions */}
            <div className="grid grid-cols-4 gap-1">
              {['sin', 'cos', 'tan', 'log'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleScientific(btn)}
                  className="bg-purple-900 hover:bg-purple-800 text-white text-xs py-2 rounded font-semibold transition-colors"
                >
                  {btn}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-1">
              {['ln', 'sqrt', 'x²', '1/x'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleScientific(btn)}
                  className="bg-purple-900 hover:bg-purple-800 text-white text-xs py-2 rounded font-semibold transition-colors"
                >
                  {btn}
                </button>
              ))}
            </div>

            {/* Main Buttons */}
            <div className="grid grid-cols-4 gap-1">
              <button onClick={handleClear} className="bg-red-900 hover:bg-red-800 text-white py-2 rounded font-semibold col-span-2 transition-colors text-sm">C</button>
              <button onClick={handleBackspace} className="bg-orange-900 hover:bg-orange-800 text-white py-2 rounded font-semibold transition-colors">←</button>
              <button onClick={() => handleOperation('÷')} className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold transition-colors">÷</button>
            </div>

            {/* Numbers Row 1 */}
            <div className="grid grid-cols-4 gap-1">
              {['7', '8', '9'].map((num) => (
                <button key={num} onClick={() => handleNumber(num)} className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded font-semibold transition-colors">
                  {num}
                </button>
              ))}
              <button onClick={() => handleOperation('×')} className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold transition-colors">×</button>
            </div>

            {/* Numbers Row 2 */}
            <div className="grid grid-cols-4 gap-1">
              {['4', '5', '6'].map((num) => (
                <button key={num} onClick={() => handleNumber(num)} className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded font-semibold transition-colors">
                  {num}
                </button>
              ))}
              <button onClick={() => handleOperation('-')} className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold transition-colors">−</button>
            </div>

            {/* Numbers Row 3 */}
            <div className="grid grid-cols-4 gap-1">
              {['1', '2', '3'].map((num) => (
                <button key={num} onClick={() => handleNumber(num)} className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded font-semibold transition-colors">
                  {num}
                </button>
              ))}
              <button onClick={() => handleOperation('+')} className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold transition-colors">+</button>
            </div>

            {/* Numbers Row 4 */}
            <div className="grid grid-cols-4 gap-1">
              <button onClick={() => handleNumber('0')} className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded font-semibold col-span-2 transition-colors">0</button>
              <button onClick={handleDecimal} className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded font-semibold transition-colors">.</button>
              <button onClick={handleEquals} className="bg-green-600 hover:bg-green-700 text-white py-3 rounded font-semibold transition-colors">=</button>
            </div>

            {/* Extra Functions */}
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => handleOperation('^')} className="bg-indigo-900 hover:bg-indigo-800 text-white py-2 rounded font-semibold text-sm transition-colors">x^y</button>
              <button onClick={() => handleOperation('%')} className="bg-indigo-900 hover:bg-indigo-800 text-white py-2 rounded font-semibold text-sm transition-colors">%</button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
