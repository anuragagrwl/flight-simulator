import nipplejs, { JoystickManager, JoystickOutputData } from 'nipplejs';

export class MobileControls {
  private leftJoystick: JoystickManager | null = null;
  private rightJoystick: JoystickManager | null = null;
  private currentPitch: number = 0;
  private currentRoll: number = 0;
  private currentThrottle: number = 0;
  private isShooting: boolean = false;

  constructor(
    private container: HTMLElement,
    private onControlsUpdate: (controls: {
      pitch: number;
      roll: number;
      throttle: boolean;
      brake: boolean;
      fire: boolean;
    }) => void
  ) {
    this.createControls();
  }

  private createControls() {
    // Create left joystick container
    const leftZone = document.createElement('div');
    leftZone.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 40px;
      width: 120px;
      height: 120px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      z-index: 1000;
    `;
    this.container.appendChild(leftZone);

    // Create right joystick container
    const rightZone = document.createElement('div');
    rightZone.style.cssText = `
      position: fixed;
      bottom: 40px;
      right: 40px;
      width: 120px;
      height: 120px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      z-index: 1000;
    `;
    this.container.appendChild(rightZone);

    // Initialize left joystick (Flight Controls)
    this.leftJoystick = nipplejs.create({
      zone: leftZone,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'white',
      size: 80,
    });

    // Initialize right joystick (Throttle)
    this.rightJoystick = nipplejs.create({
      zone: rightZone,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'white',
      size: 80,
    });

    // Left joystick event handlers (Flight Controls)
    this.leftJoystick.on('move', (evt, data: JoystickOutputData) => {
      this.currentPitch = -(data.vector.y || 0);
      this.currentRoll = -(data.vector.x || 0);
      this.updateControls();
    });

    this.leftJoystick.on('end', () => {
      this.currentPitch = 0;
      this.currentRoll = 0;
      this.updateControls();
    });

    // Right joystick event handlers (Throttle only)
    this.rightJoystick.on('move', (evt, data: JoystickOutputData) => {
      // Only use vertical movement for throttle
      this.currentThrottle = -(data.vector.y || 0);
      this.updateControls();
    });

    this.rightJoystick.on('end', () => {
      this.currentThrottle = 0;
      this.updateControls();
    });

    // Add touch event listeners for shooting
    this.container.addEventListener('touchstart', (e) => {
      // Prevent touch events from triggering on joystick areas
      const touch = e.touches[0];
      const touchX = touch.clientX;
      const touchY = touch.clientY;
      
      // Check if touch is not on either joystick
      if (!this.isTouchOnJoystick(touchX, touchY, leftZone) && 
          !this.isTouchOnJoystick(touchX, touchY, rightZone)) {
        this.isShooting = true;
        this.updateControls();
      }
    });

    this.container.addEventListener('touchend', () => {
      this.isShooting = false;
      this.updateControls();
    });

    // Add labels for the joysticks
    const createLabel = (text: string, isLeft: boolean) => {
      const label = document.createElement('div');
      label.style.cssText = `
        position: fixed;
        bottom: 170px;
        ${isLeft ? 'left' : 'right'}: 40px;
        color: white;
        font-family: Arial;
        font-size: 14px;
        text-align: center;
        width: 120px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        z-index: 1000;
      `;
      label.textContent = text;
      this.container.appendChild(label);
      return label;
    };

    createLabel('Flight Controls', true);
    createLabel('Throttle', false);
  }

  private isTouchOnJoystick(x: number, y: number, joystickElement: HTMLElement): boolean {
    const rect = joystickElement.getBoundingClientRect();
    return (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    );
  }

  private updateControls() {
    this.onControlsUpdate({
      pitch: this.currentPitch,
      roll: this.currentRoll,
      throttle: this.currentThrottle > 0.3,
      brake: this.currentThrottle < -0.3,
      fire: this.isShooting,
    });
  }

  public dispose() {
    this.leftJoystick?.destroy();
    this.rightJoystick?.destroy();
    // Remove all child elements we added
    const elements = this.container.querySelectorAll('div');
    elements.forEach(element => {
      if (element.style.position === 'fixed') {
        element.remove();
      }
    });
  }
}