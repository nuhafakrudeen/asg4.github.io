var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 1)));
    v_VertPos = u_ModelMatrix * a_Position;
  }`;

var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform int u_whichTexture;
  uniform bool u_lightsOn;
  uniform vec3 u_cameraPos;
  uniform vec3 u_normalLightPos;
  uniform vec3 u_normalLightColor;
  uniform bool u_normalLightOn;
  uniform vec3 u_spotlightPos;
  uniform vec3 u_spotlightDir;
  uniform vec3 u_spotlightColor;
  uniform float u_spotlightCutoffAngle;
  uniform bool u_spotlightOn;
  void main() {
      if (u_whichTexture == -3) {
        gl_FragColor = vec4((v_Normal+1.0)/2.0, 1.0); // Use normal
      
      } else if (u_whichTexture == -2) {             // Use color
        gl_FragColor = u_FragColor;

      } else if (u_whichTexture == -1) {      // Use UV debug color
        gl_FragColor = vec4(v_UV,1.0,1.0);

      } else if (u_whichTexture == 0) {       // Use texture0
        gl_FragColor = texture2D(u_Sampler0, v_UV);
      
      } else if (u_whichTexture == 1) {       // Use texture1
        gl_FragColor = texture2D(u_Sampler1, v_UV);
      
      } else {                                // Error, put Reddish
        gl_FragColor = vec4(1,.2,.2,1);

      }


      if (u_lightsOn) {
        vec3 spotlightVector = u_spotlightPos - vec3(v_VertPos);
        float theta = dot(normalize(-u_spotlightDir), spotlightVector);
        if (u_spotlightOn) {
          // Implementing Phong spotlighting
          if (theta > u_spotlightCutoffAngle) {
            // Implementing normal Phong lighting
            float r = length(spotlightVector);
            
            // N dot L
            vec3 spotL = normalize(spotlightVector);
            vec3 spotN = normalize(v_Normal);
            float spotnDotL = max(dot(spotN, spotL), 0.0);

            // Reflection
            vec3 spotR = reflect(-spotL, spotN);

            // Eye
            vec3 spotE = normalize(u_cameraPos - vec3(v_VertPos));
            
            // Specular
            float spotSpecular = pow(max(dot(spotE, spotR), 0.0), 64.0) * 0.8;

            // Diffuse
            vec3 spotDiffuse = vec3(1.0, 1.0, 0.9) * vec3(gl_FragColor) * spotnDotL * 0.7;

            // Ambient
            vec3 spotAmbient = vec3(gl_FragColor) * 0.2;

            if (u_whichTexture == 0 || u_whichTexture == 1) {
              gl_FragColor = vec4(spotSpecular+spotDiffuse+spotAmbient * vec3(u_spotlightColor), 1.0);
            } else if (u_whichTexture == 1) {
              gl_FragColor = vec4(spotSpecular+spotDiffuse+spotAmbient * vec3(u_spotlightColor), 1.0);
            } else {
              gl_FragColor = vec4(spotDiffuse+spotAmbient * vec3(u_spotlightColor), 1.0);
            }
          }
        }
        if (u_normalLightOn) {
          // Implementing normal Phong lighting
          vec3 lightVector = u_normalLightPos - vec3(v_VertPos);
          float r = length(lightVector);

          // N dot L
          vec3 L = normalize(lightVector);
          vec3 N = normalize(v_Normal);
          float nDotL = max(dot(N, L), 0.0);

          // Reflection
          vec3 R = reflect(-L, N);

          // Eye
          vec3 E = normalize(u_cameraPos - vec3(v_VertPos));
          
          // Specular
          float specular = pow(max(dot(E, R), 0.0), 64.0) * 0.8;

          // Diffuse
          vec3 diffuse = vec3(1.0, 1.0, 0.9) * vec3(gl_FragColor) * nDotL * 0.7;

          // Ambient
          vec3 ambient = vec3(gl_FragColor) * 0.2;

          if (u_whichTexture == 0 || u_whichTexture == 1) {
            gl_FragColor = vec4(specular+diffuse+ambient * vec3(u_normalLightColor), 1.0);
          } else if (u_whichTexture == 1) {
            gl_FragColor = vec4(specular+diffuse+ambient * vec3(u_normalLightColor), 1.0);
          } else {
            gl_FragColor = vec4(diffuse+ambient * vec3(u_normalLightColor), 1.0);
          }
        }
      }
  }`


// Globals
let canvas, gl, a_Position, a_UV, a_Normal, u_FragColor, u_Size, u_ModelMatrix, u_NormalMatrix, u_ProjectionMatrix, u_ViewMatrix, u_GlobalRotateMatrix, u_Sampler0, u_Sampler1,u_Sampler2, u_whichTexture, u_lightsOn, u_cameraPos, u_normalLightOn,u_normalLightPos, u_normalLightColor, u_spotlightOn, u_spotlightPos, u_spotlightDir, u_spotlightColor, u_spotlightCutoffAngle;
let g_globalAngle = 0;
var g_startTime = performance.now() / 1000.0;
var g_seconds = performance.now() / 1000.0 - g_startTime;
var fps = 60;
var fpsDelta = 1000 / fps;
var previous = performance.now();
var start;
var g_camera = new Camera();
var g_eye = g_camera.eye.elements;
var g_at = g_camera.at.elements;
var g_up = g_camera.up.elements;
var rotateDelta = -0.2;
var g_shapesList = [];
var projMat = new Matrix4();

let g_bodyAnimation = false;
let g_bodyAnimationStartTime = 0;
let g_bodyScaleFactor = 1.0;
let g_bodyAnimationDuration = 1.0;
const g_bodyAmplitude = 0.2;



let g_RightLegAngle = 0;
let g_RightLegAnimation = false;
let g_RightPawAngle = 0;
let g_RightPawAnimation = false;

let g_LeftLegAngle = 0;
let g_LeftLegAnimation = 0;
let g_LeftPawAngle = false;
let g_LeftPawAnimation = false;

let g_armAngle = 0;
let g_armAnimation = false;

g_normalOn = false;
let g_lightsOn = true; 

let g_normalLightOn = true; 
let g_normalLightPos = [0, 1, -2];
let g_normalLightColor = [1, 1, 1];
let g_normalLightAnimationOn = true;

let g_spotlightOn = true; 
let g_spotlightPos = [0, 1, -2];
let g_spotlightDir = [0, -1, 0];
let g_spotlightColor = [1, 1, 1];
let g_spotlightCutoffAngle = Math.cos(Math.PI / 9); // 20 degree default cutoff


function setupWebGL() {
  canvas = document.getElementById('webgl');

  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
}


function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }
  
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
    return;
  }

  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
    return;
  }
  
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }
  
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log('Failed to get the storage location of u_Sampler0');
    return false;
  }
  
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if (!u_Sampler1) {
    console.log('Failed to get the storage location of u_Sampler1');
    return false;
  }
  
  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  if (!u_whichTexture) {
    console.log('Failed to get the storage location of u_whichTexture');
    return false;
  }
  
  u_lightsOn = gl.getUniformLocation(gl.program, 'u_lightsOn');
  if (!u_lightsOn) {
    console.log('Failed to get the storage location of u_lightsOn');
    return false;
  }

  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  if (!u_cameraPos) {
    console.log('Failed to get the storage location of u_cameraPos');
    return false;
  }

  u_normalLightOn = gl.getUniformLocation(gl.program, 'u_normalLightOn');
  if (!u_normalLightOn) {
    console.log('Failed to get the storage location of u_normalLightOn');
    return false;
  }

  u_normalLightPos = gl.getUniformLocation(gl.program, 'u_normalLightPos');
  if (!u_normalLightPos) {
    console.log('Failed to get the storage location of u_normalLightPos');
    return false;
  }

  u_normalLightColor = gl.getUniformLocation(gl.program, 'u_normalLightColor');
  if (!u_normalLightColor) {
    console.log('Failed to get the storage location of u_normalLightColor');
    return false;
  }

  u_spotlightOn = gl.getUniformLocation(gl.program, 'u_spotlightOn');
  if (!u_spotlightOn) {
    console.log('Failed to get the storage location of u_spotlightOn');
    return false;
  }

  u_spotlightPos = gl.getUniformLocation(gl.program, 'u_spotlightPos');
  if (!u_spotlightPos) {
    console.log('Failed to get the storage location of u_spotlightPos');
    return false;
  }

  u_spotlightDir = gl.getUniformLocation(gl.program, 'u_spotlightDir');
  if (!u_spotlightDir) {
    console.log('Failed to get the storage location of u_spotlightDir');
    return false;
  }

  u_spotlightColor = gl.getUniformLocation(gl.program, 'u_spotlightColor');
  if (!u_spotlightColor) {
    console.log('Failed to get the storage location of u_spotlightColor');
    return false;
  }

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, identityM.elements);
}


function addActionsForHTMLUI() {
  document.getElementById('animationRightLegOffButton').onclick = function () { g_RightLegAnimation = false; };
  document.getElementById('animationRightLegOnButton').onclick = function () { g_RightLegAnimation = true; };
  document.getElementById('animationRightLegPawOffButton').onclick = function () { g_RightPawAnimation = false; };
  document.getElementById('animationRightLegPawOnButton').onclick = function () { g_RightPawAnimation = true; };

  document.getElementById('animationLeftLegOnButton').onclick = function () { g_LeftPawAngle = true; };
  document.getElementById('animationLeftLegOffButton').onclick = function () { g_LeftPawAngle = false; };
  document.getElementById('animationLeftPawOffButton').onclick = function () { g_LeftPawAnimation = false; };
  document.getElementById('animationLeftPawOnButton').onclick = function () { g_LeftPawAnimation = true; };

  document.getElementById('animationArmOffButton').onclick = function () { g_armAnimation = false; };
  document.getElementById('animationArmOnButton').onclick = function () { g_armAnimation = true; };
  
  document.getElementById('RightLegSlide').addEventListener('mousemove', function () { g_RightLegAngle = this.value; renderScene(); });
  document.getElementById('LeftLegSlide').addEventListener('mousemove', function () { g_LeftLegAngle = this.value; renderScene(); });

  document.getElementById('armSlide').addEventListener('mousemove', function () { g_armAngle = this.value; renderScene(); });

  document.getElementById('angleSlide').addEventListener('mousemove', function () { g_globalAngle = this.value; renderScene(); });

  
  document.getElementById('normalOn').onclick = function () { g_normalOn = true; }
  document.getElementById('normalOff').onclick = function () { g_normalOn = false; }

  document.getElementById('lightsOn').onclick = function () { g_lightsOn = true; }
  document.getElementById('lightsOff').onclick = function () { g_lightsOn = false; }

  document.getElementById('normalLightOn').onclick = function () { g_lightsOn = true; }
  document.getElementById('normalLightOff').onclick = function () { g_lightsOn = false; }
  document.getElementById('normalLightAnimationOnButton').onclick = function () { g_normalLightAnimationOn = true; }
  document.getElementById('normalLightAnimationOffButton').onclick = function () { g_normalLightAnimationOn = false; }

  document.getElementById('spotlightOn').onclick = function () { g_spotlightOn = true; }
  document.getElementById('spotlightOff').onclick = function () { g_spotlightOn = false; }

  
  document.getElementById('normalLightPositionSlideX').addEventListener('mousemove', function () { g_normalLightPos[0] = this.value / 100; renderScene(); });
  document.getElementById('normalLightPositionSlideY').addEventListener('mousemove', function () { g_normalLightPos[1] = this.value / 100; renderScene(); });
  document.getElementById('normalLightPositionSlideZ').addEventListener('mousemove', function () { g_normalLightPos[2] = this.value / 100; renderScene(); });
  document.getElementById('normalLightColorRedSlide').addEventListener('mousemove', function () { g_normalLightColor[0] = parseFloat(this.value); renderScene(); });
  document.getElementById('normalLightColorBlueSlide').addEventListener('mousemove', function () { g_normalLightColor[1] = parseFloat(this.value); renderScene(); });
  document.getElementById('normalLightColorGreenSlide').addEventListener('mousemove', function () { g_normalLightColor[2] = parseFloat(this.value); renderScene(); });

  document.getElementById('spotlightPositionSlideX').addEventListener('mousemove', function () { g_spotlightPos[0] = this.value / 100; renderScene(); });
  document.getElementById('spotlightPositionSlideY').addEventListener('mousemove', function () { g_spotlightPos[1] = this.value / 100; renderScene(); });
  document.getElementById('spotlightPositionSlideZ').addEventListener('mousemove', function () { g_spotlightPos[2] = this.value / 100; renderScene(); });
  document.getElementById('spotlightDirectionSlideX').addEventListener('mousemove', function () { g_spotlightDir[0] = this.value / 100; renderScene(); });
  document.getElementById('spotlightDirectionSlideY').addEventListener('mousemove', function () { g_spotlightDir[1] = this.value / 100; renderScene(); });
  document.getElementById('spotlightDirectionSlideZ').addEventListener('mousemove', function () { g_spotlightDir[2] = this.value / 100; renderScene(); });
  document.getElementById('spotlightColorRedSlide').addEventListener('mousemove', function () { g_spotlightColor[0] = parseFloat(this.value); renderScene(); });
  document.getElementById('spotlightColorBlueSlide').addEventListener('mousemove', function () { g_spotlightColor[1] = parseFloat(this.value); renderScene(); });
  document.getElementById('spotlightColorGreenSlide').addEventListener('mousemove', function () { g_spotlightColor[2] = parseFloat(this.value); renderScene(); });
  document.getElementById('spotlightCutoffAngleSlide').addEventListener('mousemove', function () { g_spotlightCutoffAngle = parseFloat(Math.cos(Math.PI / 180 * this.value)); renderScene(); });
}


function initTextures(gl, n) {
  var image0 = new Image();
  if (!image0) {
    console.log('Failed to create the image0 object');
    return false;
  }
  var image1 = new Image();
  if (!image1) {
    console.log('Failed to create the image1 object');
    return false;
  }
  var image2 = new Image();
  if (!image2) {
    console.log('Failed to create the image2 object');
    return false;
  }

  image0.onload = function () {
    sendImageToTEXTURE0(image0);
    image1.onload = function () {
      sendImageToTEXTURE1(image1);
    };
    image1.src = 'brick.jpg';
  };
  image0.src = 'rocks.jpg';

  image2.onload = function(){
    sendImageToTEXTURE2(image2);
  };
  image2.src = 'pink.jpg';

  return true;
}


function sendImageToTEXTURE0(image) {
  var texture = gl.createTexture();
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }
  
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  
  gl.uniform1i(u_Sampler0, 0);

  console.log("Finished loading the texture for TEXTURE0");
}


function sendImageToTEXTURE1(image) {
  var texture = gl.createTexture();
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }
  
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  
  gl.uniform1i(u_Sampler1, 1);
  
  console.log("Finished loading the texture for TEXTURE1");
}

function sendImageToTEXTURE2(image) {
  var texture = gl.createTexture();
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }
  
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  
  gl.uniform1i(u_Sampler2, 2);
  
  console.log("Finished loading the texture for TEXTURE2");
}
function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHTMLUI();

  document.onkeydown = keydown;

  //mouse movements
  let dragging = false;
  let lastX = -1;
  let lastY = -1;
  let theta = 0;
  let phi = Math.PI / 2;

  canvas.addEventListener('mousedown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  canvas.addEventListener('mouseup', () => {
    dragging = false;
  })
  canvas.addEventListener('mousemove', (event) => {
    if (dragging) {
      const deltaX = event.clientX - lastX;
      const deltaY = event.clientY - lastY;
      theta -= deltaX * 0.005;
      phi -= deltaY * 0.005;

      g_camera.updateCamera(theta, phi);
      gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
    }
    lastX = event.clientX;
    lastY = event.clientY;
  });

  initTextures(gl, 0);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  start = previous;
  renderScene();
  requestAnimationFrame(tick);
}



function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;

  updateAnimationAngles();

  requestAnimationFrame(tick);

  var current = performance.now();
  var delta = current - previous;
  if (delta > fpsDelta) {
    previous = current - (delta % fpsDelta);

    renderScene();
  }
}


function updateAnimationAngles() {
  let RightSlider = document.getElementById('RightLegSlide');
  let LeftSlider = document.getElementById('LeftLegSlide');
  let RightPawSlider = document.getElementById('RightPawSlide');
  let LeftPawSlider = document.getElementById('LeftPawSlide');
  let armSlider = document.getElementById('armSlide');

  let RightLegBase = parseFloat(RightSlider.value);
  let LeftLegBase = parseFloat(LeftSlider.value);
  let RightPawBase = parseFloat(RightPawSlider.value);
  let LeftPawBase = parseFloat(LeftPawSlider.value);
  let armBase = parseFloat(armSlider.value);

  if (g_RightLegAnimation) {
    g_RightLegAngle = RightLegBase + 30 * Math.sin(g_seconds);
  } else {
    g_RightLegAngle = RightLegBase;
  }

  if (g_LeftPawAngle) {
    g_LeftLegAngle = LeftLegBase + 30 * Math.sin(g_seconds);
  } else {
    g_LeftLegAngle = LeftLegBase;
  }

  if (g_RightPawAnimation) {
    g_RightPawAngle = RightPawBase + 30 * Math.sin(2 * g_seconds);
  } else {
    g_RightPawAngle = RightPawBase;
  }

  if (g_LeftPawAnimation) {
    g_LeftLegAnimation = LeftPawBase + 30 * Math.sin(2 * g_seconds);
  } else {
    g_LeftLegAnimation = LeftPawBase;
  }

  if (g_armAnimation) {
    g_armAngle = armBase + 45 * Math.cos(g_seconds);
  } else {
    g_armAngle = armBase;
  }

  if (g_normalLightAnimationOn === true) {
    g_normalLightPos[0] = Math.cos(g_seconds) * 16;
    g_normalLightPos[2] = Math.cos(g_seconds) * 16;
  }
}


function keydown(ev) {
  if (ev.keyCode === 68) { 
   g_camera.right();
  } else {
    if (ev.keyCode === 65) { 
      g_camera.left();
    } else {
      if (ev.keyCode === 87) {
        g_camera.forward();
      } else {
        if (ev.keyCode === 83) { 
          g_camera.back();
        } else if (ev.keyCode === 81) { 
          g_camera.panLeft();
        } else if (ev.keyCode === 69) { 
          g_camera.panRight();
        }
      }
    }
  }

  renderScene();
}



function renderScene() {
  var startTime = performance.now();

  projMat.setIdentity();
  projMat.setPerspective(50, 1 * canvas.width / canvas.height, 1, 200);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);
  
  var viewMat = new Matrix4();
  viewMat.setLookAt(
    g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2],
    g_camera.at.elements[0], g_camera.at.elements[1], g_camera.at.elements[2],
    g_camera.up.elements[0], g_camera.up.elements[1], g_camera.up.elements[2],
  ); 
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  var cameraRotMat = new Matrix4().rotate(rotateDelta, 0, 1, 0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, cameraRotMat.elements);
  
  var normalMat = new Matrix4();
  normalMat.setInverseOf(cameraRotMat);
  normalMat.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMat.elements);

  var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.clear(gl.COLOR_BUFFER_BIT);
 
  gl.uniform1i(u_lightsOn, g_lightsOn);
  gl.uniform3f(u_cameraPos, g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2]);

  gl.uniform1i(u_normalLightOn, g_normalLightOn);
  gl.uniform3f(u_normalLightPos, g_normalLightPos[0], g_normalLightPos[1], g_normalLightPos[2]);
  gl.uniform3f(u_normalLightColor, g_normalLightColor[0], g_normalLightColor[1], g_normalLightColor[2]);

  gl.uniform1i(u_spotlightOn, g_spotlightOn);
  gl.uniform3f(u_spotlightPos, g_spotlightPos[0], g_spotlightPos[1], g_spotlightPos[2]);
  gl.uniform3f(u_spotlightDir, g_spotlightDir[0], g_spotlightDir[1], g_spotlightDir[2]);
  gl.uniform3f(u_spotlightColor, g_spotlightColor[0], g_spotlightColor[1], g_spotlightColor[2]);
  gl.uniform1f(u_spotlightCutoffAngle, g_spotlightCutoffAngle);
  
  var normalLight = new Cube();
  normalLight.color = [2, 2, 0, 1];
  if (g_normalOn === true) {
    normalLight.textureNum = -3;
  } else {
    normalLight.textureNum = -2;
  }
  normalLight.matrix.translate(g_normalLightPos[0], g_normalLightPos[1], g_normalLightPos[2]);
  normalLight.matrix.scale(-0.1, -0.1, -0.1);
  normalLight.matrix.translate(-0.5, -0.5, -0.5);
  normalLight.normalMatrix.setInverseOf(normalLight.matrix).transpose();
  normalLight.render();

  var spotlight = new Cube();
  spotlight.color = [2, 0, 0, 1];
  if (g_normalOn === true) {
    spotlight.textureNum = -3;
  } else {
    spotlight.textureNum = -2;
  }
  spotlight.matrix.translate(g_spotlightPos[0], g_spotlightPos[1], g_spotlightPos[2]);
  spotlight.matrix.scale(-0.1, -0.1, -0.1);
  spotlight.matrix.translate(-0.5, -0.5, -0.5);
  spotlight.normalMatrix.setInverseOf(spotlight.matrix).transpose();
  spotlight.render();
  
  var sphere = new Sphere();
  if (g_normalOn === true) {
    sphere.textureNum = -3;
  } else {
    sphere.textureNum = 2;
  }
  sphere.matrix.translate(-2, 0.25, 0);
  sphere.matrix.scale(0.1,0.1,0.1);
  sphere.render();

  var ground = new Cube();
  ground.color = [0, 1, 0, 1];
  if (g_normalOn === true) {
    ground.textureNum = -3;
  } else {
    ground.textureNum = 2;
  }
  ground.matrix.translate(0, -0.75, 0.0);
  ground.matrix.scale(32, 0.0001, 32);
  ground.matrix.translate(-0.5, -0.001, -0.5);
  ground.render();

  var sky = new Cube();
  sky.color = [0, 0, 1, 1];
  if (g_normalOn === true) {
    sky.textureNum = -3; 
  } else {
    sky.textureNum = 1;
  }
  sky.matrix.scale(100, 100, 100);
  sky.matrix.translate(-0.5, -0.5, -0.5);
  sky.render();

 
  var statueFoot = new Cube();
  if (g_normalOn === true) {
    statueFoot.textureNum = -3;
  } else {
    statueFoot.textureNum = 0;
  }
  statueFoot.matrix.translate(1.2, -0.65, 0);
  statueFoot.matrix.scale(.7, .7, .7);
  statueFoot.render();

  
  var body = new Cube();
  if (g_normalOn === true) {
    body.textureNum = -3;
  } else {
    body.textureNum = -2;
  }
  body.color = [0.5, 0.25, 0.1, 1];
  body.matrix.translate(-0.25, -0.3, 0.0);
  body.matrix.rotate(0, 1, 0, 0);
  body.matrix.scale(0.7 * g_bodyScaleFactor, 0.8 * g_bodyScaleFactor, 0.7 * g_bodyScaleFactor);
  body.render();

  var RightLeg = new Cube();
  if (g_normalOn === true) {
    RightLeg.textureNum = -3;
  } else {
    RightLeg.textureNum = -2;
  }
  RightLeg.color = [0.5, 0.25, 0.1, 1];
  RightLeg.matrix.setTranslate(-0.12, -0.3, 0.3);
  RightLeg.matrix.rotate(-5, 1, 0, 0);
  RightLeg.matrix.rotate(-g_RightLegAngle, 0, 0, 1);
  RightLeg.matrix.scale(0.5, -0.5, 0.5);
  var RightLegCoordinatesMat = new Matrix4(RightLeg.matrix);
  RightLeg.matrix.scale(0.55, 0.85, 0.55);
  RightLeg.matrix.translate(-0.5, 0, 0);
  RightLeg.render();

  var RightPaw = new Cube();
  if (g_normalOn === true) {
    RightPaw.textureNum = -3;
  } else {
    RightPaw.textureNum = -2;
  }
  RightPaw.color = [0.5, 0.25, 0.1, 1];
  RightPaw.matrix = RightLegCoordinatesMat;
  RightPaw.matrix.translate(0, 0.65, 0);
  RightPaw.matrix.rotate(-g_RightPawAngle, 0, 0, 1);
  RightPaw.matrix.scale(0.50, 0.55, 0.50);
  RightPaw.matrix.translate(-0.5, 0.45, -0.001);
  RightPaw.render();

  var LeftLeg = new Cube();
  if (g_normalOn === true) {
    LeftLeg.textureNum = -3;
  } else {
    LeftLeg.textureNum = -2;
  }
  LeftLeg.color = [0.5, 0.25, 0.1, 1];
  LeftLeg.matrix.setTranslate(0.25, -0.3, 0.3);
  LeftLeg.matrix.rotate(-5, 1, 0, 0);
  LeftLeg.matrix.rotate(-g_LeftLegAngle, 0, 0, 1);
  LeftLeg.matrix.scale(0.5, -0.5, 0.5);
  var LeftLegCoordinatesMat = new Matrix4(LeftLeg.matrix);
  LeftLeg.matrix.scale(0.55, 0.85, 0.55);
  LeftLeg.matrix.translate(-0.5, 0, 0);
  LeftLeg.render();

  var LeftPaw = new Cube();
  if (g_normalOn === true) {
    LeftPaw.textureNum = -3;
  } else {
    LeftPaw.textureNum = -2;
  }
  LeftPaw.color = [0.5, 0.25, 0.1, 1];
  LeftPaw.matrix = LeftLegCoordinatesMat;
  LeftPaw.matrix.translate(0, 0.65, 0);
  LeftPaw.matrix.rotate(-g_LeftLegAnimation, 0, 0, 1);
  LeftPaw.matrix.scale(0.50, 0.55, 0.50);
  LeftPaw.matrix.translate(-0.5, 0.45, -0.001);
  LeftPaw.render();

  var head = new Cube();
  if (g_normalOn === true) {
    head.textureNum = -3;
  } else {
    head.textureNum = -2;
  }
  head.color = [0.5, 0.25, 0.1, 1];
  head.matrix.translate(-0.15, 0.5, 0.15);
  head.matrix.scale(0.40, 0.30, 0.40);
  head.render();

  var leftarm = new Cube();
  if (g_normalOn === true) {
    leftarm.textureNum = -3;
  } else {
    leftarm.textureNum = -2;
  }
  leftarm.color = [0.5, 0.25, 0.1, 1];
  leftarm.matrix.translate(-0.45, -0.10, 0.35);
  leftarm.matrix.rotate(-0.75, 1, 1, 0);
  leftarm.matrix.scale(0.2, 0.5, 0.2);
  leftarm.render();

  var rightarm = new Cube();
  if (g_normalOn === true) {
    rightarm.textureNum = -3;
  } else {
    rightarm.textureNum = -2;
  }
  rightarm.color = [0.5, 0.25, 0.1, 1];
  rightarm.matrix.translate(0.45, 0.5, 0.35);
  rightarm.matrix.rotate(-0.75, 1, -1, 0);
  rightarm.matrix.rotate(-g_armAngle, 0, 0, 1);
  rightarm.matrix.scale(0.2, 0.5, 0.2);
  rightarm.render();

  var rightear = new Cube();
  if (g_normalOn === true) {
    rightear.textureNum = -3;
  } else {
    rightear.textureNum = -2;
  }
  rightear.color = [0.5, 0.25, 0.1, 1];
  rightear.matrix.translate(-0.25, 0.80, 0.35);
  rightear.matrix.rotate(-0.75, 1, 1, 0);
  rightear.matrix.scale(0.2, 0.2, 0.2);
  rightear.render();

  var leftear = new Cube();
  if (g_normalOn === true) {
    leftear.textureNum = -3;
  } else {
    leftear.textureNum = -2;
  }
  leftear.color = [0.5, 0.25, 0.1, 1];
  leftear.matrix.translate(0.15, 0.80, 0.35);
  leftear.matrix.rotate(-0.75, 1, 1, 0);
  leftear.matrix.scale(0.2, 0.2, 0.2);
  leftear.render();

  var nose = new Cube();
  if (g_normalOn === true) {
    nose.textureNum = -3;
  } else {
    nose.textureNum = -2;
  }
  nose.color = [0.5, 0.4, 0.1, 1];
  nose.matrix.translate(-0.15, 0.50, 0);
  nose.matrix.rotate(-0.75, 1, 1, 0);
  nose.matrix.scale(0.4, 0.2, 0.2);
  nose.render();

  var righteye = new Cube();
  if (g_normalOn === true) {
    righteye.textureNum = -3;
  } else {
    righteye.textureNum = -2;
  }
  righteye.color = [0, 0, 0, 1];
  righteye.matrix.translate(0.1, 0.70, 0.1);
  righteye.matrix.rotate(-0.75, 1, 1, 0);
  righteye.matrix.scale(0.1, 0.1, 0.1);
  righteye.render();

  var leftteye = new Cube();
  leftteye.color = [0, 0, 0, 1];
  if (g_normalOn === true) {
    leftteye.textureNum = -3;
  } else {
    leftteye.textureNum = -2;
  }
  leftteye.matrix.translate(-0.1, 0.70, 0.1);
  leftteye.matrix.rotate(-0.75, 1, 1, 0);
  leftteye.matrix.scale(0.1, 0.1, 0.1);
  leftteye.render();



  var duration = performance.now() - startTime;
  sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(10000 / duration), "numdot");
}


function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get: " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}