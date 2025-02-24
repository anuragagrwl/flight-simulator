# Flight Simulator

A modern 3D flight simulator built with Three.js and React. Experience realistic flight physics, dynamic weather, and engaging combat mechanics.

## Features

### Environments
- Green Valley (Default): Lush landscapes with mountains and clear skies
- Desert: Arid terrain with sand dunes and heat distortion effects
- Snowy Mountains: Winter wonderland with snow-capped peaks
- Night Flight: Dark environment with moonlight and enhanced visibility effects

### Flight Physics
- Realistic flight dynamics with proper lift and drag
- Minimum speed requirement (0.5 units) for takeoff
- Drag coefficient (0.001) for authentic air resistance
- Zero initial speed with gradual takeoff mechanics
- Weather effects impact flight performance
- Smooth controls with proper inertia

### Combat System
- Shoot down balloons for points
- Dodge or navigate through obstacles
- Health system with collision damage
- Score tracking and timer
- Game over state with restart option

### Weather System
- Dynamic weather conditions
- Rain effects with varying intensity
- Cloud formations that affect visibility
- Weather impacts flight performance
- Realistic fog and visibility changes

### Controls

Desktop:
- ↑/↓ - Pitch (up/down)
- ←/→ - Roll (left/right)
- W/S - Throttle control
- SPACE - Fire weapons
- R - Reset position
- M - Toggle sound

Mobile:
- Left joystick: Flight controls (pitch and roll)
- Right joystick: Throttle control
- Touch screen: Fire weapons

### Difficulty Levels
- Simple: Standard flight physics, static targets
- Hard: Enhanced physics, moving targets, increased weather effects

## Technical Details

Built with:
- Three.js for 3D graphics
- React for UI components
- TypeScript for type safety
- Tailwind CSS for styling
- Nipple.js for mobile controls

## Performance Optimizations
- Efficient render loop
- Object pooling for bullets
- Optimized collision detection
- Responsive design for all devices
- Mobile-specific control optimizations
