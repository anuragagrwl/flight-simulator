import * as THREE from 'three';
import { MobileControls } from './MobileControls';
import { SoundManager } from './SoundManager';

type Environment = 'default' | 'desert' | 'snow' | 'night';
type Difficulty = 'simple' | 'hard';

export class FlightSimulator {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private airplane: THREE.Group;
  private speed = 0;
  private pitch = 0;
  private roll = 0;
  private yaw = 0;
  private altitude = 0;
  private maxSpeed = 3;
  private minSpeed = 0.5;
  private dragCoefficient = 0.001;
  private hudElement: HTMLDivElement;
  private keys: { [key: string]: boolean } = {};
  private initialPosition = new THREE.Vector3(0, 2, 50);
  private initialRotation = new THREE.Euler(0, 0, 0);
  private speedLines: THREE.Line[] = [];
  private bullets: THREE.Mesh[] = [];
  private balloons: THREE.Mesh[] = [];
  private obstacles: THREE.Mesh[] = [];
  private score = 0;
  private lastShot = 0;
  private shotCooldown = 50;
  private health = 100;
  private isGameOver = false;
  private raindrops: THREE.Points[] = [];
  private clouds: THREE.Mesh[] = [];
  private weatherIntensity = 0.5;
  private mobileControls: MobileControls | null = null;
  private warningElement: HTMLDivElement;
  private weatherUpdateInterval: number;
  private startTime: number = 0;
  private elapsedTime: number = 0;
  private timerElement: HTMLDivElement;
  private isShooting = false;
  private soundManager: SoundManager;

  private createAirplane(): THREE.Group {
    const airplane = new THREE.Group();

    // Create fuselage
    const fuselageGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 16);
    const fuselageMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFFFFF,
      shininess: 100,
    });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    fuselage.rotation.z = Math.PI / 2;
    airplane.add(fuselage);

    // Create main wing
    const wingGeometry = new THREE.BoxGeometry(5, 0.1, 1);
    const wingMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFFFFF,
      shininess: 80,
    });
    const mainWing = new THREE.Mesh(wingGeometry, wingMaterial);
    mainWing.position.set(0, 0, 0);
    airplane.add(mainWing);

    // Create tail
    const tailGeometry = new THREE.BoxGeometry(1.5, 0.1, 0.8);
    const tail = new THREE.Mesh(tailGeometry, wingMaterial);
    tail.position.set(-1.8, 0, 0);
    airplane.add(tail);

    // Create vertical stabilizer
    const stabilizerGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.1);
    const stabilizer = new THREE.Mesh(stabilizerGeometry, wingMaterial);
    stabilizer.position.set(-1.8, 0.4, 0);
    airplane.add(stabilizer);

    // Create nose cone
    const noseGeometry = new THREE.ConeGeometry(0.5, 1, 16);
    const noseMaterial = new THREE.MeshPhongMaterial({
      color: 0xFF0000,
      shininess: 100,
    });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.rotation.z = -Math.PI / 2;
    nose.position.set(2, 0, 0);
    airplane.add(nose);

    // Add cockpit
    const cockpitGeometry = new THREE.SphereGeometry(0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMaterial = new THREE.MeshPhongMaterial({
      color: 0x87CEEB,
      shininess: 150,
      transparent: true,
      opacity: 0.6,
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0.5, 0.3, 0);
    airplane.add(cockpit);

    // Scale the entire airplane
    airplane.scale.set(0.7, 0.7, 0.7);
    
    return airplane;
  }

  constructor(
    private container: HTMLElement,
    private environment: Environment = 'default',
    private difficulty: Difficulty = 'simple'
  ) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.airplane = this.createAirplane();
    this.soundManager = new SoundManager();
    
    // Set initial speed to 0
    this.speed = 0;
    
    // Adjust scene based on environment
    if (this.environment === 'night') {
      this.scene.background = new THREE.Color(0x000033);
      this.scene.fog = new THREE.Fog(0x000033, 500, 3000);
      
      // Add moon light
      const moonLight = new THREE.DirectionalLight(0x4444ff, 0.5);
      moonLight.position.set(100, 100, 50);
      this.scene.add(moonLight);
      
      const ambientLight = new THREE.AmbientLight(0x111111, 0.3);
      this.scene.add(ambientLight);
    } else {
      this.scene.background = new THREE.Color(0x87CEEB);
      this.scene.fog = new THREE.Fog(0x87CEEB, 500, 5000);
      
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(100, 100, 50);
      this.scene.add(ambientLight, directionalLight);
    }
    
    this.scene.add(this.airplane);
    this.hudElement = this.createHUD();
    this.warningElement = this.createWarningHUD();
    this.timerElement = this.createTimer();
    
    this.createEnvironment();
    this.createSpeedLines();
    this.spawnBalloons();
    this.createObstacles();
    this.createWeatherEffects();

    if (this.isMobileDevice()) {
      this.mobileControls = new MobileControls(container, this.handleMobileControls.bind(this));
    }

    this.weatherUpdateInterval = setInterval(() => {
      this.updateWeather();
    }, 100);

    this.startTime = Date.now();

    window.addEventListener('keydown', (event) => {
      this.keys[event.key] = true;
      if (event.key === ' ') {
        this.isShooting = true;
      }
      if (event.key === 'r' || event.key === 'R') {
        this.resetAirplane();
      }
      if (event.key === 'm' || event.key === 'M') {
        this.soundManager.toggleMute();
      }
    });

    window.addEventListener('keyup', (event) => {
      this.keys[event.key] = false;
      if (event.key === ' ') {
        this.isShooting = false;
      }
    });

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private createTimer(): HTMLDivElement {
    const timer = document.createElement('div');
    timer.style.position = 'fixed';
    timer.style.top = '20px';
    timer.style.right = '20px';
    timer.style.color = 'white';
    timer.style.fontFamily = 'monospace';
    timer.style.fontSize = '24px';
    timer.style.textShadow = '2px 2px 2px rgba(0,0,0,0.5)';
    document.body.appendChild(timer);
    return timer;
  }

  private updateTimer() {
    if (!this.isGameOver) {
      this.elapsedTime = (Date.now() - this.startTime) / 1000;
      const minutes = Math.floor(this.elapsedTime / 60);
      const seconds = Math.floor(this.elapsedTime % 60);
      this.timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  private createHUD(): HTMLDivElement {
    const hud = document.createElement('div');
    hud.style.position = 'fixed';
    hud.style.top = '20px';
    hud.style.left = '20px';
    hud.style.color = 'white';
    hud.style.fontFamily = 'monospace';
    hud.style.fontSize = '16px';
    hud.style.textShadow = '2px 2px 2px rgba(0,0,0,0.5)';
    document.body.appendChild(hud);
    return hud;
  }

  private createWarningHUD(): HTMLDivElement {
    const warning = document.createElement('div');
    warning.style.position = 'fixed';
    warning.style.top = '50%';
    warning.style.left = '50%';
    warning.style.transform = 'translate(-50%, -50%)';
    warning.style.color = 'red';
    warning.style.fontFamily = 'monospace';
    warning.style.fontSize = '24px';
    warning.style.textShadow = '2px 2px 2px rgba(0,0,0,0.5)';
    warning.style.display = 'none';
    document.body.appendChild(warning);
    return warning;
  }

  private showWarning(message: string) {
    this.warningElement.textContent = message;
    this.warningElement.style.display = 'block';
    setTimeout(() => {
      this.warningElement.style.display = 'none';
    }, 2000);
  }

  private gameOver() {
    this.isGameOver = true;
    this.showWarning('GAME OVER - Press R to restart');
    this.soundManager.stopEngineSound();
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private handleMobileControls(controls: {
    pitch: number;
    roll: number;
    throttle: boolean;
    brake: boolean;
    fire: boolean;
  }) {
    this.pitch = controls.pitch * (Math.PI / 6);
    this.roll = controls.roll * (Math.PI / 6);
    
    if (controls.throttle) {
      this.speed = Math.min(this.speed + 0.05, this.maxSpeed);
    } else if (controls.brake) {
      this.speed = Math.max(this.speed - 0.05, 0);
    }
    
    this.isShooting = controls.fire;
  }

  private updateHUD() {
    const speed = Math.round(this.speed * 100);
    const altitude = Math.round(this.altitude);
    const pitch = Math.round((this.pitch * 180) / Math.PI);
    const roll = Math.round((this.roll * 180) / Math.PI);
    const weather = Math.round(this.weatherIntensity * 100);

    this.hudElement.innerHTML = `
      <div style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 5px;">
        <div style="color: ${this.speed > this.maxSpeed * 0.8 ? 'red' : 'white'}">
          SPEED: ${speed} knots
        </div>
        <div style="color: ${this.altitude < 20 ? 'red' : 'white'}">
          ALTITUDE: ${altitude} ft
        </div>
        <div>PITCH: ${pitch}°</div>
        <div>ROLL: ${roll}°</div>
        <div>SCORE: ${this.score}</div>
        <div>HEALTH: ${this.health}%</div>
        <div>WEATHER: ${weather}%</div>
        <div>DIFFICULTY: ${this.difficulty}</div>
      </div>
    `;
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.updateFlight();
    this.updateBalloons();
    this.updateTimer();
    
    if (this.isShooting) {
      this.shoot();
    }
    
    this.soundManager.updateEngineSound(this.speed, this.maxSpeed);
    
    this.renderer.render(this.scene, this.camera);
  }

  private updateFlight() {
    if (this.isGameOver) return;

    // Handle throttle input
    if (this.keys['w']) {
      // Accelerate to max speed
      this.speed = Math.min(this.speed + 0.05, this.maxSpeed);
    } else if (this.keys['s']) {
      // Apply brakes
      this.speed = Math.max(this.speed - 0.05, 0);
    }
    // No else clause - speed remains constant when no input

    // Apply minimum speed constraint
    if (this.speed > 0 && this.speed < this.minSpeed) {
      this.speed = this.minSpeed;
    }

    // Apply weather effects to speed
    if (this.weatherIntensity > 0.5) {
      this.speed *= (1 - this.weatherIntensity * 0.01);
    }

    if (this.keys['ArrowUp']) {
      this.pitch = Math.min(this.pitch + 0.02, Math.PI / 3);
    } else if (this.keys['ArrowDown']) {
      this.pitch = Math.max(this.pitch - 0.02, -Math.PI / 3);
    }

    if (this.keys['ArrowLeft']) {
      this.roll = Math.min(this.roll + 0.02, Math.PI / 3);
      this.yaw += 0.01;
    } else if (this.keys['ArrowRight']) {
      this.roll = Math.max(this.roll - 0.02, -Math.PI / 3);
      this.yaw -= 0.01;
    } else {
      this.roll *= 0.95;
    }

    this.airplane.rotation.set(0, 0, 0);
    this.airplane.rotateY(this.yaw);
    this.airplane.rotateX(this.pitch);
    this.airplane.rotateZ(this.roll);

    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.airplane.quaternion);
    
    const lift = Math.max(0, this.speed * 0.02);
    direction.y += lift;
    
    if (this.weatherIntensity > 0.5) {
      direction.x += (Math.random() - 0.5) * 0.1 * this.weatherIntensity;
      direction.y += (Math.random() - 0.5) * 0.1 * this.weatherIntensity;
    }
    
    this.airplane.position.add(direction.multiplyScalar(this.speed));

    this.altitude = this.airplane.position.y;
    if (this.altitude < 0.5) {
      this.airplane.position.y = 0.5;
      this.speed = Math.max(0, this.speed - 0.1);
      if (this.speed > 1) {
        this.health -= 10;
        this.showWarning('Hard Landing!');
        this.soundManager.playExplosionSound();
        if (this.health <= 0) {
          this.gameOver();
        }
      }
    }

    const idealOffset = new THREE.Vector3(0, 2, 10);
    idealOffset.applyQuaternion(this.airplane.quaternion);
    const currentOffset = this.camera.position.clone().sub(this.airplane.position);
    const newOffset = currentOffset.lerp(idealOffset, 0.1);
    
    this.camera.position.copy(this.airplane.position).add(newOffset);
    this.camera.lookAt(this.airplane.position);

    this.checkCollisions();
    this.updateWeather();
    this.updateHUD();
    this.updateSpeedLines();
    this.updateBullets();
  }

  private resetAirplane() {
    this.airplane.position.copy(this.initialPosition);
    this.airplane.rotation.copy(this.initialRotation);
    this.speed = 0;
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.health = 100;
    this.isGameOver = false;
    this.startTime = Date.now();
    this.soundManager.startBackgroundMusic();
  }

  private shoot() {
    if (this.isGameOver) return;
    
    const now = Date.now();
    if (now - this.lastShot < this.shotCooldown) return;
    this.lastShot = now;

    const bulletGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const bulletMaterial = new THREE.MeshPhongMaterial({
      color: 0xffff00,
      emissive: 0xff8800,
    });
    
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.airplane.quaternion);
    
    bullet.position.copy(this.airplane.position);
    bullet.velocity = direction.multiplyScalar(12);
    
    this.bullets.push(bullet);
    this.scene.add(bullet);
    this.soundManager.playGunSound();
  }

  private createSpeedLines() {
    const lineCount = 50;
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });

    for (let i = 0; i < lineCount; i++) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -20),
      ]);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );
      this.speedLines.push(line);
      this.scene.add(line);
    }
  }

  private updateSpeedLines() {
    const speedFactor = this.speed / this.maxSpeed;
    this.speedLines.forEach((line) => {
      line.position.z += this.speed * 2;
      line.material.opacity = 0.3 * speedFactor;
      if (line.position.z > 20) {
        line.position.z = -20;
      }
    });
  }

  private updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.position.add(bullet.velocity);
      
      if (bullet.position.length() > 1000) {
        this.scene.remove(bullet);
        this.bullets.splice(i, 1);
        continue;
      }
      
      for (let j = this.balloons.length - 1; j >= 0; j--) {
        const balloon = this.balloons[j];
        const distance = bullet.position.distanceTo(balloon.position);
        
        if (distance < 6) {
          this.scene.remove(balloon);
          this.balloons.splice(j, 1);
          this.scene.remove(bullet);
          this.bullets.splice(i, 1);
          this.score += 100;
          this.soundManager.playExplosionSound();
          
          setTimeout(() => {
            const newBalloon = balloon.clone();
            newBalloon.position.set(
              (Math.random() - 0.5) * 1000,
              50 + Math.random() * 200,
              (Math.random() - 0.5) * 1000
            );
            if (this.difficulty === 'hard') {
              newBalloon.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                Math.sin(Math.random() * Math.PI * 2) * 0.2,
                (Math.random() - 0.5) * 0.5
              );
            }
            this.balloons.push(newBalloon);
            this.scene.add(newBalloon);
          }, 2000);
          
          break;
        }
      }
    }
  }

  private createEnvironment() {
    const groundColor = this.environment === 'desert' ? 0xffd700 :
                       this.environment === 'snow' ? 0xffffff :
                       this.environment === 'night' ? 0x1a1a1a :
                       0x90EE90;

    const flatAreaSize = 400;
    const groundGeometry = new THREE.PlaneGeometry(flatAreaSize, flatAreaSize);
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: groundColor,
      shininess: 10,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const runwayLength = 200;
    const runwayWidth = 30;
    const runwayGeometry = new THREE.PlaneGeometry(runwayWidth, runwayLength);
    const runwayMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      shininess: 10,
    });
    const runway = new THREE.Mesh(runwayGeometry, runwayMaterial);
    runway.rotation.x = -Math.PI / 2;
    runway.position.y = 0.01;
    this.scene.add(runway);

    const createRunwayMarking = (length: number, width: number, x: number, z: number) => {
      const marking = new THREE.Mesh(
        new THREE.PlaneGeometry(width, length),
        new THREE.MeshPhongMaterial({ color: 0xFFFFFF })
      );
      marking.rotation.x = -Math.PI / 2;
      marking.position.set(x, 0.02, z);
      return marking;
    };

    for (let z = -runwayLength/2 + 5; z < runwayLength/2; z += 15) {
      this.scene.add(createRunwayMarking(10, 0.5, 0, z));
    }

    this.scene.add(createRunwayMarking(runwayLength, 1, -runwayWidth/2 + 0.5, 0));
    this.scene.add(createRunwayMarking(runwayLength, 1, runwayWidth/2 - 0.5, 0));

    const mountainColors = this.environment === 'desert' ? [0xffd700, 0xdaa520, 0xcd853f] :
                          this.environment === 'snow' ? [0xffffff, 0xf0f8ff, 0xe6e6fa] :
                          this.environment === 'night' ? [0x000033, 0x000066, 0x000099] :
                          [0x8B4513, 0xA0522D, 0x6B4423];
    
    const safeDistance = runwayLength;
    
    for (let i = 0; i < 40; i++) {
      const mountainGeometry = new THREE.ConeGeometry(
        30 + Math.random() * 40,
        60 + Math.random() * 80,
        4
      );
      const mountainMaterial = new THREE.MeshPhongMaterial({
        color: mountainColors[Math.floor(Math.random() * mountainColors.length)],
        flatShading: true,
      });
      const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
      
      let x, z;
      do {
        x = (Math.random() - 0.5) * flatAreaSize * 1.5;
        z = (Math.random() - 0.5) * flatAreaSize * 1.5;
      } while (
        Math.abs(x) < safeDistance/2 && 
        Math.abs(z) < safeDistance
      );
      
      mountain.position.set(x, 0, z);
      mountain.rotation.y = Math.random() * Math.PI;
      this.scene.add(mountain);
    }
  }

  private spawnBalloons() {
    const balloonGeometry = new THREE.SphereGeometry(5, 32, 32);
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0xffff00];
    
    for (let i = 0; i < 20; i++) {
      const balloonMaterial = new THREE.MeshPhongMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        shininess: 100,
      });
      
      const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);
      balloon.position.set(
        (Math.random() - 0.5) * 1000,
        50 + Math.random() * 200,
        (Math.random() - 0.5) * 1000
      );
      
      if (this.difficulty === 'hard') {
        balloon.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          Math.sin(Math.random() * Math.PI * 2) * 0.2,
          (Math.random() - 0.5) * 0.5
        );
      }
      
      this.balloons.push(balloon);
      this.scene.add(balloon);
    }
  }

  private updateBalloons() {
    if (this.difficulty === 'hard') {
      this.balloons.forEach(balloon => {
        if (balloon.userData.velocity) {
          balloon.position.add(balloon.userData.velocity);
          
          const bounds = 500;
          if (Math.abs(balloon.position.x) > bounds) {
            balloon.userData.velocity.x *= -1;
          }
          if (Math.abs(balloon.position.y - 125) > 75) {
            balloon.userData.velocity.y *= -1;
          }
          if (Math.abs(balloon.position.z) > bounds) {
            balloon.userData.velocity.z *= -1;
          }
          
          balloon.userData.velocity.y += Math.sin(Date.now() * 0.001) * 0.01;
        }
      });
    }
  }

  private createObstacles() {
    const obstacleGeometry = new THREE.BoxGeometry(20, 20, 20);
    const obstacleMaterial = new THREE.MeshPhongMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.5,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });

    for (let i = 0; i < 8; i++) {
      const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
      
      const angle = (i / 8) * Math.PI * 2;
      const radius = 200;
      obstacle.position.set(
        Math.cos(angle) * radius,
        100 + Math.sin(angle * 2) * 50,
        Math.sin(angle) * radius
      );
      
      const wireframe = new THREE.LineSegments(
        new THREE.WireframeGeometry(obstacleGeometry),
        new THREE.LineBasicMaterial({ color: 0xffffff })
      );
      obstacle.add(wireframe);
      
      this.obstacles.push(obstacle);
      this.scene.add(obstacle);
    }
  }

  private createWeatherEffects() {
    const rainGeometry = new THREE.BufferGeometry();
    const rainVertices = [];
    for (let i = 0; i < 5000; i++) {
      rainVertices.push(
        (Math.random() - 0.5) * 1000,
        Math.random() * 500,
        (Math.random() - 0.5) * 1000
      );
    }
    rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainVertices, 3));
    
    const rainMaterial = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.2,
      transparent: true,
      opacity: 0.6,
    });

    const rain = new THREE.Points(rainGeometry, rainMaterial);
    this.raindrops.push(rain);
    this.scene.add(rain);

    const cloudGeometry = new THREE.SphereGeometry(20, 16, 16);
    const cloudMaterial = new THREE.MeshPhongMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 0.3,
    });

    for (let i = 0; i < 40; i++) {
      const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
      cloud.position.set(
        (Math.random() - 0.5) * 1000,
        200 + Math.random() * 100,
        (Math.random() - 0.5) * 1000
      );
      cloud.scale.set(1 + Math.random() * 2, 0.5, 1 + Math.random() * 2 );
      this.clouds.push(cloud);
      this.scene.add(cloud);
    }

    this.setWeatherIntensity(0.5);
  }

  private setWeatherIntensity(intensity: number) {
    this.weatherIntensity = Math.max(0, Math.min(1, intensity));
    
    this.raindrops.forEach(rain => {
      (rain.material as THREE.PointsMaterial).opacity = this.weatherIntensity * 0.6;
    });
    
    this.clouds.forEach(cloud => {
      (cloud.material as THREE.MeshPhongMaterial).opacity = 0.3 + this.weatherIntensity * 0.4;
    });

    this.scene.fog = new THREE.Fog(
      0x87CEEB,
      100,
      1000 - this.weatherIntensity * 500
    );
  }

  private updateWeather() {
    const targetIntensity = 0.3 + Math.sin(Date.now() * 0.0005) * 0.3;
    this.setWeatherIntensity(targetIntensity);

    this.raindrops.forEach(rain => {
      const positions = rain.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 5;
        if (positions[i + 1] < 0) {
          positions[i + 1] = 500;
        }
        positions[i] += Math.sin(Date.now() * 0.001 + positions[i + 2] * 0.1) * 0.2;
      }
      rain.geometry.attributes.position.needsUpdate = true;
    });

    this.clouds.forEach(cloud => {
      cloud.position.x += 0.2 * this.weatherIntensity;
      cloud.position.y += Math.sin(Date.now() * 0.001 + cloud.position.x * 0.1) * 0.1;
      if (cloud.position.x > 500) cloud.position.x = -500;
    });
  }

  private checkCollisions() {
    if (this.isGameOver) return;

    const airplaneBoundingBox = new THREE.Box3().setFromObject(this.airplane);
    const airplaneSize = new THREE.Vector3();
    airplaneBoundingBox.getSize(airplaneSize);
    
    const collisionRadius = Math.max(airplaneSize.x, airplaneSize.y, airplaneSize.z) * 1.5;

    for (const obstacle of this.obstacles) {
      const distance = this.airplane.position.distanceTo(obstacle.position);
      
      if (distance < collisionRadius + 10) {
        this.health -= 20;
        
        obstacle.material.opacity = 0.8;
        obstacle.material.emissiveIntensity = 1;
        setTimeout(() => {
          obstacle.material.opacity = 0.5;
          obstacle.material.emissiveIntensity = 0.5;
        }, 200);

        this.showWarning(`Collision! Health: ${this.health}%`);
        this.soundManager.playExplosionSound();

        if (this.health <= 0) {
          this.gameOver();
        }

        const pushDirection = this.airplane.position.clone()
          .sub(obstacle.position)
          .normalize()
          .multiplyScalar(20);
        
        this.airplane.position.add(pushDirection);
        this.speed *= 0.3;
        break;
      }
    }
  }

  public init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 5, -10);
    this.airplane.position.copy(this.initialPosition);
    this.airplane.rotation.copy(this.initialRotation);

    this.soundManager.startBackgroundMusic();
    this.animate();
  }

  public dispose() {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
    this.hudElement.remove();
    this.warningElement.remove();
    this.timerElement.remove();
    this.mobileControls?.dispose();
    this.soundManager.dispose();
    clearInterval(this.weatherUpdateInterval);
  }
}