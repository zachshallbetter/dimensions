import * as THREE from 'https://esm.run/three@0.160.0';
import { OrbitControls } from 'https://esm.run/three@0.160.0/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'https://esm.run/three@0.160.0/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'https://esm.run/three@0.160.0/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'https://esm.run/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass';

// Setup global variables
let scene, camera, renderer, composer;
let ambientLight, directionalLight, underLight, mouseLight;
let controls;
let cursorLight;
let cursorMesh;

// Object references
let plane, leftEye, rightEye, leftIris, rightIris;

// Additional variables
let headDirection, mouse3DPosition, lastMouseMoveTime;
let isIdleBehaviorActive = true;
let idleBehaviorIntensity = 1;
let lastMouseMoveTimestamp = 0;
let frameId;
let lastEyeUpdateTime = 0;

// Raycaster and mouse vector for detecting clicks on orbs
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Declare glowingOrb and nonGlowingOrb as global variables
let glowingOrb, nonGlowingOrb;

// Configurations and initial settings
const config = {
    scene: {
        backgroundColor: 0x000000,
        camera: {
            fov: 50,
            near: 1,
            far: 20,
            positionZ: 9
        },
        lights: {
            ambient: { color: 0xffffff, intensity: 0.5 },
            directional: { color: 0xffffff, intensity: 0.5 },
            under: { color: 0xffffff, intensity: 0.10 },
            cursor: { color: 0xffffff, intensity: 5, distance: 100 },
            mouse: { intensity: 2 }
        },
        renderer: {
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            outputEncoding: THREE.sRGBEncoding,
            alpha: true
        }
    },
    materials: {
        eyes: {
            transparency: true,
            reflectivity: 0.9,
            refractionRatio: 0.98
        },
        cursor: {
            color: 0xffffff,
            emissive: 0xffff00
        },
        plane: {
            displacementScale: 2,
            depthWrite: true,
            side: THREE.DoubleSide,
            transparent: true,
            clipIntersection: false,
            clipShadows: true
        }
    },
    postProcessing: {
        unrealBloomPass: {
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
            strength: 1.5,
            threshold: 0.4,
            radius: 0.85
        }
    },
    eye: {
        radius: 0.333,
        zOffset: 0.99,
        positions: {
            left: { x: -0.75, y: 0.45, z: 0.235 },
            right: { x: 0.62, y: 0.45, z: 0.235 }
        },
        iris: {
            radius: 0.11,
            texture: "./assets/iris_image.png"
        },
        pupil: {
            minScale: 0.02,
            maxScale: 1
        }
    },
    geometry: {
        colorTexture: "./assets/image_sockets.jpg",
        displacementTexture: "./assets/displacement_sockets.png",
        normalTexture: "./assets/normal.png",
        scalaraTexture: "./assets/scalara_image.jpg",
        depthTexture: "./assets/depth_image.png"
    },
    orbs: {
        radius: 0.2,
        segments: 32,
        glowing: {
            color: 0xffffff,
            emissive: 0xffff00,
            scale: 0.5,
            position: { x: -50, y: -50, z: 0 }
        },
        nonGlowing: {
            color: 0xffffff,
            scale: 0.5,
            position: { x: -50, y: -150, z: 0 }
        }
    },
    controls: {
        enablePan: false,
        enableZoom: false,
        minDistance: 5,
        maxDistance: 20
    },
    bloomSettings: {
        original: {
            strength: 1.5,
            threshold: 0.4,
            radius: 0.85
        },
        enhanced: {
            strength: 2,
            threshold: 0.25,
            radius: 0.50
        }
    },
    animation: {
        eyeUpdateInterval: 624,
        headMotionSpeed: 0.5
    },
    interaction: {
        lightIntensityStep: 0.2,
        lightIntensityRange: { min: 0, max: 2 },
        lightIntensityAnimationDuration: 500
    },
    cursorMesh: {
        geometry: {
            radius: 0.06,
            widthSegments: 28,
            heightSegments: 28
        }
    },
    eyeMotion: {
        maxRotation: Math.PI / 2,
        dartingOffset: {
            x: 0.2,
            y: 0.3
        },
        dartingDuration: 1000
    },
    mouseMove: {
        updateInterval: 1000 / 60
    },
    headPosition: {
        lerpFactor: 0.1
    },
    mouseLight: {
        maxDistance: Math.sqrt(2),
        baseIntensity: 2
    }
};

// Declare a variable to track the toggle state
let isHeadClicked = false;

// Reference to the UnrealBloomPass
let unrealBloomPass;

// Define interactiveObjects array
let interactiveObjects = [];

document.addEventListener('click', function(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(interactiveObjects);

    intersects.forEach(function(intersect) {
        if (intersect.object.userData.action === 'increase') {
            directionalLight.intensity += 0.3; // Increase intensity
        } else if (intersect.object.userData.action === 'decrease') {
            directionalLight.intensity -= 0.2; // Decrease intensity
        }
    });
});

function init() {
    initScene();
    const textures = loadTextures();
    createPlane(textures);
    setupControls();
    setupPostProcessing();
    createEyes();

    // Add event listeners after all initializations
    document.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', toggleBloomSettings);
    window.addEventListener('click', onMouseClick);

    animate();
}

function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(config.scene.backgroundColor);

    camera = new THREE.PerspectiveCamera(
        config.scene.camera.fov,
        window.innerWidth / window.innerHeight,
        config.scene.camera.near,
        config.scene.camera.far
    );
    camera.position.z = config.scene.camera.positionZ;

    renderer = new THREE.WebGLRenderer(config.scene.renderer);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    setupLights();

    // Initialize cursor light
    cursorLight = new THREE.PointLight(
        config.scene.lights.cursor.color,
        config.scene.lights.cursor.intensity,
        config.scene.lights.cursor.distance
    );
    scene.add(cursorLight);

    // Initialize cursor mesh with glowing material
    let cursorGeometry = new THREE.SphereGeometry(
        config.cursorMesh.geometry.radius,
        config.cursorMesh.geometry.widthSegments,
        config.cursorMesh.geometry.heightSegments
    );
    let cursorMaterial = new THREE.MeshBasicMaterial(config.materials.cursor);
    cursorMesh = new THREE.Mesh(cursorGeometry, cursorMaterial);
    scene.add(cursorMesh);

    // Create sphere geometry for the orbs
    const orbGeometry = new THREE.SphereGeometry(config.orbs.radius, config.orbs.segments, config.orbs.segments);

    // Material for the glowing orb
    const glowingMaterial = new THREE.MeshBasicMaterial(config.orbs.glowing);

    // Material for the non-glowing orb
    const nonGlowingMaterial = new THREE.MeshBasicMaterial(config.orbs.nonGlowing);

    // Create the glowing orb mesh
    glowingOrb = new THREE.Mesh(orbGeometry, glowingMaterial);
    glowingOrb.position.set(
        -window.innerWidth / 2 + config.orbs.glowing.position.x,
        window.innerHeight / 2 + config.orbs.glowing.position.y,
        config.orbs.glowing.position.z
    );
    glowingOrb.scale.set(config.orbs.glowing.scale, config.orbs.glowing.scale, config.orbs.glowing.scale);

    // Create the non-glowing orb mesh
    nonGlowingOrb = new THREE.Mesh(orbGeometry, nonGlowingMaterial);
    nonGlowingOrb.position.set(
        -window.innerWidth / 2 + config.orbs.nonGlowing.position.x,
        window.innerHeight / 2 + config.orbs.nonGlowing.position.y,
        config.orbs.nonGlowing.position.z
    );
    nonGlowingOrb.scale.set(config.orbs.nonGlowing.scale, config.orbs.nonGlowing.scale, config.orbs.nonGlowing.scale);

    // Add orbs to the scene
    scene.add(glowingOrb);
    scene.add(nonGlowingOrb);
}

function setupLights() {
    ambientLight = new THREE.AmbientLight(config.scene.lights.ambient.color, config.scene.lights.ambient.intensity);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(config.scene.lights.directional.color, config.scene.lights.directional.intensity);
    directionalLight.position.set(0, 30, 0.5);
    scene.add(directionalLight);

    underLight = new THREE.DirectionalLight(config.scene.lights.under.color, config.scene.lights.under.intensity);
    underLight.position.set(0, 30, 0.8);
    scene.add(underLight);

    mouseLight = new THREE.DirectionalLight(config.scene.lights.directional.color, config.scene.lights.mouse.intensity);
    scene.add(mouseLight);
}

function setupControls() {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = config.controls.enablePan;
    controls.enableZoom = config.controls.enableZoom;
    controls.minDistance = config.controls.minDistance;
    controls.maxDistance = config.controls.maxDistance;
}

function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    unrealBloomPass = new UnrealBloomPass(
        config.postProcessing.unrealBloomPass.resolution,
        config.postProcessing.unrealBloomPass.strength,
        config.postProcessing.unrealBloomPass.threshold,
        config.postProcessing.unrealBloomPass.radius
    );
    composer.addPass(unrealBloomPass);
}

// Function to toggle bloom settings
function toggleBloomSettings() {
    isHeadClicked = !isHeadClicked;
    if (isHeadClicked) {
        unrealBloomPass.strength = config.bloomSettings.enhanced.strength;
        unrealBloomPass.threshold = config.bloomSettings.enhanced.threshold;
        unrealBloomPass.radius = config.bloomSettings.enhanced.radius;
    } else {
        unrealBloomPass.strength = config.bloomSettings.original.strength;
        unrealBloomPass.threshold = config.bloomSettings.original.threshold;
        unrealBloomPass.radius = config.bloomSettings.original.radius;
    }
}

function loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    const normalMap = textureLoader.load(config.geometry.normalTexture);
    const displacementMap = textureLoader.load(config.geometry.displacementTexture);
    const alphaMap = textureLoader.load(config.geometry.depthTexture);
    const scalaraTexture = textureLoader.load(config.geometry.scalaraTexture);
    const irisTexture = textureLoader.load(config.eye.iris.texture);
    const texture = textureLoader.load(config.geometry.colorTexture);

    return { normalMap, displacementMap, texture, alphaMap, scalaraTexture, irisTexture };
}

function createPlane(textures) {
    const geometry = new THREE.PlaneGeometry(5, 5, 2048, 2048);
    const material = new THREE.MeshStandardMaterial({
        map: textures.texture,
        normalMap: textures.normalMap,
        displacementMap: textures.displacementMap,
        displacementScale: config.materials.plane.displacementScale,
        depthWrite: config.materials.plane.depthWrite,
        side: config.materials.plane.side,
        transparent: config.materials.plane.transparent,
        alphaMap: textures.alphaMap,
        clipIntersection: config.materials.plane.clipIntersection,
        clipShadows: config.materials.plane.clipShadows
    });

    plane = new THREE.Mesh(geometry, material);
    scene.add(plane);
}

function createEyes() {
    const textureLoader = new THREE.TextureLoader();
    const irisTexture = textureLoader.load(config.eye.iris.texture);
    const scalaraTexture = textureLoader.load(config.geometry.scalaraTexture);
    const createEyeSphere = () => {
        const eyeGeometry = new THREE.SphereGeometry(config.eye.radius, 32, 32);
        const eyeMaterial = new THREE.MeshStandardMaterial({ 
            map: scalaraTexture,
            metalness: 0,
            roughness: 0.8,
            emissive: 0x000000
        });
        const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eye.castShadow = true;
        return eye;
    };

    const createEye = (position) => {
        const eye = createEyeSphere();
        
        const irisGeometry = new THREE.CircleGeometry(config.eye.iris.radius, 28);
        const irisMaterial = new THREE.MeshStandardMaterial({ 
            map: irisTexture,
            metalness: 0,
            roughness: 0.8,
            emissive: 0x000000
        });
        const iris = new THREE.Mesh(irisGeometry, irisMaterial);
        iris.position.z = config.eye.radius + 0.001;
        eye.add(iris);

        // Create pupil
        const pupilGeometry = new THREE.CircleGeometry(config.eye.iris.radius / 3, 28);
        const pupilMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x000000,
            metalness: 0,
            roughness: 0.8,
            emissive: 0x000000
        });
        const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        pupil.position.z = 0.001;
        iris.add(pupil);
        // Function to scale pupil (minScale to maxScale of iris size)
        const scalePupil = (scale) => {
            const clampedScale = Math.max(config.eye.pupil.minScale, Math.min(config.eye.pupil.maxScale, scale));
            pupil.scale.set(clampedScale, clampedScale, 1);
        };

        eye.position.set(position.x, position.y, position.z + config.eye.zOffset);
        plane.add(eye);
        
        return { eye, iris, pupil, scalePupil };
    };

    leftEye = createEye(config.eye.positions.left);
    rightEye = createEye(config.eye.positions.right);
}

function onMouseMove(event) {
    const currentTime = new Date();
    if (!lastMouseMoveTime || currentTime - lastMouseMoveTime > 1000 / 60) {
        lastMouseMoveTime = currentTime;
    } else {
        return;
    }

    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    const vector = new THREE.Vector3(mouseX, mouseY, 0.5);
    vector.unproject(camera);

    if (leftEye && rightEye) {
        leftEye.eye.lookAt(vector);
        rightEye.eye.lookAt(vector);
        leftEye.iris.lookAt(vector);
        rightEye.iris.lookAt(vector);

        // Calculate distance and scale pupils
        const eyePosition = new THREE.Vector3().setFromMatrixPosition(leftEye.eye.matrixWorld);
        const distance = eyePosition.distanceTo(vector);
        const maxDistance = 10; // Adjust this value based on your scene scale
        const scale = 1 - (distance / maxDistance);
        
        // Factor in light intensity
        const lightIntensity = mouseLight.intensity;
        const pupilScale = scale * (1 - lightIntensity * 0.5); // Adjust multiplier as needed
        
        leftEye.scalePupil(pupilScale);
        rightEye.scalePupil(pupilScale);
    }

    if (plane) {
        updateHeadPosition(mouseX, mouseY);
    }

    lastMouseMoveTimestamp = Date.now();
    isIdleBehaviorActive = false;

    mouse3DPosition = vector;
    updateLight(mouse3DPosition);

    // Update cursor light position to follow the mouse 3D position
    if (cursorLight) {
        cursorLight.position.set(mouse3DPosition.x, mouse3DPosition.y, mouse3DPosition.z + 1);
    }

    // Update cursor mesh position
    cursorMesh.position.set(vector.x, vector.y, vector.z);
}

function updateHeadPosition(x, y) {
    if (plane) {
        const vector = new THREE.Vector3(x, y, 0.2);
        vector.unproject(camera);

        const newHeadDirection = vector.sub(plane.position).normalize();

        if (headDirection) {
            const curve = new THREE.CubicBezierCurve3(headDirection, headDirection, newHeadDirection, newHeadDirection);
            const points = curve.getPoints(50);
            headDirection = points[points.length - 1];
        } else {
            headDirection = newHeadDirection;
        }

        const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
            plane.getWorldDirection(new THREE.Vector3()),
            headDirection
        );

        plane.quaternion.slerp(targetQuaternion, 0.1);
    }
}

function updateLight(mouse3DPosition) {
    mouseLight.position.set(mouse3DPosition.x, mouse3DPosition.y, 1);
    
    mouseLight.castShadow = true;

    const distanceToCenter = Math.sqrt(mouse3DPosition.x * mouse3DPosition.x + mouse3DPosition.y * mouse3DPosition.y);
    const maxDistance = Math.sqrt(2);
    mouseLight.intensity = 2 - (distanceToCenter / maxDistance);
}

function animate() {
    frameId = requestAnimationFrame(animate);
    controls.update();
    
    if (mouseLight && mouse3DPosition) {
        mouseLight.position.set(mouse3DPosition.x, mouse3DPosition.y, 1);
    }
    
    composer.render();
    
    if (mouse3DPosition) {
        const maxRotation = Math.PI / 1;
        updateEyes(mouse3DPosition, maxRotation);
    }
    
    headMotion();
    idleBehavior();
}

function updateEyes(targetPosition, maxRotation) {
    const limitEyeRotation = (eye, targetPosition) => {
        const eyePosition = eye.getWorldPosition(new THREE.Vector3());
        let directionToTarget = new THREE.Vector3().subVectors(targetPosition, eyePosition).normalize();
        
        const forward = eye.parent.localToWorld(new THREE.Vector3(0, 0, 1));
        const horizontalAngle = forward.angleTo(directionToTarget);
        
        if (horizontalAngle > maxRotation) {
            directionToTarget.x = Math.cos(horizontalAngle - maxRotation);
            directionToTarget.y = Math.sin(horizontalAngle - maxRotation);
        }
        
        eye.lookAt(directionToTarget.add(eyePosition));
    };

    const now = Date.now();
    if (now - lastEyeUpdateTime < 624) {
        return; // Prevent rapid repeat motion
    }
    lastEyeUpdateTime = now;

    const dartingOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.3,
    );
    const dartingTargetPosition = targetPosition.clone().add(dartingOffset);

    limitEyeRotation(leftEye.eye, dartingTargetPosition);
    limitEyeRotation(rightEye.eye, dartingTargetPosition);

    setTimeout(() => {
        limitEyeRotation(leftEye.eye, targetPosition);
        limitEyeRotation(rightEye.eye, targetPosition);
    }, 1000);
}

function headMotion(speed = 0.5) {
    if (plane && headDirection) {
        const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
            plane.getWorldDirection(new THREE.Vector3()), headDirection
        );

        plane.quaternion.slerp(targetQuaternion, speed);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);

    // Reposition orbs
    glowingOrb.position.set(-window.innerWidth / 2 + 50, window.innerHeight / 2 - 50, 0);
    nonGlowingOrb.position.set(-window.innerWidth / 2 + 50, window.innerHeight / 2 - 150, 0);
}

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects([glowingOrb, nonGlowingOrb]);

    if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object === glowingOrb) {
            adjustMouseLightIntensity(1); // Increase intensity
        } else if (object === nonGlowingOrb) {
            adjustMouseLightIntensity(-1); // Decrease intensity
        }
    }
}

function adjustMouseLightIntensity(direction) {
    const targetIntensity = Math.max(0, Math.min(2, mouseLight.intensity + (direction * 0.2)));
    const duration = 500; // Duration of the easing in milliseconds

    const startIntensity = mouseLight.intensity;
    const startTime = Date.now();

    function animateLightIntensity() {
        const elapsed = Date.now() - startTime;
        const fraction = Math.min(1, elapsed / duration);

        // Easing function (ease-out cubic)
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
        const easedFraction = easeOutCubic(fraction);

        mouseLight.intensity = startIntensity + (targetIntensity - startIntensity) * easedFraction;

        if (fraction < 1) {
            requestAnimationFrame(animateLightIntensity);
        }
    }

    requestAnimationFrame(animateLightIntensity);
}

function idleBehavior() {
    if (isIdleBehaviorActive && Date.now() - lastMouseMoveTimestamp > 3000) {
        const idleX = Math.sin(Date.now() * 0.001) * idleBehaviorIntensity;
        const idleY = Math.cos(Date.now() * 0.001) * idleBehaviorIntensity;
        updateHeadPosition(idleX, idleY);
    }
}

init();
