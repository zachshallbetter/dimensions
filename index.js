import * as THREE from 'https://esm.run/three@0.160.0';
import { OrbitControls } from 'https://esm.run/three@0.160.0/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'https://esm.run/three@0.160.0/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'https://esm.run/three@0.160.0/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'https://esm.run/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass';

let scene, camera, renderer, composer, plane, controls;
let leftEye, rightEye, leftIris, rightIris, headDirection, mouse3DPosition, lastMouseMoveTime;
let mouseLight;
let isIdleBehaviorActive = true;
let idleBehaviorIntensity = 1;
let lastMouseMoveTimestamp = 0;

const config = {
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
        }
    },
    geometry: {
        colorTexture: "./assets/image.jpg",
        displacementTexture: "./assets/displacement_sockets.png",
        normalTexture: "./assets/normal.png",
        eyeTexture: "./assets/scalara_image.jpg",
        depthTexture: "./assets/depth_image.png"
    },
    scene: {
        backgroundColor: 0x000000,
        camera: {
            fov: 50,
            near: 1,
            far: 1000,
            positionZ: 10
        },
        renderer: {
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            outputEncoding: THREE.sRGBEncoding,
            alpha: true
        },
        lights: {
            ambient: { color: 0xffffff, intensity: 1 },
            directional: { color: 0xffffff, intensity: 1 }
        }
    },
    postProcessing: {
        unrealBloomPass: {
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
            strength: 0.8,
            threshold: 4,
            radius: 1
        }
    }
};

const initScene = () => {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(config.scene.backgroundColor);

    camera = new THREE.PerspectiveCamera(
        config.scene.camera.fov,
        window.innerWidth / window.innerHeight,
        config.scene.camera.near,
        config.scene.camera.far
    );
    camera.position.z = config.scene.camera.positionZ;

    renderer = new THREE.WebGLRenderer({ antialias: config.scene.renderer.antialias, alpha: config.scene.renderer.alpha });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputEncoding = THREE.sRGBEncoding;

    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(config.scene.lights.ambient.color, config.scene.lights.ambient.intensity);
    scene.add(ambientLight);

    mouseLight = new THREE.DirectionalLight(config.scene.lights.directional.color, config.scene.lights.directional.intensity);

    setupPostProcessing();
};


const setupPostProcessing = () => {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const unrealBloomPass = new UnrealBloomPass(
        config.postProcessing.unrealBloomPass.resolution,
        config.postProcessing.unrealBloomPass.strength,
        config.postProcessing.unrealBloomPass.threshold,
        config.postProcessing.unrealBloomPass.radius
    );

    composer.addPass(unrealBloomPass);
};

const loadTextures = () => {
    const textureLoader = new THREE.TextureLoader();
    const normalMap = textureLoader.load(config.geometry.normalTexture);
    const displacementMap = textureLoader.load(config.geometry.displacementTexture);
    const alphaMap = textureLoader.load(config.geometry.depthTexture);
    const eyeTexture = textureLoader.load(config.geometry.eyeTexture);
    const texture = textureLoader.load(config.geometry.colorTexture);

    return { normalMap, displacementMap, texture, alphaMap, eyeTexture };
};  

const createShaderMaterial = (textures) => {
    return new THREE.ShaderMaterial({
        uniforms: {
            colorTexture: { value: textures.texture },
            displacementMap: { value: textures.displacementMap },
            normalMap: { value: textures.normalMap },
            alphaMap: { value: textures.alphaMap },
            focalPoint: { value: new THREE.Vector3(50, 25, 0) }, // The focal point in world coordinates
            customCameraPosition: { value: camera.position }, // Custom camera position uniform to avoid conflict
            displacementScale: { value: 10.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;

            void main() {
                vUv = uv;
                vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                vPosition = modelPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D colorTexture;
            uniform vec3 focalPoint;
            uniform vec3 customCameraPosition; // Custom camera position uniform to avoid conflict
            varying vec2 vUv;
            varying vec3 vPosition;

            void main() {
                float distance = distance(vPosition, focalPoint);
                vec4 texel = texture2D(colorTexture, vUv);
                float intensity = smoothstep(0.0, 1.0, 10.0 / distance);
                gl_FragColor = vec4(texel.rgb * intensity, texel.a);
            }
        `,
        vertexColors: true,
        side: THREE.DoubleSide
    });
};

const createPlane = (textures) => {
    const geometry = new THREE.PlaneGeometry(5, 5, 2048, 2048);
    const material = new THREE.MeshStandardMaterial({
        map: textures.texture,
        normalMap: textures.normalMap,
        displacementMap: textures.displacementMap,
        displacementScale: 2,
        side: THREE.DoubleSide,
        transparent: false,
        alphaMap: textures.alphaMap,
        clipIntersection: true,
        clipShadows: true
    });

    plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    createEyes();
};

const createEyeSphere = (eyeTexture) => {
    const eyeGeometry = new THREE.SphereGeometry(config.eye.radius, 32, 32);
    const eyeMaterial = new THREE.MeshStandardMaterial({ 
        map: eyeTexture,
        color: 0xffffff,
        transparent: false,
        clipShadows: true,
        shininess: 2,
        refractionRatio: 8
    });
    return new THREE.Mesh(eyeGeometry, eyeMaterial);
};

const createIris = (irisTexture) => {
    const irisGeometry = new THREE.CircleGeometry(config.eye.iris.radius, 28);
    const irisMaterial = new THREE.MeshPhongMaterial({
        map: irisTexture,
        // shininess: 2,
        // opacity: 1,
        // transparent: false
    });

    return new THREE.Mesh(irisGeometry, irisMaterial);
};

const positionEye = (eye, offsetX, offsetY, offsetZ) => {
    eye.position.x = offsetX;
    eye.position.y = offsetY;
    eye.position.z = offsetZ;
};

const orientEye = (eye, iris) => {
    eye.lookAt(camera.position);
    iris.lookAt(camera.position);
};

const createEye = (irisTexture, position, eyeTexture) => {
    const eye = createEyeSphere(eyeTexture);
    const iris = createIris(irisTexture);

    iris.position.z = config.eye.radius + 0.001; // Position the iris slightly in front of the eye
    eye.add(iris);

    positionEye(eye, position.x, position.y, position.z + config.eye.zOffset); // Adjust eye position with zOffset
    scene.add(eye);

    return { eye, iris };
};

const createEyes = () => {
    const textureLoader = new THREE.TextureLoader();
    const irisTexture = textureLoader.load(config.eye.iris.texture);
    const eyeTexture = textureLoader.load(config.geometry.eyeTexture);

    leftEye = createEye(irisTexture, config.eye.positions.left, eyeTexture);
    rightEye = createEye(irisTexture, config.eye.positions.right, eyeTexture);

    plane.add(leftEye.eye);
    plane.add(rightEye.eye);
};

const setupControls = () => {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
};

const init = () => {
    initScene();
    const textures = loadTextures();
    createPlane(textures);
    setupControls();

    document.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('resize', onWindowResize);

    animate();
};

const distortHeadPlane = () => {
    const geometry = new THREE.PlaneBufferGeometry(1, 1, 10, 10);
    for (let i = 0; i < geometry.vertices.length; i++) {
        const vertex = geometry.vertices[i];
        vertex.z = Math.sin(vertex.x * Math.PI) * Math.sin(vertex.y * Math.PI);
    }
    geometry.computeVertexNormals(); // Ensure the lighting calculations respect the distorted geometry
    plane.geometry = geometry;
    plane.geometry.verticesNeedUpdate = true;
};

const updateLight = ( mouse3DPosition ) => {

    mouseLight.position.set(mouse3DPosition.x, mouse3DPosition.y, 1);
    
    mouseLight.castShadow = true;

    mouseLight.shadow.mapSize.width = 2048;
    mouseLight.shadow.mapSize.height = 2048;
    mouseLight.shadow.camera.near = 0.5;
    mouseLight.shadow.camera.far = 500;
    mouseLight.shadow.camera.left = -50;
    mouseLight.shadow.camera.right = 50;
    mouseLight.shadow.camera.top = 50;
    mouseLight.shadow.camera.bottom = -50;

    // Calculate intensity based on distance to the center of the viewport
    const distanceToCenter = Math.sqrt(mouse3DPosition.x * mouse3DPosition.x + mouse3DPosition.y * mouse3DPosition.y);
    const maxDistance = Math.sqrt(2); // Maximum distance from center to corner in normalized device coordinates
    mouseLight.intensity = 1 - (distanceToCenter / maxDistance); // Closer to center gives higher intensity

    scene.add(mouseLight);
}


const onMouseMove = (event) => {
    
    const currentTime = new Date();
    if (!lastMouseMoveTime || currentTime - lastMouseMoveTime > 1000 / 60) { // 60 FPS
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
    }

    if (plane) {
        updateHeadPosition(mouseX, mouseY); // Ensure the head follows the mouse movement
    }

    checkMouseAndHeadOverlap(mouseX, mouseY, distortHeadPlane); // Check for overlap between mouse and head

    // Update the last mouse move timestamp
    lastMouseMoveTimestamp = Date.now();
    isIdleBehaviorActive = false;
};

const checkMouseAndHeadOverlap = (mouseX, mouseY, callback) => {
    const headPosition = plane.getWorldPosition(new THREE.Vector3());
    const mousePosition = new THREE.Vector3(mouseX, mouseY, 0.5);
    mousePosition.unproject(camera);

    const distance = headPosition.distanceTo(mousePosition);
    const overlapThreshold = 0.1; // Define a small threshold for overlap

    if (distance < overlapThreshold) {
        console.info('Mouse and head are overlapping');
        callback();
    } else {
        // Comment out or remove this log if it's not needed
        // console.log("No overlap detected");
    }
};

document.addEventListener('mousemove', () => {
    checkMouseAndHeadOverlap();
});

const updateHeadPosition = (x, y) => {
    if (plane) {
        const vector = new THREE.Vector3(x, y, 0.5);
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
};

const limitEyeRotation = (eye, targetPosition, maxRotationHorizontal, maxRotationVerticalDown) => {
    const eyePosition = eye.getWorldPosition(new THREE.Vector3());
    let directionToTarget = new THREE.Vector3().subVectors(targetPosition, eyePosition).normalize();

    const forward = eye.parent.localToWorld(new THREE.Vector3(0, 0, 1));
    const horizontalAngle = forward.angleTo(directionToTarget);

    const down = eye.parent.localToWorld(new THREE.Vector3(0, -1, 0));
    const verticalAngleDown = down.angleTo(directionToTarget);

    if (horizontalAngle > maxRotationHorizontal) {
        // Adjust directionToTarget horizontally within maxRotationHorizontal
    }

    if (verticalAngleDown > maxRotationVerticalDown) {
        const clampedTargetPosition = clampVerticalPosition(eyePosition, targetPosition, maxRotationVerticalDown);
        directionToTarget = new THREE.Vector3().subVectors(clampedTargetPosition, eyePosition).normalize();
    }

    eye.lookAt(directionToTarget.add(eyePosition));
};

const updateEyes = (targetPosition) => {
    const maxRotation = Math.PI / 6;

    const dartingOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
    );
    const dartingTargetPosition = targetPosition.clone().add(dartingOffset);

    limitEyeRotation(leftEye.eye, dartingTargetPosition, maxRotation);
    limitEyeRotation(rightEye.eye, dartingTargetPosition, maxRotation);

    setTimeout(() => {
        limitEyeRotation(leftEye.eye, targetPosition, maxRotation);
        limitEyeRotation(rightEye.eye, targetPosition, maxRotation);
    }, 1000);
};

const idleFractleMotion = () => {
    if (plane) {
        plane.quaternion.slerp(targetQuaternion, 0.3);
    }
}

const headMotion = () => {
    if (plane && headDirection) {
        const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
            plane.getWorldDirection(new THREE.Vector3()), headDirection
        );

        plane.quaternion.slerp(targetQuaternion, 0.3);
    }
};

const randomHeadMovement = () => {
    if (plane) {
        const x = (Math.random() - 0.5) * 0.02;
        const y = (Math.random() - 0.5) * 0.02;
        const zRotation = (Math.random() - 0.5) * 0.01;
        const randomVector = new THREE.Vector3(x, y, 0.5);
        randomVector.unproject(camera);
        const newHeadDirection = randomVector.sub(plane.position).normalize();

        // Adding a slight z-axis rotation for more natural "nodding" or "tilting" effect
        const zRotationQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), zRotation);
        const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
            plane.getWorldDirection(new THREE.Vector3()),
            newHeadDirection
        ).multiply(zRotationQuaternion);

        plane.quaternion.slerp(targetQuaternion, 0.05);
    }
};

// saccade
// Simulate a saccade by moving the head in a random direction for a short duration
const saccade = () => {
    const dartingOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2, // Increased amplitude for noticeable movement
        (Math.random() - 0.5) * 0.2,
        0
    );
    const dartingTargetPosition = plane.position.clone().add(dartingOffset);

    limitEyeRotation(leftEye.eye, dartingTargetPosition, maxRotation);
    limitEyeRotation(rightEye.eye, dartingTargetPosition, maxRotation);

    setTimeout(() => {
        limitEyeRotation(leftEye.eye, plane.position, maxRotation);
        limitEyeRotation(rightEye.eye, plane.position, maxRotation);
    }, 150); // Short duration for quick saccades
};


const idleBehavior = () => {
    randomHeadMovement();
    saccade();
}

const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    // Update light position if it's dynamic
    if (mouseLight && mouse3DPosition) {
        mouseLight.position.set(mouse3DPosition.x, mouse3DPosition.y, 1);
    }
    composer.render();
    if (mouse3DPosition) {
        updateEyes(mouse3DPosition);
    }
    headMotion();
};

const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
};

init();