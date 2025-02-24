import React, { useEffect, useRef, useState } from 'react';
import { Plane } from 'lucide-react';
import { FlightSimulator } from './FlightSimulator';

type Environment = 'default' | 'desert' | 'snow' | 'night';
type Difficulty = 'simple' | 'hard';

function App() {
  const [isStarted, setIsStarted] = React.useState(false);
  const [environment, setEnvironment] = useState<Environment>('default');
  const [difficulty, setDifficulty] = useState<Difficulty>('simple');
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<FlightSimulator | null>(null);
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  useEffect(() => {
    if (isStarted && containerRef.current && !gameRef.current) {
      gameRef.current = new FlightSimulator(containerRef.current, environment, difficulty);
      gameRef.current.init();
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.dispose();
        gameRef.current = null;
      }
    };
  }, [isStarted, environment, difficulty]);

  const renderControls = () => {
    if (isMobile) {
      return (
        <div className="text-left">
          <p className="font-bold mb-3">Game Controls:</p>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-12 h-12 border-2 border-white rounded-full flex items-center justify-center">
                  <span className="text-2xl">👆</span>
                </div>
                <span>Left Joystick</span>
              </div>
              <ul className="space-y-1 ml-14 text-sm opacity-80">
                <li>• Up/Down for pitch control</li>
                <li>• Left/Right for roll control</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-12 h-12 border-2 border-white rounded-full flex items-center justify-center">
                  <span className="text-2xl">👆</span>
                </div>
                <span>Right Joystick</span>
              </div>
              <ul className="space-y-1 ml-14 text-sm opacity-80">
                <li>• Up/Down for throttle control</li>
                <li>• Left/Right to fire weapons</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-left">
        <p className="font-bold mb-3">Keyboard Controls:</p>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="font-semibold mb-2">Flight Controls</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded">↑</kbd>
                <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded">↓</kbd>
                <span className="ml-2">Pitch (up/down)</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded">←</kbd>
                <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded">→</kbd>
                <span className="ml-2">Roll (left/right)</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Speed & Weapons</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded">W</kbd>
                <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded">S</kbd>
                <span className="ml-2">Throttle</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-3 py-1 bg-white bg-opacity-20 rounded">SPACE</kbd>
                <span className="ml-2">Fire bullets</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded">R</kbd>
                <span className="ml-2">Reset Position</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <Plane className="w-24 h-24 text-white mx-auto mb-8" />
          <div className="space-y-8 mb-8">
            <div className="flex gap-4 justify-center">
              <div className="flex-1">
                <label className="block text-white mb-2">Environment:</label>
                <select
                  className="w-full bg-white text-black px-4 py-2 rounded-lg"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as Environment)}
                >
                  <option value="default">Green Valley</option>
                  <option value="desert">Desert</option>
                  <option value="snow">Snowy Mountains</option>
                  <option value="night">Night Flight</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-white mb-2">Difficulty:</label>
                <select
                  className="w-full bg-white text-black px-4 py-2 rounded-lg"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                >
                  <option value="simple">Simple</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsStarted(true)}
            className="w-full bg-white text-black px-8 py-4 rounded-lg text-xl font-bold hover:bg-gray-200 transition-colors"
          >
            Click Start
          </button>
          <div className="mt-8 text-white">
            {renderControls()}
          </div>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-screen" />;
}

export default App;