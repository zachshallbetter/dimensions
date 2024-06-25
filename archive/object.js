import * as THREE from 'three';

class SceneManager {
  #scene;
  #camera;
  #renderer;
  #objects = [];
  #clock;

  constructor(container) {
    this.#initialize(container);
  }

  #initialize(container) {
    this.#scene = new THREE.Scene();
    this.#camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.#renderer = new THREE.WebGLRenderer();
    this.#renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.#renderer.domElement);

    this.#camera.position.z = 5;

    this.#clock = new THREE.Clock();

    window.addEventListener('resize', () => this.#onWindowResize());
  }

  #onWindowResize = () => {
    this.#camera.aspect = window.innerWidth / window.innerHeight;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(window.innerWidth, window.innerHeight);
  }

  addObject(object) {
    this.#scene.add(object);
    this.#objects.push(object);
  }

  update = () => {
    const delta = this.#clock.getDelta();

    for (const object of this.#objects) {
      if (object.update) {
        object.update(delta);
      }
    }

    this.#renderer.render(this.#scene, this.#camera);
    requestAnimationFrame(this.update);
  }

  start() {
    this.update();
  }
}

export default SceneManager;
